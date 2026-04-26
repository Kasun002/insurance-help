"""
prompts.py
----------
Single source of truth for ALL user-facing text, LLM instructions, and
output templates used across the application.

Sections
--------
1. Contact constants         — hotline number shared across prompts and guardrails
2. LLM system prompt         — Gemini system instruction
3. RAG prompt template       — retrieval-augmented generation user prompt
4. Output guardrail messages — text appended by OutputGuardrail to responses
5. Guardrail error messages  — user-facing copy returned when a request is blocked
6. Prompt builder functions  — assemble final prompts from templates
"""

# ── 1. Contact constants ───────────────────────────────────────────────────────

GE_HOTLINE = "1800 248 2888"

# ── 2. LLM system prompt ──────────────────────────────────────────────────────

SYSTEM_PROMPT = f"""You are an AI assistant for an insurance help center.
Your role is to help customers find information about insurance claims, policies,
and services.

RULES:
1. Answer ONLY using the CONTEXT provided below.
2. If the answer is not in the context, respond: "I don't have that information \
in our knowledge base. Please contact our customer service team at {GE_HOTLINE} \
or visit our contact page."
3. Be concise. Use numbered steps for procedures. Use bold for document names.
4. At the end of your answer, list the article titles you used as sources.
5. Never invent phone numbers, URLs, amounts, or timeframes not in the context.
6. If the user asks about a specific policy amount or personal account details, \
remind them to log in to their account or contact customer service.
"""

# ── 3. RAG prompt template ────────────────────────────────────────────────────

RAG_PROMPT_TEMPLATE = """CONTEXT:
{context}

CONVERSATION HISTORY:
{history}

USER QUESTION: {query}

Provide a helpful, grounded answer based strictly on the CONTEXT above.
If the CONTEXT doesn't contain the answer, say so clearly."""

_NO_HISTORY_PLACEHOLDER = "No prior conversation."

# ── 4. Output guardrail messages ──────────────────────────────────────────────
# Appended by OutputGuardrail when confidence is low or a sensitive topic is detected.

OUTPUT_FALLBACK_DISCLAIMER = (
    "\n\n---\n"
    "If you need further help, please contact Great Eastern customer service "
    f"at {GE_HOTLINE} or visit your nearest branch."
)

OUTPUT_SENSITIVE_DISCLAIMER = (
    f"\n\nFor urgent assistance, please call {GE_HOTLINE}."
)

# ── 5. Guardrail error messages (user-facing) ─────────────────────────────────
# Returned in the API error envelope when an input guardrail blocks a request.
# Injection/unsafe messages are intentionally vague to avoid revealing detection logic.

MSG_GUARDRAIL_PII = (
    "Your message appears to contain personal information (such as an ID number, "
    "phone number, or card number). Please remove it and try again."
)

MSG_GUARDRAIL_OFF_TOPIC = (
    "This assistant only answers questions about Great Eastern insurance products "
    "and services. Please ask an insurance-related question."
)

MSG_GUARDRAIL_BLOCKED = (
    "Your request could not be processed. Please rephrase and try again."
)

# ── 6. Prompt builder functions ───────────────────────────────────────────────


def build_rag_prompt(context: str, history: str, query: str) -> str:
    return RAG_PROMPT_TEMPLATE.format(
        context=context,
        history=history or _NO_HISTORY_PLACEHOLDER,
        query=query,
    )


def format_history(messages: list[dict]) -> str:
    """Convert a list of {role, content} dicts to a readable history string."""
    if not messages:
        return ""
    lines = []
    for msg in messages:
        role = "User" if msg.get("role") == "user" else "Assistant"
        lines.append(f"{role}: {msg.get('content', '')}")
    return "\n".join(lines)
