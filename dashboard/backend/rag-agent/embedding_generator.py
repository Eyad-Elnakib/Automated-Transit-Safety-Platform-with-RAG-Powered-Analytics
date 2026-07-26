"""
embedding_generator.py — Generates sentence embeddings and stores them in MongoDB.

For the real driver-monitoring database the trips collection holds ObjectId
references to drivers, routes, buses, and violations live in a separate
collection.  We use a $lookup aggregation pipeline to join everything,
build a natural-language trip summary, then store the embedding (and summary)
back on the trips document.

Uses `sentence-transformers/all-MiniLM-L6-v2` (384-dim, CPU-friendly).
"""

import logging
from typing import Dict, List

from pymongo import UpdateOne
from sentence_transformers import SentenceTransformer
from tqdm import tqdm

from config import settings, get_mongo_client

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Model singleton — loaded once per process
# ---------------------------------------------------------------------------
DEVICE = "cpu"

_model: SentenceTransformer | None = None


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        logger.info("Loading embedding model: %s on %s", settings.embedding_model, DEVICE)
        _model = SentenceTransformer(settings.embedding_model, device=DEVICE)
        logger.info("Embedding model loaded (dim=%d)", settings.embedding_dim)
    return _model


# ---------------------------------------------------------------------------
# Core helpers
# ---------------------------------------------------------------------------
def embed_texts(texts: List[str]) -> List[List[float]]:
    """Return a list of embedding vectors (Python lists, not numpy arrays)."""
    model = get_model()
    vectors = model.encode(
        texts,
        batch_size=32,
        normalize_embeddings=True,
        show_progress_bar=False,
        device=DEVICE,
    )
    return vectors.tolist()


def embed_single(text: str) -> List[float]:
    return embed_texts([text])[0]


# ---------------------------------------------------------------------------
# Build a natural-language trip summary from a joined document
# ---------------------------------------------------------------------------
def _build_trip_summary(doc: Dict) -> str:
    """
    Produce a searchable text summary from a trip document that has been
    enriched with $lookup stages (driverName, routeName, violations array).
    """
    violations = doc.get("violations", [])
    v_types = list({v.get("type", "") for v in violations if v.get("type")})
    v_summary = ", ".join(v_types) if v_types else "no violations"

    start = doc.get("startTime")
    start_str = (
        start.strftime("%Y-%m-%d %H:%M") if hasattr(start, "strftime") else str(start or "unknown")
    )

    driver_name = doc.get("driverName") or "Unknown Driver"
    route_name  = doc.get("routeName")  or "Unknown Route"
    avg_score   = doc.get("driverAvgScore")
    score_str   = f", driver average safety score {avg_score:.1f}" if avg_score is not None else ""

    return (
        f"Driver {driver_name}{score_str} on route {route_name}. "
        f"Trip started {start_str}. "
        f"Violations detected: {v_summary}. "
        f"Total violations in this trip: {len(violations)}."
    )


# ---------------------------------------------------------------------------
# $lookup pipeline that enriches a trips cursor with related collections
# ---------------------------------------------------------------------------
_ENRICH_STAGES = [
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
    {"$project": {
        "_id": 1,
        "startTime": 1,
        "endTime": 1,
        "driverName":    "$driverInfo.name",
        "driverAvgScore": "$driverInfo.avgScore",
        "routeName":     "$routeInfo.name",
        "violations":    1,
    }},
]


# ---------------------------------------------------------------------------
# Batch update embeddings for all documents that lack one
# ---------------------------------------------------------------------------
def generate_and_store_embeddings(batch_size: int = 64) -> int:
    """
    Fetch trips without an embedding, join with drivers / routes / violations,
    build a text summary, compute the embedding, and write it back.
    Returns total docs updated.
    """
    client = get_mongo_client()
    try:
        db         = client[settings.mongodb_database]
        collection = db[settings.mongodb_collection]

        total_pending = collection.count_documents({"embedding": {"$exists": False}})
        logger.info("%d documents need embeddings.", total_pending)

        if total_pending == 0:
            logger.info("All documents already have embeddings — nothing to do.")
            return 0

        pipeline = [{"$match": {"embedding": {"$exists": False}}}, *_ENRICH_STAGES]
        docs = list(collection.aggregate(pipeline))

        updated = 0
        with tqdm(total=len(docs), desc="Generating embeddings", unit="doc") as pbar:
            for i in range(0, len(docs), batch_size):
                batch  = docs[i : i + batch_size]
                ids    = [d["_id"]                   for d in batch]
                texts  = [_build_trip_summary(d)     for d in batch]
                vectors = embed_texts(texts)

                ops = [
                    UpdateOne(
                        {"_id": doc_id},
                        {"$set": {"embedding": vec, "trip_summary": text}},
                    )
                    for doc_id, vec, text in zip(ids, vectors, texts)
                ]
                result   = collection.bulk_write(ops, ordered=False)
                updated += result.modified_count
                pbar.update(len(batch))

    finally:
        client.close()

    logger.info("Embeddings stored for %d documents.", updated)
    return updated


# ---------------------------------------------------------------------------
# Atlas Vector Search index definition
# ---------------------------------------------------------------------------
VECTOR_INDEX_DEFINITION = {
    "name": settings.vector_index_name,
    "type": "vectorSearch",
    "definition": {
        "fields": [
            {
                "type": "vector",
                "path": "embedding",
                "numDimensions": settings.embedding_dim,
                "similarity": "cosine",
            },
            {"type": "filter", "path": "startTime"},
        ]
    },
}


def create_vector_search_index() -> bool:
    """
    Create (or recreate) the Atlas Vector Search index programmatically.
    Returns True when the index is READY, False on timeout/error.
    Requires pymongo >= 4.7 and a MongoDB Atlas cluster.
    """
    import time as _time

    client     = get_mongo_client()
    collection = client[settings.mongodb_database][settings.mongodb_collection]

    try:
        existing = {idx["name"]: idx for idx in collection.list_search_indexes()}

        if settings.vector_index_name in existing:
            logger.info(
                "Vector search index '%s' already exists — dropping and recreating.",
                settings.vector_index_name,
            )
            collection.drop_search_index(settings.vector_index_name)
            _time.sleep(3)

        logger.info("Creating vector search index '%s'...", settings.vector_index_name)
        collection.create_search_index(model=VECTOR_INDEX_DEFINITION)
        logger.info("Index submitted. Polling for READY status (1-3 min on free tier)...")

        for _ in range(60):
            _time.sleep(3)
            statuses = {
                idx["name"]: idx.get("status", "")
                for idx in collection.list_search_indexes()
            }
            status = statuses.get(settings.vector_index_name, "PENDING")
            logger.info("Index status: %s", status)
            if status == "READY":
                logger.info("Vector search index is READY.")
                client.close()
                return True

        logger.warning("Index did not become READY within timeout. Check Atlas UI.")
        client.close()
        return False

    except Exception as exc:
        logger.error("Failed to create vector search index: %s", exc)
        client.close()
        return False


def embed_trip_by_id(trip_id: str) -> bool:
    """
    Fetch a single trip by its ObjectId, build its text summary, generate
    the embedding, and store it back in MongoDB.

    Returns True on success, False when the trip_id is not found.
    Raises on unexpected errors so callers can log / retry.
    """
    from bson import ObjectId

    client = get_mongo_client()
    try:
        db = client[settings.mongodb_database]
        collection = db[settings.mongodb_collection]

        pipeline = [{"$match": {"_id": ObjectId(trip_id)}}, *_ENRICH_STAGES]
        docs = list(collection.aggregate(pipeline))
        if not docs:
            logger.warning("embed_trip_by_id: trip %s not found.", trip_id)
            return False

        doc = docs[0]
        text = _build_trip_summary(doc)
        vector = embed_single(text)

        collection.update_one(
            {"_id": doc["_id"]},
            {"$set": {"embedding": vector, "trip_summary": text}},
        )
        logger.info("embed_trip_by_id: stored embedding for trip %s.", trip_id)
        return True
    finally:
        client.close()


if __name__ == "__main__":
    count = generate_and_store_embeddings()
    print(f"\nUpdated {count} documents with embeddings.")
    create_vector_search_index()
