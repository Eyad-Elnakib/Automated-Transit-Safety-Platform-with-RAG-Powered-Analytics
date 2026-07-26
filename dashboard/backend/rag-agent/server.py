"""
server.py — FastAPI wrapper around the multi-agent RAG pipeline.

Endpoints:
  GET  /health   — liveness probe
  POST /query    — run the full 4-agent RAG pipeline and return an answer

Background thread:
  _watch_trips() — MongoDB Change Stream that auto-embeds trips as soon as
                   they are inserted or ended (active → False), so manual
                   --embed runs are never needed again.

Start with:
  python server.py
  # or
  uvicorn server:app --host 0.0.0.0 --port 8001
"""

import logging
import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config import settings, get_mongo_client
from embedding_generator import embed_trip_by_id
from rag_pipeline import ask

logger = logging.getLogger(__name__)

# ── Request / response schemas ───────────────────────────────────────────────

class QueryRequest(BaseModel):
    query: str

class QueryResponse(BaseModel):
    answer: str
    intent: str
    source: str
    doc_count: int
    total_ms: float

# ── Change Stream auto-embedder ──────────────────────────────────────────────

def _watch_trips() -> None:
    """
    Background thread: watch the trips collection and auto-generate embeddings.

    Embeds on:
    - insert  — new trip document (no embedding exists yet)
    - update  — active field flips to False  (trip just ended; violations are
                finalised so the summary is complete)

    Skips documents that already have an embedding field.
    Reconnects automatically on transient errors.
    """
    logger.info("[ChangeStream] Starting trips watcher...")

    pipeline = [
        {"$match": {"operationType": {"$in": ["insert", "update", "replace"]}}}
    ]

    while True:
        client = None
        try:
            client = get_mongo_client()
            collection = client[settings.mongodb_database][settings.mongodb_collection]

            with collection.watch(pipeline, full_document="updateLookup") as stream:
                logger.info("[ChangeStream] Watching 'trips' for inserts / end-of-trip updates.")
                for change in stream:
                    op = change["operationType"]
                    doc = change.get("fullDocument") or {}
                    trip_id = str(doc.get("_id", ""))

                    if not trip_id:
                        continue

                    # Already embedded — nothing to do
                    if doc.get("embedding"):
                        continue

                    if op == "update":
                        updated_fields = (
                            change.get("updateDescription", {}).get("updatedFields", {})
                        )
                        # Only embed when the trip is marked as ended
                        if updated_fields.get("active") is not False:
                            continue

                    logger.info(
                        "[ChangeStream] Trip %s (%s) — generating embedding...", trip_id, op
                    )
                    try:
                        embed_trip_by_id(trip_id)
                    except Exception as embed_err:
                        logger.error(
                            "[ChangeStream] Failed to embed trip %s: %s", trip_id, embed_err
                        )

        except Exception as exc:
            logger.error("[ChangeStream] Watcher error: %s — reconnecting in 5 s.", exc)
            import time
            time.sleep(5)
        finally:
            if client:
                try:
                    client.close()
                except Exception:
                    pass


# ── App lifespan — start watcher thread before first request ─────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    t = threading.Thread(target=_watch_trips, daemon=True, name="trip-watcher")
    t.start()
    logger.info("[Server] Change Stream watcher thread started.")
    yield


# ── FastAPI app ──────────────────────────────────────────────────────────────

app = FastAPI(title="Driver Monitoring RAG API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "http://localhost:5000",   # Node backend (proxy)
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/query", response_model=QueryResponse)
def query_rag(req: QueryRequest):
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="query must not be empty")
    try:
        result = ask(req.query)
        return QueryResponse(
            answer=result.answer,
            intent=result.intent,
            source=result.source,
            doc_count=result.doc_count,
            total_ms=result.total_ms,
        )
    except Exception as exc:
        logger.error("RAG pipeline error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


# ── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8001, reload=False)
