"""
guardrails.py
-------------
Input and output guardrails for the RAG pipeline.

All checks are rule-based (regex + keyword sets) — no LLM calls, < 1ms per check.

InputGuardrail  — runs BEFORE Gemini, on the user's raw query.
OutputGuardrail — runs AFTER Gemini, on the generated response.
"""

import logging
import re
from dataclasses import dataclass
from typing import Protocol, runtime_checkable

from app.core.prompts import GE_HOTLINE, OUTPUT_FALLBACK_DISCLAIMER, OUTPUT_SENSITIVE_DISCLAIMER

logger = logging.getLogger(__name__)


# ── GuardResult ────────────────────────────────────────────────────────────────


@dataclass
class GuardResult:
    passed: bool
    reason: str | None = None   # "pii" | "off_topic" | "injection" — internal only
    detail: str | None = None   # logged server-side, never sent to user


# ── Shared PII patterns ────────────────────────────────────────────────────────

_PII_PATTERNS: list[tuple[str, re.Pattern]] = [
    ("nric",   re.compile(r"\b[STFG]\d{7}[A-Z]\b")),
    ("card",   re.compile(r"\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b")),
    ("phone",  re.compile(r"(\+?65[\s\-]?)?[689]\d{7}\b")),
]


def _detect_pii(text: str) -> tuple[bool, str | None]:
    """Return (found, pii_type) for the first PII pattern matched."""
    for pii_type, pattern in _PII_PATTERNS:
        if pattern.search(text):
            return True, pii_type
    return False, None


# ── InputGuardrail ─────────────────────────────────────────────────────────────

# Keywords that indicate an insurance-domain query.
# Any overlap between query tokens and this set → topic is relevant.
_INSURANCE_KEYWORDS: frozenset[str] = frozenset({
    "insurance", "insure", "insured", "insurer",
    "claim", "claims", "claimant",
    "policy", "policies", "policyholder",
    "premium", "premiums",
    "coverage", "covered", "cover",
    "benefit", "benefits",
    "hospital", "hospitalisation", "hospitalization", "medical",
    "travel", "trip",
    "motor", "car", "vehicle", "accident",
    "life", "death", "deceased", "die", "died",
    "disability", "disabled", "tpd",
    "giro", "payment", "paynow", "cheque", "instalment",
    "beneficiary", "nominee", "nomination",
    "careshield", "careshield life",
    "dps", "dependants protection",
    "great eastern", "ge life",
    "payout", "payouts",
    "renewal", "renew",
    "cancel", "cancellation", "surrender",
    "lapse", "lapsed",
    "cashback", "bonus", "dividend",
    "endowment", "term", "whole life",
    "critical illness", "ci",
    "personal accident",
    "maternity",
    "deductible", "excess",
})

# Prompt injection signal phrases (lowercased).
_INJECTION_PATTERNS: tuple[str, ...] = (
    "ignore previous",
    "ignore all previous",
    "forget previous",
    "forget instructions",
    "disregard previous",
    "override instructions",
    "system prompt",
    "act as",
    "you are now",
    "pretend you are",
    "pretend to be",
    "roleplay as",
    "jailbreak",
    " dan ",         # "do anything now"
    "ignore the above",
    "new persona",
    "bypass",
)


class InputGuardrail:
    """
    Checks user input before it reaches the RAG pipeline.

    Checks (in order):
      1. PII detection  — NRIC, credit/debit card, SG phone number
      2. Prompt injection — known jailbreak / override phrases
      3. Topic relevance — zero overlap with insurance domain keywords
    """

    # Minimum query length before topic check applies.
    # Short queries ("hi", "help") are allowed through.
    _MIN_TOPIC_CHECK_LEN = 20

    def check(self, text: str, is_followup: bool = False) -> GuardResult:
        stripped = text.strip()
        lower = stripped.lower()

        # ── 1. PII ────────────────────────────────────────────────────────────
        found, pii_type = _detect_pii(stripped)
        if found:
            logger.warning("Input guardrail: PII detected (type=%s)", pii_type)
            return GuardResult(
                passed=False,
                reason="pii",
                detail=f"PII type: {pii_type}",
            )

        # ── 2. Prompt injection ───────────────────────────────────────────────
        for phrase in _INJECTION_PATTERNS:
            if phrase in lower:
                logger.warning("Input guardrail: prompt injection detected (phrase=%r)", phrase)
                return GuardResult(
                    passed=False,
                    reason="injection",
                    detail=f"Matched phrase: {phrase!r}",
                )

        # ── 3. Topic relevance ────────────────────────────────────────────────
        # Skipped for follow-up turns — the prior conversation already established
        # insurance context, so short contextual replies ("Any other requirements?")
        # should not be rejected for lacking insurance keywords.
        if not is_followup and len(stripped) >= self._MIN_TOPIC_CHECK_LEN:
            tokens = set(re.findall(r"[a-z]+", lower))
            if not tokens & _INSURANCE_KEYWORDS:
                logger.warning("Input guardrail: off-topic query (tokens=%s)", tokens)
                return GuardResult(
                    passed=False,
                    reason="off_topic",
                    detail=f"No insurance keyword overlap in: {stripped[:80]}",
                )

        return GuardResult(passed=True)


# ── OutputGuardrail ────────────────────────────────────────────────────────────

# Keywords that trigger safety disclaimer check.
_SENSITIVE_TOPICS: tuple[str, ...] = (
    "death claim",
    "death benefit",
    "deceased",
    "total permanent disability",
    "tpd",
    "critical illness",
    "terminal",
    "disability claim",
)

# GE_HOTLINE, OUTPUT_FALLBACK_DISCLAIMER, OUTPUT_SENSITIVE_DISCLAIMER
# are imported from app.core.prompts — the single source of truth for all text.


class OutputGuardrail:
    """
    Checks and sanitises Gemini's response before it reaches the user.

    Steps (in order, non-blocking — modifies content rather than raising):
      1. PII redaction    — replace any PII patterns with [REDACTED]
      2. Grounding check  — append fallback if response is suspiciously short
                            or no source chunks were retrieved
      3. Safety disclaimer — append hotline for death/disability topics
    """

    _MIN_CONTENT_LEN = 20

    def check(self, content: str, retrieved_chunks: int) -> str:
        content = self._redact_pii(content)
        content = self._check_grounding(content, retrieved_chunks)
        content = self._check_safety_disclaimer(content)
        return content

    # ── Step 1: PII redaction ──────────────────────────────────────────────────

    def _redact_pii(self, content: str) -> str:
        for _pii_type, pattern in _PII_PATTERNS:
            if pattern.search(content):
                logger.warning("Output guardrail: PII found in response, redacting (%s)", _pii_type)
                content = pattern.sub("[REDACTED]", content)
        return content

    # ── Step 2: Grounding check ────────────────────────────────────────────────

    def _check_grounding(self, content: str, retrieved_chunks: int) -> str:
        if len(content.strip()) < self._MIN_CONTENT_LEN or retrieved_chunks == 0:
            logger.warning(
                "Output guardrail: low-confidence response (len=%d, chunks=%d)",
                len(content.strip()), retrieved_chunks,
            )
            content = content.rstrip() + OUTPUT_FALLBACK_DISCLAIMER
        return content

    # ── Step 3: Safety disclaimer ──────────────────────────────────────────────

    def _check_safety_disclaimer(self, content: str) -> str:
        lower = content.lower()
        topic_hit = any(topic in lower for topic in _SENSITIVE_TOPICS)
        hotline_present = GE_HOTLINE in content
        if topic_hit and not hotline_present:
            logger.info("Output guardrail: appending safety disclaimer")
            content = content.rstrip() + OUTPUT_SENSITIVE_DISCLAIMER
        return content


# ── Protocols ──────────────────────────────────────────────────────────────────
# Structural interfaces for the guardrail layer.
# Any class with matching method signatures satisfies these — no explicit
# inheritance required. Use these as type hints in services and deps.


@runtime_checkable
class BaseInputGuardrail(Protocol):
    def check(self, text: str, is_followup: bool = False) -> GuardResult: ...


@runtime_checkable
class BaseOutputGuardrail(Protocol):
    def check(self, content: str, retrieved_chunks: int) -> str: ...
