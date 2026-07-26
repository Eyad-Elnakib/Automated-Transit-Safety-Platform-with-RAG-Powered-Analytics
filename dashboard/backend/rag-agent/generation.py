"""
generation.py — LLM answer generation using the Groq API (LLaMA / Mixtral).

Takes:
  • The original user query
  • A formatted context string built from retrieved MongoDB documents

Returns a grounded, citation-backed answer string.

Design choices:
  • Temperature=0.2 keeps answers factual without being robotic.
  • The system prompt explicitly forbids hallucination and instructs the model
    to cite Trip IDs and Driver IDs from the provided context.
  • A fallback message is returned on API errors so the pipeline stays alive.
"""

import logging
from typing import Optional

from groq import Groq

from config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Groq client singleton
# ---------------------------------------------------------------------------
_client: Optional[Groq] = None


def get_groq_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=settings.groq_api_key)
        logger.info("Groq client initialised (model: %s)", settings.groq_model)
    return _client


# ---------------------------------------------------------------------------
# Prompt templates
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = """You are an expert analyst for a Smart Bus Monitoring System.
Your job is to answer questions about driver behaviour, vehicle health, and trip safety
using ONLY the trip records provided in the context below.

Rules:
1. Base every claim on evidence from the provided records. Do NOT invent data.
2. Always cite the Trip ID and Driver ID when referring to a specific incident.
3. If the context does not contain enough information to answer, say so clearly.
4. Structure your response as:
   - Direct Answer: one-sentence bottom line.
   - Supporting Details: bullet-point evidence from the records.
   - Explanation: 2–3 sentences interpreting the pattern or significance.
5. Use concise, professional language — avoid filler phrases.
"""

USER_PROMPT_TEMPLATE = """Context (retrieved trip records):
{context}

---
Question: {query}

Answer:"""


# ---------------------------------------------------------------------------
# Main generation function
# ---------------------------------------------------------------------------
def generate_answer(query: str, context: str) -> str:
    """
    Call the Groq LLM to produce a grounded answer.

    Args:
        query:   The user's natural language question.
        context: Formatted string from retrieval.format_context_for_llm().

    Returns:
        The model's text response.
    """
    user_message = USER_PROMPT_TEMPLATE.format(context=context, query=query)

    logger.info("Calling Groq API (model=%s, query='%s')", settings.groq_model, query)

    try:
        client = get_groq_client()
        response = client.chat.completions.create(
            model=settings.groq_model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            max_tokens=settings.max_tokens,
            temperature=settings.temperature,
        )
        answer = response.choices[0].message.content.strip()
        usage = response.usage
        logger.info(
            "Groq response received — prompt_tokens=%d, completion_tokens=%d",
            usage.prompt_tokens,
            usage.completion_tokens,
        )
        return answer

    except Exception as exc:
        logger.error("Groq API error: %s", exc)
        return (
            f"[Generation error] Could not produce an answer due to an API error: {exc}\n"
            "Please check your GROQ_API_KEY and network connection."
        )


# ---------------------------------------------------------------------------
# Streaming variant (optional — useful for interactive CLI)
# ---------------------------------------------------------------------------
def generate_answer_stream(query: str, context: str):
    """
    Generator that yields answer tokens one at a time.
    Usage:
        for token in generate_answer_stream(query, context):
            print(token, end="", flush=True)
    """
    user_message = USER_PROMPT_TEMPLATE.format(context=context, query=query)

    try:
        client = get_groq_client()
        stream = client.chat.completions.create(
            model=settings.groq_model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            max_tokens=settings.max_tokens,
            temperature=settings.temperature,
            stream=True,
        )
        for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta
    except Exception as exc:
        logger.error("Groq streaming error: %s", exc)
        yield f"\n[Streaming error: {exc}]"
