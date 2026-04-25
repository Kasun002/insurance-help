"""
synthesize_articles.py
----------------------
Reads articles_raw.json (scraped data), uses Gemini to generate additional
articles filling coverage gaps, then merges everything into articles.json
(the final TinyDB-compatible document store).

Usage:
    python scripts/synthesize_articles.py
    python scripts/synthesize_articles.py --raw app/data/articles_raw.json --out app/data/articles.json
    python scripts/synthesize_articles.py --skip-synthesis   # merge only, no Gemini calls
"""

import argparse
import json
import os
import re
import time
from pathlib import Path

import google.generativeai as genai
from dotenv import load_dotenv

# ── Config ───────────────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).parent.parent
load_dotenv(BASE_DIR / ".env")

DEFAULT_RAW = BASE_DIR / "app/data/articles_raw.json"
DEFAULT_OUT = BASE_DIR / "app/data/articles.json"

CATEGORIES = [
    {
        "id": "claims",
        "name": "Claims",
        "icon": "📋",
        "description": "File and track insurance claims for any situation",
        "subcategories": [
            {"id": "travel", "name": "Travel"},
            {"id": "motor-accident", "name": "Motor accident"},
            {"id": "medical", "name": "Medical & hospitalisation"},
            {"id": "critical-illness", "name": "Critical illness"},
            {"id": "death", "name": "Death"},
            {"id": "disability", "name": "Disability"},
            {"id": "personal-accident", "name": "Personal accident"},
            {"id": "retrenchment", "name": "Retrenchment"},
            {"id": "terminal-illness", "name": "Terminal illness"},
            {"id": "careshield-eldershield", "name": "CareShield & ElderShield"},
            {"id": "work-injury", "name": "Work injury"},
        ],
    },
    {
        "id": "policy-management",
        "name": "Policy management",
        "icon": "📄",
        "description": "Assign, nominate, reinstate, or surrender your policies",
        "subcategories": [
            {"id": "assignment", "name": "Assignment"},
            {"id": "nomination", "name": "Nomination"},
            {"id": "reinstatement", "name": "Reinstatement"},
            {"id": "surrender", "name": "Surrender"},
            {"id": "conversion", "name": "Conversion"},
            {"id": "payout", "name": "Payout"},
        ],
    },
    {
        "id": "payment",
        "name": "Payment",
        "icon": "💳",
        "description": "Premium payment methods, GIRO, GST, and CPF",
        "subcategories": [
            {"id": "giro", "name": "GIRO"},
            {"id": "cpf", "name": "CPF"},
            {"id": "methods", "name": "Payment methods"},
            {"id": "gst", "name": "GST"},
        ],
    },
    {
        "id": "dps",
        "name": "Dependants' Protection Scheme",
        "icon": "🛡️",
        "description": "DPS policy, nominations, and claims",
        "subcategories": [
            {"id": "about", "name": "About DPS"},
            {"id": "nomination", "name": "Nomination"},
            {"id": "claims", "name": "Claims"},
        ],
    },
    {
        "id": "digital-services",
        "name": "Digital services",
        "icon": "📱",
        "description": "Great Eastern App, Great ID, and online services",
        "subcategories": [
            {"id": "great-eastern-app", "name": "Great Eastern App"},
            {"id": "great-id", "name": "Great ID"},
        ],
    },
    {
        "id": "insurance-guides",
        "name": "Insurance guides",
        "icon": "📚",
        "description": "In-depth guides on life, health, and investment-linked insurance",
        "subcategories": [
            {"id": "life-insurance", "name": "Life insurance"},
            {"id": "health-insurance", "name": "Health insurance"},
            {"id": "ilp", "name": "Investment-linked policies"},
        ],
    },
]

# Topics to synthesize when scraped data is thin
SYNTHESIS_TARGETS = [
    ("payment", "giro", "How to set up GIRO for premium payment"),
    ("payment", "giro", "How to change your GIRO bank account"),
    ("payment", "cpf", "Paying insurance premiums using CPF"),
    ("payment", "methods", "Available premium payment methods"),
    ("payment", "gst", "GST on insurance premiums"),
    ("dps", "about", "About the Dependants' Protection Scheme (DPS)"),
    ("dps", "nomination", "How to nominate a DPS beneficiary"),
    ("dps", "claims", "How to make a DPS claim"),
    ("policy-management", "assignment", "How to assign a policy"),
    ("policy-management", "nomination", "How to nominate a policy beneficiary"),
    ("policy-management", "reinstatement", "How to reinstate a lapsed policy"),
    ("policy-management", "surrender", "How to surrender a policy"),
    ("insurance-guides", "life-insurance", "Guide to life insurance in Singapore"),
    ("insurance-guides", "health-insurance", "Understanding health insurance in Singapore"),
    ("digital-services", "great-eastern-app", "Getting started with the Great Eastern app"),
]

ARTICLE_SCHEMA_EXAMPLE = {
    "slug": "how-to-set-up-giro",
    "title": "How to set up GIRO for premium payment",
    "category_id": "payment",
    "subcategory_id": "giro",
    "summary": "Step-by-step guide to setting up GIRO for automatic premium deduction from your bank account.",
    "content_markdown": "## How to set up GIRO\n\nGIRO allows you to pay your insurance premiums automatically...",
    "steps": [
        {"order": 1, "title": "Download the GIRO form", "body": "Download the GIRO application form from the Great Eastern website."},
        {"order": 2, "title": "Complete the form", "body": "Fill in your bank account details and policy number."},
        {"order": 3, "title": "Submit the form", "body": "Submit the completed form to Great Eastern via mail or walk-in."},
    ],
    "document_checklists": [],
    "attachments": [],
    "contact": {"phone": "1800 248 2888", "postal_address": None},
    "source_url": "",
    "read_time_min": 3,
    "updated_at": "2025",
    "tags": ["payment", "giro", "premium", "bank"],
}


# ── ID generation ─────────────────────────────────────────────────────────────

def make_article_id(category_id: str, subcategory_id: str, index: int) -> str:
    cat = re.sub(r"[^a-z0-9]", "_", category_id.lower())
    sub = re.sub(r"[^a-z0-9]", "_", subcategory_id.lower())
    return f"art_{cat}_{sub}_{index:03d}"


def assign_ids(articles: list[dict]) -> list[dict]:
    counter: dict[str, int] = {}
    result = []
    for art in articles:
        key = f"{art['category_id']}__{art['subcategory_id']}"
        counter[key] = counter.get(key, 0) + 1
        art = dict(art)
        art["id"] = make_article_id(art["category_id"], art["subcategory_id"], counter[key])
        result.append(art)
    return result


# ── Gemini synthesis ──────────────────────────────────────────────────────────

SYNTHESIS_SYSTEM = """You are a content writer for an insurance company help center in Singapore.
Generate accurate, helpful insurance guide articles in the style of Great Eastern Singapore.
Use formal but approachable language. Always include numbered steps where applicable.
Only include information typical of Singapore insurance — CPF, MAS regulations, Singapore addresses.
Return ONLY valid JSON. No markdown fences. No explanation."""

SYNTHESIS_PROMPT = """Generate a help center article for Great Eastern Singapore about: "{title}"
Category: {category_id} / {subcategory_id}

Return a JSON object matching this schema EXACTLY:
{schema}

Requirements:
- content_markdown must be at least 300 words with proper ## and ### headings
- steps array should have 3-5 numbered steps if the article describes a process
- summary must be 1-2 sentences (under 200 chars)
- tags should be 4-6 relevant lowercase keywords
- contact.phone should be "1800 248 2888" (Great Eastern hotline)
- source_url should be empty string ""
- updated_at should be "2025"
- read_time_min should reflect the content length (typically 3-6)
"""


def synthesize_one(
    model,
    category_id: str,
    subcategory_id: str,
    title: str,
    retries: int = 3,
) -> dict | None:
    prompt = SYNTHESIS_PROMPT.format(
        title=title,
        category_id=category_id,
        subcategory_id=subcategory_id,
        schema=json.dumps(ARTICLE_SCHEMA_EXAMPLE, indent=2),
    )

    for attempt in range(1, retries + 1):
        try:
            response = model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    temperature=0.4,
                ),
            )
            raw = response.text.strip()
            # Strip accidental markdown fences
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)
            article = json.loads(raw)
            # Enforce required fields
            article.setdefault("category_id", category_id)
            article.setdefault("subcategory_id", subcategory_id)
            article.setdefault("slug", re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-"))
            article.setdefault("steps", [])
            article.setdefault("document_checklists", [])
            article.setdefault("attachments", [])
            article.setdefault("contact", None)
            article.setdefault("source_url", "")
            article.setdefault("updated_at", "2025")
            article.setdefault("tags", [category_id, subcategory_id])
            return article
        except json.JSONDecodeError as e:
            print(f"    JSON parse error (attempt {attempt}): {e}")
        except Exception as e:
            print(f"    Gemini error (attempt {attempt}): {e}")
            if "quota" in str(e).lower() or "rate" in str(e).lower():
                time.sleep(30)
            else:
                time.sleep(5)

    return None


def synthesize_articles(
    raw_articles: list[dict],
    api_key: str,
    targets: list[tuple],
) -> list[dict]:
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.0-flash-exp", system_instruction=SYNTHESIS_SYSTEM)

    # Determine which topics are already covered by scraped data
    covered_slugs = {a["slug"] for a in raw_articles}
    synthesized = []
    for category_id, subcategory_id, title in targets:
        slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
        if slug in covered_slugs:
            print(f"  SKIP (already scraped): {title}")
            continue

        print(f"  Synthesizing: {title}")
        article = synthesize_one(model, category_id, subcategory_id, title)
        if article:
            synthesized.append(article)
            print(f"    OK — {len(article.get('content_markdown','').split())} words")
            covered_slugs.add(article["slug"])
        else:
            print(f"    FAILED — skipping")

        time.sleep(2)  # be polite to the API

    return synthesized


# ── Category article counts ───────────────────────────────────────────────────

def enrich_categories(categories: list[dict], articles: list[dict]) -> list[dict]:
    sub_counts: dict[tuple, int] = {}
    cat_counts: dict[str, int] = {}
    for a in articles:
        key = (a["category_id"], a["subcategory_id"])
        sub_counts[key] = sub_counts.get(key, 0) + 1
        cat_counts[a["category_id"]] = cat_counts.get(a["category_id"], 0) + 1

    enriched = []
    for cat in categories:
        cat = dict(cat)
        cat["article_count"] = cat_counts.get(cat["id"], 0)
        subs = []
        for sub in cat.get("subcategories", []):
            sub = dict(sub)
            sub["article_count"] = sub_counts.get((cat["id"], sub["id"]), 0)
            subs.append(sub)
        cat["subcategories"] = subs
        enriched.append(cat)
    return enriched


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Synthesize additional insurance articles via Gemini")
    parser.add_argument("--raw", default=str(DEFAULT_RAW), help="Path to articles_raw.json from scraper")
    parser.add_argument("--out", default=str(DEFAULT_OUT), help="Output articles.json path")
    parser.add_argument("--skip-synthesis", action="store_true", help="Merge only, skip Gemini calls")
    parser.add_argument("--limit", type=int, default=0, help="Max articles to synthesize (0 = all targets)")
    args = parser.parse_args()

    raw_path = Path(args.raw)
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    # Load scraped articles
    if raw_path.exists():
        raw_data = json.loads(raw_path.read_text())
        raw_articles = raw_data.get("articles", [])
        print(f"Loaded {len(raw_articles)} scraped articles from {raw_path}")
    else:
        print(f"Warning: {raw_path} not found — starting with empty scraped set")
        raw_articles = []

    # Synthesize
    synthesized = []
    if not args.skip_synthesis:
        api_key = os.getenv("GEMINI_API_KEY", "")
        if not api_key:
            print("\nWarning: GEMINI_API_KEY not set in .env — skipping synthesis.")
            print("Run with --skip-synthesis to merge only, or add key to .env and retry.\n")
        else:
            targets = SYNTHESIS_TARGETS
            if args.limit:
                targets = targets[: args.limit]
            print(f"\nSynthesizing up to {len(targets)} articles via Gemini...\n")
            synthesized = synthesize_articles(raw_articles, api_key, targets)
            print(f"\nSynthesized: {len(synthesized)} articles")
    else:
        print("Skipping synthesis (--skip-synthesis flag set)")

    # Merge: scraped first, then synthesized
    all_articles = raw_articles + synthesized
    all_articles = assign_ids(all_articles)

    categories = enrich_categories(CATEGORIES, all_articles)

    output = {"articles": all_articles, "categories": categories}
    out_path.write_text(json.dumps(output, indent=2, ensure_ascii=False))

    print(f"\n{'='*60}")
    print(f"Total articles : {len(all_articles)}")
    print(f"  Scraped      : {len(raw_articles)}")
    print(f"  Synthesized  : {len(synthesized)}")
    print(f"Categories     : {len(categories)}")
    print(f"Saved → {out_path}")

    if len(all_articles) < 40:
        print(f"\nWarning: only {len(all_articles)} articles — target is 40+.")
        print("Consider running with a Gemini API key to synthesize more articles.")


if __name__ == "__main__":
    main()
