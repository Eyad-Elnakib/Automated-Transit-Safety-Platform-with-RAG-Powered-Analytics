"""
rag_pipeline.py — Multi-agent orchestrator for the Bus Monitoring RAG system.

Runs 4 agents sequentially:

  User Query
    → [QueryAgent]     — intent, entities, query reformulation
    → [RetrieverAgent] — vector search / driver lookup / aggregation
    → [AnalysisAgent]  — filter, rank, format context
    → [ResponseAgent]  — Groq LLM answer generation

Each agent passes a typed payload to the next.
"""

import logging
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from config import settings
from agents import (
    QueryAgent,
    RetrieverAgent,
    AnalysisAgent,
    ResponseAgent,
    FinalResponse,
)

logger = logging.getLogger(__name__)

# Instantiate agents once (they are stateless singletons)
_query_agent    = QueryAgent()
_retriever_agent = RetrieverAgent()
_analysis_agent = AnalysisAgent()
_response_agent = ResponseAgent()


def ask(
    query: str,
    stream: bool = False,
) -> FinalResponse:
    """
    Run the full 4-agent pipeline for a single query.

    Args:
        query:  Natural language question.
        stream: Stream LLM tokens to stdout.

    Returns:
        FinalResponse with answer, per-agent timing, and metadata.
    """
    t0 = time.perf_counter()

    # Agent 1 — Query understanding
    query_plan = _query_agent.run(query)

    # Agent 2 — Data retrieval
    retrieval = _retriever_agent.run(query_plan)

    # Agent 3 — Analysis & context formatting
    analysis = _analysis_agent.run(retrieval)

    # Agent 4 — Response generation
    answer, response_ms, response_agent_name = _response_agent.run(analysis, stream=stream)

    total_ms = (time.perf_counter() - t0) * 1000

    result = FinalResponse(
        query=query,
        answer=answer,
        intent=query_plan.intent,
        source=retrieval.source,
        response_agent_name=response_agent_name,
        doc_count=analysis.doc_count,
        context=analysis.context,
        query_agent_ms=query_plan.latency_ms,
        retriever_agent_ms=retrieval.latency_ms,
        analysis_agent_ms=analysis.latency_ms,
        response_agent_ms=response_ms,
        total_ms=total_ms,
    )

    logger.info(
        "Pipeline complete — %.0fms total | "
        "QueryAgent=%.0fms RetrieverAgent=%.0fms "
        "AnalysisAgent=%.0fms ResponseAgent=%.0fms | "
        "intent=%s source=%s docs=%d",
        total_ms,
        query_plan.latency_ms, retrieval.latency_ms,
        analysis.latency_ms, response_ms,
        query_plan.intent, retrieval.source, analysis.doc_count,
    )
    return result


def batch_ask(queries: List[str]) -> List[FinalResponse]:
    """Run multiple queries sequentially."""
    return [ask(q) for q in queries]


if __name__ == "__main__":
    for q in [
        "Which is the most common violation?",
        "Which driver had the most drowsiness events this week?",
        "What violations does Cathy Wood often do?",
        "Which driver had the lowest safety score this week?",
    ]:
        resp = ask(q)
        print(f"\nQ: {resp.query}")
        print(f"A: {resp.answer}")
        print(
            f"   [{resp.intent} via {resp.source} / {resp.response_agent_name}, "
            f"{resp.doc_count} docs, {resp.total_ms:.0f}ms]"
        )
