"""
agents.py — Multi-agent architecture for the Bus Monitoring RAG system.

Four agents form a sequential pipeline:

  User Query
      |
  [1. QueryAgent]     — Understands intent, extracts entities, reformulates
      |                  the query for optimal retrieval
      v
  [2. RetrieverAgent] — Routes to the right data source (vector search,
      |                  MongoDB lookup, or LLM-generated aggregation)
      v
  [3. AnalysisAgent]  — Filters, ranks, and structures the raw data into
      |                  a compact context the LLM can reason over
      v
  [4. ResponseAgent]  — Generates the final grounded answer using Groq LLM

Supports the real driver-monitoring database (normalized schema):
  Collections: trips, drivers, routes, buses, violations
  violations.trip → trips._id  (ObjectId ref)
  trips.driver    → drivers._id
  trips.route     → routes._id
  trips.bus       → buses._id
"""

import json
import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from config import settings, get_mongo_client
from embedding_generator import embed_single
from generation import get_groq_client

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════
# Inter-agent message contracts
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class QueryPlan:
    """Output of QueryAgent → input of RetrieverAgent."""
    original_query: str
    reformulated_query: str         # optimised for embedding / search
    intent: str                     # lookup | aggregation | count | summary
    collection: str                 # trips | drivers | routes | buses
    driver_name: Optional[str]      # extracted driver name, if any
    days_back: Optional[int]        # temporal filter (None = all time)
    route: Optional[str]            # extracted route name, if any
    violation_type: Optional[str]   # extracted violation type, if any
    latency_ms: float = 0.0


@dataclass
class RetrievalResult:
    """Output of RetrieverAgent → input of AnalysisAgent."""
    query_plan: QueryPlan
    documents: List[Dict[str, Any]]     # enriched trip documents
    aggregation_result: Optional[str]   # JSON string if aggregation was used
    source: str                         # "vector_search" | "driver_lookup" | "aggregation"
    latency_ms: float = 0.0


@dataclass
class AnalysisResult:
    """Output of AnalysisAgent → input of ResponseAgent."""
    query_plan: QueryPlan
    retrieval: RetrievalResult
    context: str                        # formatted text block for the LLM
    doc_count: int
    latency_ms: float = 0.0


@dataclass
class FinalResponse:
    """Output of ResponseAgent → returned to user."""
    query: str
    answer: str
    intent: str
    source: str
    response_agent_name: str
    doc_count: int
    context: str
    judge_reason: Optional[str] = None
    # Per-agent timing breakdown
    query_agent_ms: float = 0.0
    retriever_agent_ms: float = 0.0
    analysis_agent_ms: float = 0.0
    response_agent_ms: float = 0.0
    total_ms: float = 0.0


# ═══════════════════════════════════════════════════════════════════════════
# Agent 1 — QueryAgent
# ═══════════════════════════════════════════════════════════════════════════

_QUERY_AGENT_SYSTEM = """You are the Query Agent for a smart bus monitoring system.
Your job is to understand a user's natural language question and produce a structured
query plan as JSON.

The database contains:
  - trips  : each trip has a start/end time, references a driver, route, and bus
  - drivers: name, avgScore (0-100, higher is safer), totalTrips
  - routes : name
  - buses  : busId, capacity
  - violations: detected by ML cameras — type, confidence (0-1), timestamp, imagePath
      types: drowsy, cellphone, cigarettes, vape, no_belt, hands_off_wheel

Return a JSON object with exactly these fields:

{
  "reformulated_query": "<rewrite the question to be precise and search-friendly>",
  "intent": "lookup" | "aggregation" | "count" | "summary",
  "collection": "trips" | "drivers" | "routes" | "buses",
  "driver_name": "<extracted driver name or null>",
  "days_back": <integer or null>,
  "route": "<extracted route name or null>",
  "violation_type": "<one of the violation types above or null>"
}

intent guide:
  lookup      — find a specific trip, driver, or fact
  aggregation — compare, rank, find most/least/highest/worst/best
  count       — how many X happened
  summary     — broad overview, trends, or all-driver performance

collection guide:
  trips   — questions about trips, violations, safety events, or when you need trip-level data
  drivers — questions about driver names, how many drivers, driver scores, listing drivers
  routes  — questions about route names, listing routes
  buses   — questions about bus IDs, capacities, listing buses

days_back: null = all time, 1 = today, 2 = yesterday, 7 = this week, 30 = this month

Return ONLY valid JSON."""


class QueryAgent:
    """
    Processes raw user input into a structured QueryPlan using the Groq LLM.
    Extracts intent, driver name, time range, violation type, and route,
    and reformulates the query for optimal retrieval.
    """

    def run(self, user_query: str) -> QueryPlan:
        t0 = time.perf_counter()
        logger.info("[QueryAgent] Processing: '%s'", user_query)

        try:
            resp = get_groq_client().chat.completions.create(
                model=settings.groq_model,
                messages=[
                    {"role": "system", "content": _QUERY_AGENT_SYSTEM},
                    {"role": "user",   "content": user_query},
                ],
                max_tokens=200,
                temperature=0,
                response_format={"type": "json_object"},
            )
            parsed = json.loads(resp.choices[0].message.content.strip())
        except Exception as exc:
            logger.warning("[QueryAgent] LLM call failed (%s), using defaults.", exc)
            parsed = {}

        plan = QueryPlan(
            original_query=user_query,
            reformulated_query=parsed.get("reformulated_query", user_query),
            intent=parsed.get("intent", "lookup"),
            collection=parsed.get("collection", "trips"),
            driver_name=parsed.get("driver_name"),
            days_back=parsed.get("days_back"),
            route=parsed.get("route"),
            violation_type=parsed.get("violation_type"),
            latency_ms=(time.perf_counter() - t0) * 1000,
        )
        logger.info(
            "[QueryAgent] Plan: intent=%s, collection=%s, driver=%s, days_back=%s, "
            "violation=%s, route=%s (%.0fms)",
            plan.intent, plan.collection, plan.driver_name, plan.days_back,
            plan.violation_type, plan.route, plan.latency_ms,
        )
        return plan


# ═══════════════════════════════════════════════════════════════════════════
# Agent 2 — RetrieverAgent
# ═══════════════════════════════════════════════════════════════════════════

# Prepended to every aggregation pipeline so the LLM-generated stages can
# reference enriched fields (driverName, driverAvgScore, routeName, violations)
# without needing to write $lookup themselves.
_ENRICH_STAGES: List[Dict] = [
    {"$lookup": {
        "from": "drivers",
        "localField": "driver",
        "foreignField": "_id",
        "as": "driverInfo",
    }},
    {"$unwind": {"path": "$driverInfo", "preserveNullAndEmptyArrays": True}},
    {"$lookup": {
        "from": "routes",
        "localField": "route",
        "foreignField": "_id",
        "as": "routeInfo",
    }},
    {"$unwind": {"path": "$routeInfo", "preserveNullAndEmptyArrays": True}},
    {"$lookup": {
        "from": "violations",
        "localField": "_id",
        "foreignField": "trip",
        "as": "violations",
    }},
    {"$addFields": {
        "driverName":     "$driverInfo.name",
        "driverAvgScore": "$driverInfo.avgScore",
        "driverId":       "$driverInfo._id",
        "routeName":      "$routeInfo.name",
        "violationCount": {"$size": "$violations"},
    }},
]

_PROJECTION = {
    "_id": 0,
    "startTime": 1,
    "endTime": 1,
    "driverName": 1,
    "driverId": 1,
    "driverAvgScore": 1,
    "routeName": 1,
    "violations": 1,
    "violationCount": 1,
}

_VS_PROJECTION = {**_PROJECTION, "score": {"$meta": "vectorSearchScore"}}

_PIPELINE_SYSTEM = """You are a MongoDB aggregation expert.

The 'trips' collection has been pre-enriched with joined data. Available fields:

  startTime (Date), endTime (Date)
  driverName (string), driverAvgScore (0-100, higher = safer), driverId
  routeName (string)
  violations: [{type, confidence (0-1), timestamp, imagePath}]
    violation types: drowsy, cellphone, cigarettes, vape, no_belt, hands_off_wheel
  violationCount (integer)

Generate a MongoDB aggregation pipeline that answers the question.
Rules:
- Return compact, aggregated results — NOT raw documents.
- Always end with {"$limit": 20} so results stay small.
- Use $unwind on violations when filtering/grouping by violation type.
- When grouping by driver, ALWAYS include driverName in the result using $first.
  Example: { "$group": { "_id": "$driverId", "driverName": { "$first": "$driverName" }, ... } }
- When ranking drivers (best/worst), use driverAvgScore and always include driverName.
- Return ONLY a JSON object: {"pipeline": [...]}"""


class RetrieverAgent:
    """
    Fetches data from MongoDB using the strategy chosen by QueryAgent.

    Routing:
      driver_name set       → find driver in drivers collection, then fetch their trips
      aggregation/count/summary → LLM-generated aggregation pipeline (pre-enriched)
      lookup                → Atlas Vector Search (semantic, top-k)
    """

    def run(self, plan: QueryPlan) -> RetrievalResult:
        t0 = time.perf_counter()
        logger.info("[RetrieverAgent] Strategy: intent=%s, collection=%s, driver=%s",
                     plan.intent, plan.collection, plan.driver_name)

        # Direct collection query only for simple lookups (list names, count entities).
        # Ranking/aggregation questions (best driver, most violations) need trip data.
        if plan.collection in ("drivers", "routes", "buses") and plan.intent in ("lookup", "count"):
            docs, agg, source = [], self._direct_collection(plan), "direct_collection"
        elif plan.driver_name:
            docs, agg, source = self._by_driver(plan), None, "driver_lookup"
        elif plan.intent in ("aggregation", "count", "summary"):
            docs, agg, source = [], self._aggregate(plan), "aggregation"
        else:
            docs, agg, source = self._vector_search(plan), None, "vector_search"

        result = RetrievalResult(
            query_plan=plan,
            documents=docs,
            aggregation_result=agg,
            source=source,
            latency_ms=(time.perf_counter() - t0) * 1000,
        )
        logger.info(
            "[RetrieverAgent] source=%s, docs=%d, agg=%s (%.0fms)",
            source, len(docs),
            "yes" if agg else "no",
            result.latency_ms,
        )
        return result

    # --- Vector Search (semantic lookup) ---
    def _vector_search(self, plan: QueryPlan) -> List[Dict]:
        query_vector = embed_single(plan.reformulated_query)
        vs_stage: Dict[str, Any] = {
            "index": settings.vector_index_name,
            "path": "embedding",
            "queryVector": query_vector,
            "numCandidates": max(settings.top_k * 10, 100),
            "limit": settings.top_k,
        }
        date_filter = self._date_filter(plan.days_back)
        if date_filter:
            vs_stage["filter"] = {"startTime": date_filter}

        pipeline = [
            {"$vectorSearch": vs_stage},
            *_ENRICH_STAGES,
            {"$project": _VS_PROJECTION},
        ]
        return self._run_pipeline(pipeline)

    # --- Direct collection query (drivers, routes, buses) ---
    def _direct_collection(self, plan: QueryPlan) -> str:
        """Query a non-trips collection directly and return all documents."""
        client = get_mongo_client()
        try:
            db = client[settings.mongodb_database]
            collection = db[plan.collection]
            docs = list(collection.find({}).limit(50))
            clean = json.loads(json.dumps(docs, default=str))
            return json.dumps(clean, indent=2)
        except Exception as exc:
            logger.error("[RetrieverAgent] Direct collection query failed: %s", exc)
            return json.dumps([{"error": str(exc)}])
        finally:
            client.close()

    # --- Driver name lookup ---
    def _by_driver(self, plan: QueryPlan) -> List[Dict]:
        client = get_mongo_client()
        try:
            db = client[settings.mongodb_database]

            # Look up the driver ObjectId by name
            driver_doc = db["drivers"].find_one(
                {"name": {"$regex": plan.driver_name, "$options": "i"}}
            )
            if not driver_doc:
                logger.warning("[RetrieverAgent] Driver not found: %s", plan.driver_name)
                return []

            match: Dict[str, Any] = {"driver": driver_doc["_id"]}
            date_filter = self._date_filter(plan.days_back)
            if date_filter:
                match["startTime"] = date_filter

            pipeline = [
                {"$match": match},
                *_ENRICH_STAGES,
                {"$sort": {"startTime": -1}},
                {"$project": _PROJECTION},
            ]
            return list(db[settings.mongodb_collection].aggregate(pipeline))
        finally:
            client.close()

    # --- LLM-generated aggregation (pre-enriched collection) ---
    def _aggregate(self, plan: QueryPlan) -> str:
        # Build the date $match in Python with a real datetime — never rely on
        # the LLM to produce a valid BSON Date comparison from a string hint.
        date_match_stage: List[Dict] = []
        if plan.days_back is not None:
            cutoff = datetime.utcnow() - timedelta(days=plan.days_back)
            date_match_stage = [{"$match": {"startTime": {"$gte": cutoff}}}]

        try:
            resp = get_groq_client().chat.completions.create(
                model=settings.groq_model,
                messages=[
                    {"role": "system", "content": _PIPELINE_SYSTEM},
                    {"role": "user",   "content": plan.reformulated_query},
                ],
                max_tokens=600,
                temperature=0,
                response_format={"type": "json_object"},
            )
            raw      = json.loads(resp.choices[0].message.content.strip())
            llm_pipe = raw.get("pipeline", [])
            # Strip any $match on startTime the LLM may have added — ours is authoritative
            llm_pipe = [s for s in llm_pipe if "$match" not in s or "startTime" not in s.get("$match", {})]
            logger.info("[RetrieverAgent] Generated pipeline with %d stages.", len(llm_pipe))
        except Exception as exc:
            logger.error("[RetrieverAgent] Pipeline generation failed: %s", exc)
            return json.dumps([{"error": str(exc)}])

        # Order: date filter → enrich with lookups → LLM aggregation stages
        full_pipeline = [*date_match_stage, *_ENRICH_STAGES, *llm_pipe]

        try:
            results = self._run_pipeline(full_pipeline, allow_disk=True)
            clean   = json.loads(json.dumps(results, default=str))
            return json.dumps(clean, indent=2)
        except Exception as exc:
            logger.error("[RetrieverAgent] Aggregation execution failed: %s", exc)
            return json.dumps([{"error": str(exc)}])

    # --- Helpers ---
    def _run_pipeline(self, pipeline: List[Dict], allow_disk: bool = False) -> List[Dict]:
        client = get_mongo_client()
        try:
            return list(
                client[settings.mongodb_database][settings.mongodb_collection]
                .aggregate(pipeline, allowDiskUse=allow_disk)
            )
        finally:
            client.close()

    @staticmethod
    def _date_filter(days_back: Optional[int]) -> Optional[Dict]:
        if days_back is None:
            return None
        return {"$gte": datetime.utcnow() - timedelta(days=days_back)}


# ═══════════════════════════════════════════════════════════════════════════
# Agent 3 — AnalysisAgent
# ═══════════════════════════════════════════════════════════════════════════

class AnalysisAgent:
    """
    Filters, ranks, and structures raw retrieval data into a compact
    context string ready for the ResponseAgent.

    - For aggregation results: passes through the compact JSON.
    - For raw documents: formats into a structured text block, filters
      by relevance (violation type, route), and trims to stay under token limits.
    """

    MAX_DOCS_FOR_CONTEXT = 25

    def run(self, retrieval: RetrievalResult) -> AnalysisResult:
        t0   = time.perf_counter()
        plan = retrieval.query_plan
        logger.info("[AnalysisAgent] Structuring context from source=%s", retrieval.source)

        if retrieval.source == "aggregation" and retrieval.aggregation_result:
            context   = f"Aggregated query results:\n{retrieval.aggregation_result}"
            doc_count = 0
        else:
            docs    = retrieval.documents
            docs    = self._filter_by_plan(docs, plan)
            docs    = docs[: self.MAX_DOCS_FOR_CONTEXT]
            context = self._format_docs(docs)
            doc_count = len(docs)

        result = AnalysisResult(
            query_plan=plan,
            retrieval=retrieval,
            context=context,
            doc_count=doc_count,
            latency_ms=(time.perf_counter() - t0) * 1000,
        )
        logger.info(
            "[AnalysisAgent] context_len=%d chars, docs=%d (%.0fms)",
            len(context), doc_count, result.latency_ms,
        )
        return result

    # --- Relevance filtering based on extracted entities ---
    def _filter_by_plan(self, docs: List[Dict], plan: QueryPlan) -> List[Dict]:
        filtered = docs

        if plan.violation_type:
            vtype = plan.violation_type.lower().replace(" ", "_")
            v_filtered = [
                d for d in filtered
                if any(v.get("type", "").lower() == vtype for v in d.get("violations", []))
            ]
            if v_filtered:
                filtered = v_filtered

        if plan.route:
            route_lower = plan.route.lower()
            r_filtered = [
                d for d in filtered
                if route_lower in (d.get("routeName") or "").lower()
            ]
            if r_filtered:
                filtered = r_filtered

        return filtered

    # --- Document formatting ---
    def _format_docs(self, docs: List[Dict]) -> str:
        if not docs:
            return "No relevant trip records found."

        parts = []
        for i, doc in enumerate(docs, 1):
            violations = doc.get("violations", [])

            # Show up to 5 violations; include type + confidence
            v_lines = [
                f"{v.get('type', '?')} "
                f"(confidence: {v.get('confidence', 0):.0%}) "
                f"at {self._ts(v.get('timestamp'))}"
                for v in violations[:5]
            ]
            v_text = ", ".join(v_lines) if v_lines else "none"
            if len(violations) > 5:
                v_text += f" ... (+{len(violations) - 5} more)"

            sim      = doc.get("score")
            sim_line = f"  Similarity   : {sim:.4f}\n" if sim is not None else ""

            avg = doc.get("driverAvgScore")
            avg_str = f"{avg:.1f}/100" if avg is not None else "N/A"

            parts.append(
                f"[Record {i}]\n"
                f"  Driver       : {doc.get('driverName', 'Unknown')} "
                f"(avg safety score: {avg_str})\n"
                f"  Route        : {doc.get('routeName', 'N/A')}\n"
                f"  Start        : {self._ts(doc.get('startTime'))}\n"
                f"  End          : {self._ts(doc.get('endTime'))}\n"
                f"  Violations   : {v_text} ({doc.get('violationCount', len(violations))} total)\n"
                f"{sim_line}"
            )
        return "\n".join(parts)

    @staticmethod
    def _ts(value) -> str:
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M")
        return str(value) if value is not None else "N/A"


# ═══════════════════════════════════════════════════════════════════════════
# Agent 4 — ResponseAgent
# ═══════════════════════════════════════════════════════════════════════════

_RESPONSE_SYSTEM_STANDARD = """You are an expert analyst for a Smart Bus Monitoring System.
Answer questions about driver behaviour, vehicle safety, and trip records using
ONLY the data provided in the context below.

Rules:
1. Base every claim on the provided data. Do NOT invent data.
2. Cite the driver name and trip start time when referring to a specific incident.
3. If the context does not contain enough information, say so clearly.
4. Structure your response as:
   - Direct Answer: one-sentence bottom line.
   - Supporting Details: bullet-point evidence from the data.
   - Explanation: 2-3 sentences interpreting the pattern or significance.
5. Use concise, professional language.
6. Violation confidence scores are 0-1 (e.g. 0.95 = 95% confidence the event occurred)."""

_RESPONSE_SYSTEM_EVIDENCE = """You are an expert analyst for a Smart Bus Monitoring System.
Answer questions about driver behaviour, vehicle safety, and trip records using
ONLY the data provided in the context below.

Rules:
1. Base every claim on the provided data. Do NOT invent data.
2. Cite the exact evidence from the context for each claim.
3. If the context does not contain enough information, say so clearly.
4. Structure your response as:
   - Direct Answer: one-sentence bottom line.
   - Evidence: bullet points with explicit citations from the context.
   - Explanation: 1-2 sentences interpreting the significance.
5. Use concise, professional language.
6. Violation confidence scores are 0-1 (e.g. 0.95 = 95% confidence the event occurred)."""

_RESPONSE_SYSTEM_CONCISE = """You are an expert analyst for a Smart Bus Monitoring System.
Answer questions about driver behaviour, vehicle safety, and trip records using
ONLY the data provided in the context below.

Rules:
1. Base every claim on the provided data. Do NOT invent data.
2. Keep the answer very concise and directly focused on the question.
3. Structure your response as:
   - Direct Answer: one sentence.
   - Key Findings: 2-3 bullet points.
   - Brief Explanation: 1-2 sentences.
4. If the context does not contain enough information, say so clearly.
5. Use professional language.
6. Violation confidence scores are 0-1 (e.g. 0.95 = 95% confidence the event occurred)."""

_RESPONSE_USER = """Context (retrieved data):
{context}

---
Question: {query}

Answer:"""


@dataclass
class AnswerCandidate:
    agent_name: str
    answer: str
    latency_ms: float


class ResponseSubAgent:
    def __init__(self, agent_name: str, system_prompt: str):
        self.agent_name = agent_name
        self.system_prompt = system_prompt

    def run(self, analysis: AnalysisResult) -> AnswerCandidate:
        t0 = time.perf_counter()
        user_msg = _RESPONSE_USER.format(
            context=analysis.context,
            query=analysis.query_plan.original_query,
        )
        answer = self._blocking(user_msg)
        return AnswerCandidate(
            agent_name=self.agent_name,
            answer=answer,
            latency_ms=(time.perf_counter() - t0) * 1000,
        )

    def _blocking(self, user_msg: str) -> str:
        try:
            resp = get_groq_client().chat.completions.create(
                model=settings.groq_model,
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user",   "content": user_msg},
                ],
                max_tokens=settings.max_tokens,
                temperature=settings.temperature,
            )
            return resp.choices[0].message.content.strip()
        except Exception as exc:
            logger.error("[%s] Groq error: %s", self.agent_name, exc)
            return f"[Generation error] {exc}"

    def stream(self, analysis: AnalysisResult) -> str:
        user_msg = _RESPONSE_USER.format(
            context=analysis.context,
            query=analysis.query_plan.original_query,
        )
        tokens = []
        print(f"\nAnswer from {self.agent_name}: ", end="", flush=True)
        try:
            stream = get_groq_client().chat.completions.create(
                model=settings.groq_model,
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user",   "content": user_msg},
                ],
                max_tokens=settings.max_tokens,
                temperature=settings.temperature,
                stream=True,
            )
            for chunk in stream:
                delta = chunk.choices[0].delta.content
                if delta:
                    print(delta, end="", flush=True)
                    tokens.append(delta)
            print()
        except Exception as exc:
            logger.error("[%s] Streaming error: %s", self.agent_name, exc)
            tokens.append(f"\n[Streaming error: {exc}]")
        return "".join(tokens)


class JudgeAgent:
    _JUDGE_SYSTEM = """You are a judge for answers generated by an AI system.
Given a question, the retrieved context, and multiple candidate answers, choose the
best candidate based on correctness, faithfulness to the context, and relevance.
Do not invent any facts that are not supported by the context.
Return ONLY valid JSON with these fields:
{
  "selected_agent": "<agent name>",
  "selected_answer": "<full answer text>",
  "reason": "<brief rationale for the selection>"
}
"""

    def choose(self, analysis: AnalysisResult, candidates: List[AnswerCandidate]) -> AnswerCandidate:
        user_content = [
            f"Question: {analysis.query_plan.original_query}",
            "Context:",
            analysis.context,
            "",
            "Candidate answers:",
        ]
        for candidate in candidates:
            user_content.append(f"- Agent: {candidate.agent_name}")
            user_content.append(candidate.answer)
            user_content.append("")
        try:
            resp = get_groq_client().chat.completions.create(
                model=settings.groq_model,
                messages=[
                    {"role": "system", "content": self._JUDGE_SYSTEM},
                    {"role": "user",   "content": "\n".join(user_content)},
                ],
                max_tokens=250,
                temperature=0,
                response_format={"type": "json_object"},
            )
            parsed = json.loads(resp.choices[0].message.content.strip())
            selected_name = parsed.get("selected_agent")
            selected_answer = parsed.get("selected_answer")
            if selected_name and selected_answer:
                match = next((c for c in candidates if c.agent_name == selected_name), None)
                if match:
                    return match
                return AnswerCandidate(selected_name, selected_answer, 0.0)
        except Exception as exc:
            logger.error("[JudgeAgent] Groq error: %s", exc)
        logger.warning("[JudgeAgent] Falling back to first candidate: %s", candidates[0].agent_name)
        return candidates[0]


class ResponseAgent:
    """
    Takes the structured context from AnalysisAgent and generates multiple
    candidate answers, then uses a judge agent to pick the best one.
    """

    def __init__(self):
        self._subagents = [
            ResponseSubAgent("StandardResponseAgent", _RESPONSE_SYSTEM_STANDARD),
            ResponseSubAgent("EvidenceResponseAgent", _RESPONSE_SYSTEM_EVIDENCE),
            ResponseSubAgent("ConciseResponseAgent", _RESPONSE_SYSTEM_CONCISE),
        ]
        self._judge_agent = JudgeAgent()

    def run(self, analysis: AnalysisResult, stream: bool = False):
        t0 = time.perf_counter()
        logger.info("[ResponseAgent] Generating candidate answers (stream=%s)", stream)

        candidates = [agent.run(analysis) for agent in self._subagents]
        chosen = self._judge_agent.choose(analysis, candidates)

        if stream:
            logger.info("[ResponseAgent] Streaming selected answer from %s", chosen.agent_name)
            answer = next(
                (agent for agent in self._subagents if agent.agent_name == chosen.agent_name),
                self._subagents[0],
            ).stream(analysis)
        else:
            answer = chosen.answer

        ms = (time.perf_counter() - t0) * 1000
        logger.info(
            "[ResponseAgent] Selected %s (%.0fms)",
            chosen.agent_name, ms,
        )
        return answer, ms, chosen.agent_name
