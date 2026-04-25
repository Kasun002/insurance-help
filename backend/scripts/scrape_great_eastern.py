"""
scrape_great_eastern.py
-----------------------
Scrapes Great Eastern Singapore self-service guide pages listed in target_urls.txt.
Outputs: backend/app/data/articles_raw.json

Usage:
    python scripts/scrape_great_eastern.py
    python scripts/scrape_great_eastern.py --urls target_urls.txt --out app/data/articles_raw.json
    python scripts/scrape_great_eastern.py --dry-run   # parse only, no HTTP (loads cached HTML)
"""

import argparse
import json
import re
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup

# ── Constants ────────────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).parent.parent
DEFAULT_URLS_FILE = BASE_DIR / "target_urls.txt"
DEFAULT_OUTPUT = BASE_DIR / "app/data/articles_raw.json"
DELAY_SECONDS = 2

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
}

# Category + subcategory derived from URL path segments
CATEGORY_MAP = {
    "claims": {"id": "claims", "name": "Claims", "icon": "📋"},
    "policy-management": {"id": "policy-management", "name": "Policy management", "icon": "📄"},
    "payment": {"id": "payment", "name": "Payment", "icon": "💳"},
    "dps": {"id": "dps", "name": "Dependants' Protection Scheme", "icon": "🛡️"},
    "digital-services": {"id": "digital-services", "name": "Digital services", "icon": "📱"},
    "insurance-guides": {"id": "insurance-guides", "name": "Insurance guides", "icon": "📚"},
    "careshield-eldershield": {"id": "careshield-eldershield", "name": "CareShield and ElderShield", "icon": "🏥"},
    "hps": {"id": "hps", "name": "Home Protection Scheme", "icon": "🏠"},
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def load_urls(path: Path) -> list[str]:
    urls = []
    for line in path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            urls.append(line)
    return urls


def url_to_ids(url: str) -> tuple[str, str, str]:
    """Extract (category_id, subcategory_id, slug) from a GE URL path."""
    # e.g. /sg/en/customer-services/claims/travel/make-a-travel-claim.html
    parts = url.rstrip("/").replace(".html", "").split("/")
    # find 'customer-services' anchor
    try:
        idx = parts.index("customer-services")
        segments = parts[idx + 1:]
    except ValueError:
        segments = parts[-3:]

    category_id = segments[0] if len(segments) > 0 else "general"
    subcategory_id = segments[1] if len(segments) > 1 else "general"
    slug = segments[-1] if len(segments) > 0 else "article"
    return category_id, subcategory_id, slug


def html_to_markdown(element) -> str:
    """Convert a BeautifulSoup element's content to simple Markdown."""
    if element is None:
        return ""
    lines = []
    for child in element.children:
        if hasattr(child, "name"):
            tag = child.name
            text = child.get_text(" ", strip=True)
            if not text:
                continue
            if tag in ("h1", "h2"):
                lines.append(f"\n## {text}\n")
            elif tag in ("h3", "h4"):
                lines.append(f"\n### {text}\n")
            elif tag in ("h5", "h6"):
                lines.append(f"\n#### {text}\n")
            elif tag == "p":
                lines.append(f"{text}\n")
            elif tag in ("ul", "ol"):
                for li in child.find_all("li", recursive=False):
                    lines.append(f"- {li.get_text(' ', strip=True)}")
                lines.append("")
            elif tag in ("strong", "b"):
                lines.append(f"**{text}**")
            elif tag == "a":
                href = child.get("href", "")
                lines.append(f"[{text}]({href})" if href else text)
            elif tag in ("div", "section", "article"):
                lines.append(html_to_markdown(child))
            else:
                lines.append(text)
        else:
            t = str(child).strip()
            if t:
                lines.append(t)
    return "\n".join(lines).strip()


def extract_steps(soup: BeautifulSoup) -> list[dict]:
    """Extract numbered steps from ordered lists."""
    steps = []
    order = 1
    for ol in soup.find_all("ol"):
        for li in ol.find_all("li", recursive=False):
            title_el = li.find(["strong", "b", "h4", "h5"])
            title = title_el.get_text(strip=True) if title_el else li.get_text(" ", strip=True)[:80]
            body = li.get_text(" ", strip=True)
            steps.append({"order": order, "title": title, "body": body})
            order += 1
    return steps


def extract_checklists(soup: BeautifulSoup) -> list[dict]:
    """
    Extract document checklists: groups of <ul> preceded by a bold/heading scenario label.
    """
    checklists = []
    # Look for headings / bold text followed by a <ul>
    for heading in soup.find_all(["h3", "h4", "h5", "strong", "b"]):
        scenario = heading.get_text(strip=True)
        if not scenario or len(scenario) > 120:
            continue
        sibling = heading.find_next_sibling()
        while sibling and sibling.name not in ("ul", "ol", "h2", "h3", "h4"):
            sibling = sibling.find_next_sibling()
        if sibling and sibling.name in ("ul", "ol"):
            docs = [li.get_text(" ", strip=True) for li in sibling.find_all("li")]
            if docs:
                checklists.append({"scenario": scenario, "documents": docs})
    return checklists


def extract_attachments(soup: BeautifulSoup) -> list[dict]:
    """Extract PDF download links."""
    attachments = []
    for a in soup.find_all("a", href=True):
        href = str(a["href"])
        if href.lower().endswith(".pdf"):  # noqa: SIM102
            label = a.get_text(strip=True) or Path(href).stem.replace("-", " ").title()
            full_url = href if href.startswith("http") else f"https://www.greateasternlife.com{href}"
            attachments.append({"type": "pdf", "label": label, "url": full_url})
    return attachments


def extract_contact(soup: BeautifulSoup) -> dict | None:
    """Extract phone and postal address if present."""
    text = soup.get_text(" ", strip=True)
    phone_match = re.search(r"\+?65[\s-]?\d{4}[\s-]?\d{4}", text)
    phone = phone_match.group(0).strip() if phone_match else None

    address = None
    addr_match = re.search(
        r"(Great Eastern[^,]{0,40},\s*\d[^,]{0,60},\s*(?:Singapore|SG)\s*\d{6})",
        text,
        re.IGNORECASE,
    )
    if addr_match:
        address = addr_match.group(0).strip()

    if phone or address:
        return {"phone": phone, "postal_address": address}
    return None


def extract_updated_date(soup: BeautifulSoup) -> str:
    """Try to find a last-updated date on the page."""
    text = soup.get_text(" ", strip=True)
    match = re.search(r"(?:Updated?|Last updated?|Effective)[:\s]+(\w+ \d{4}|\d{1,2} \w+ \d{4})", text, re.IGNORECASE)
    return match.group(1).strip() if match else ""


def extract_tags(category_id: str, subcategory_id: str, title: str) -> list[str]:
    tags = [category_id, subcategory_id]
    # Add keywords from title
    stop = {"a", "an", "the", "to", "for", "of", "and", "or", "in", "on", "at", "how", "make"}
    for word in re.findall(r"[a-z]+", title.lower()):
        if word not in stop and len(word) > 3:
            tags.append(word)
    return list(dict.fromkeys(tags))  # dedupe, preserve order


def infer_read_time(content: str) -> int:
    words = len(content.split())
    return max(1, round(words / 200))


def find_main_content(soup: BeautifulSoup):
    """Try several selectors to locate the article body."""
    for selector in [
        "main",
        "article",
        '[class*="content"]',
        '[class*="article"]',
        '[class*="guide"]',
        '[role="main"]',
        "section",
        ".container",
        "#content",
    ]:
        el = soup.select_one(selector)
        if el and len(el.get_text(strip=True)) > 200:
            return el
    return soup.body


# ── Core scrape function ──────────────────────────────────────────────────────

def scrape_url(url: str, session: requests.Session) -> dict | None:
    print(f"  Fetching: {url}")
    try:
        resp = session.get(url, timeout=15, headers=HEADERS)
        if resp.status_code != 200:
            print(f"    !! HTTP {resp.status_code} — skipping")
            return None
    except Exception as e:
        print(f"    !! Request failed: {e} — skipping")
        return None

    soup = BeautifulSoup(resp.text, "html.parser")

    # Remove nav, footer, script, style noise
    for tag in soup(["nav", "footer", "script", "style", "header", "aside", ".breadcrumb"]):
        tag.decompose()

    category_id, subcategory_id, slug = url_to_ids(url)

    # Title
    title_el = soup.find("h1") or soup.find("title")
    title = title_el.get_text(strip=True) if title_el else slug.replace("-", " ").title()
    # Clean " | Great Eastern" suffix
    title = re.sub(r"\s*[|–-]\s*Great Eastern.*$", "", title).strip()

    main = find_main_content(soup)
    content_md = html_to_markdown(main)

    article = {
        "slug": slug,
        "title": title,
        "category_id": category_id,
        "subcategory_id": subcategory_id,
        "summary": "",  # filled below
        "content_markdown": content_md,
        "steps": extract_steps(main) if main else [],
        "document_checklists": extract_checklists(main) if main else [],
        "attachments": extract_attachments(soup),
        "contact": extract_contact(soup),
        "source_url": url,
        "read_time_min": infer_read_time(content_md),
        "updated_at": extract_updated_date(soup),
        "tags": extract_tags(category_id, subcategory_id, title),
    }

    # Auto-summary: first non-empty paragraph under 300 chars
    for para in (main or soup).find_all("p"):
        text = para.get_text(strip=True)
        if 40 < len(text) < 400:
            article["summary"] = text
            break
    if not article["summary"] and content_md:
        first_lines = [l.strip() for l in content_md.split("\n") if l.strip() and not l.startswith("#")]
        article["summary"] = first_lines[0][:300] if first_lines else title

    return article


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Scrape Great Eastern self-service guides")
    parser.add_argument("--urls", default=str(DEFAULT_URLS_FILE), help="Path to target_urls.txt")
    parser.add_argument("--out", default=str(DEFAULT_OUTPUT), help="Output JSON path")
    parser.add_argument("--limit", type=int, default=0, help="Max URLs to scrape (0 = all)")
    args = parser.parse_args()

    urls_path = Path(args.urls)
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    urls = load_urls(urls_path)
    if args.limit:
        urls = urls[: args.limit]

    print(f"Scraping {len(urls)} URLs → {out_path}\n")

    session = requests.Session()
    articles = []
    failed = []

    for i, url in enumerate(urls, 1):
        print(f"[{i}/{len(urls)}]")
        article = scrape_url(url, session)
        if article:
            articles.append(article)
            print(f"    OK — '{article['title']}' ({len(article['content_markdown'])} chars)")
        else:
            failed.append(url)

        if i < len(urls):
            time.sleep(DELAY_SECONDS)

    print(f"\n{'='*60}")
    print(f"Scraped:  {len(articles)} articles")
    print(f"Failed:   {len(failed)} URLs")
    if failed:
        print("Failed URLs:")
        for u in failed:
            print(f"  - {u}")

    out_path.write_text(json.dumps({"articles": articles, "failed_urls": failed}, indent=2, ensure_ascii=False))
    print(f"\nSaved → {out_path}")


if __name__ == "__main__":
    main()
