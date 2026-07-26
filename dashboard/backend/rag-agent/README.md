# Smart Bus Monitoring — RAG System

A production-ready Retrieval-Augmented Generation pipeline for analysing driver behaviour and vehicle health from MongoDB Atlas trip data.

---

## Architecture

```
User Query
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│  RAG Pipeline  (rag_pipeline.py)                                │
│                                                                 │
│  1. Intent extraction  ──► date / score / driver hints          │
│  2. Query embedding    ──► all-MiniLM-L6-v2 (384-dim)          │
│  3. Vector Search      ──► MongoDB Atlas $vectorSearch (top-k)  │
│  4. Context formatting ──► structured text block                │
│  5. LLM generation     ──► Groq (LLaMA 3 / Mixtral)            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
Grounded Answer  (Trip ID + Driver ID citations, no hallucination)
```

### Module Overview

| File | Responsibility |
|---|---|
| `config.py` | All settings loaded from `.env`; singleton `settings` object |
| `data_generator.py` | Generates realistic trip documents and upserts to MongoDB |
| `embedding_generator.py` | Computes sentence embeddings from `trip_summary` and stores them |
| `retrieval.py` | `$vectorSearch` aggregation pipeline; pre-filter builder |
| `generation.py` | Groq LLM calls; system prompt; streaming support |
| `rag_pipeline.py` | End-to-end orchestration; `RAGResult` dataclass |
| `main.py` | CLI entry point (setup / embed / test / chat modes) |

---

## MongoDB Document Schema

```json
{
  "trip_id": "TRIP-00042",
  "driver": {
    "driver_id": "DRV-007",
    "name": "Jane Smith",
    "licence": "LIC-4821-XYZ"
  },
  "vehicle_id": "BUS-003",
  "route": "Route 3 — University Loop",
  "start_time": "2026-04-05T08:15:00",
  "end_time":   "2026-04-05T09:45:00",
  "duration_minutes": 90,
  "distance_km": 34.5,
  "violations": [
    { "type": "drowsiness",  "severity": "critical", "timestamp": "...", "duration_seconds": 12 },
    { "type": "phone_usage", "severity": "high",     "timestamp": "...", "duration_seconds": 8  }
  ],
  "events": [
    { "type": "overspeed",     "timestamp": "...", "speed_kmh": 95, "limit_kmh": 60 },
    { "type": "harsh_braking", "timestamp": "...", "deceleration_mss": 5.3 }
  ],
  "safety_score": 57,
  "violation_count": 2,
  "event_count": 2,
  "trip_summary": "Trip TRIP-00042 on 2026-04-05: Driver Jane Smith (DRV-007) ...",
  "embedding": [ /* 384-dimensional float vector */ ]
}
```

### Safety Score Formula

```
score = 100
       − 15 × drowsiness
       − 10 × phone_usage / hands_off_steering
       −  8 × no_seatbelt
       −  6 × smoking
       −  8 × overspeed
       −  5 × harsh_braking
       −  7 × lane_departure
       −  4 × sharp_turn
(clamped to 0–100)
```

---

## Quick Start

### 1. Prerequisites

- Python 3.10+
- MongoDB Atlas cluster (free tier M0 works)
- Groq API key — [console.groq.com](https://console.groq.com)

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env and fill in MONGODB_URI and GROQ_API_KEY
```

### 4. Run full setup (generate data + embeddings)

```bash
python main.py --setup
```

This will:
- Generate 280 realistic trip documents (20/day × 14 days)
- Compute and store 384-dim embeddings for every document
- Print the Atlas Vector Search index JSON you need to create

### 5. Create the Vector Search index in Atlas UI

After `--setup` prints the index JSON:
1. Atlas → your cluster → **Search** → **Create Index**
2. Choose **Atlas Vector Search** (not full-text)
3. Select your database + collection
4. Paste the printed JSON → **Create**
5. Wait for status = **Active** (takes ~1 minute)

### 6. Run benchmark queries

```bash
python main.py --test
```

### 7. Interactive chat

```bash
python main.py --chat
```

### 8. Single query

```bash
python main.py --query "Which driver had the most drowsiness violations this week?"
```

---

## Example Interactions

**Query:** `Which driver had the lowest safety score this week?`

```
Direct Answer:
  Driver Marcus Webb (DRV-014) recorded the lowest safety score of 32/100
  during trip TRIP-00198 on 2026-04-03.

Supporting Details:
  • TRIP-00198: drowsiness (critical) at 09:22, phone usage (high) at 10:05,
    hands off steering (high) at 10:41.
  • Overspeed event: 97 km/h in a 60 km/h zone at 09:55.
  • Two additional trips this week scored 48 and 51.

Explanation:
  Multiple simultaneous high-severity violations in a single shift is a strong
  indicator of driver fatigue or distraction. DRV-014 should be flagged for
  immediate supervisor review and a mandatory rest period before next assignment.
```

---

**Query:** `How many drowsiness events occurred yesterday?`

```
Direct Answer:
  3 drowsiness violations were recorded across 3 separate trips yesterday
  (2026-04-06).

Supporting Details:
  • TRIP-00241 — DRV-009 (Route 4, 07:30): drowsiness at 08:12.
  • TRIP-00255 — DRV-003 (Route 1, 13:00): drowsiness at 14:45.
  • TRIP-00267 — DRV-017 (Route 6, 22:15): drowsiness at 23:02.

Explanation:
  The late-night incident (DRV-017 at 23:02) is particularly concerning given
  the Route 6 Night Shuttle schedule. Drowsiness at that hour on a night route
  represents elevated passenger risk.
```

---

## Performance

| Metric | Typical value |
|---|---|
| Query embedding | ~15 ms |
| MongoDB vector search | ~80–150 ms |
| Groq LLM generation | ~400–800 ms |
| **Total end-to-end** | **~500–1000 ms** |

---

## Advanced Usage

### Pre-filtering by date or driver

```python
from rag_pipeline import ask
from retrieval import build_prefilter

# Only search trips from the last 7 days with score < 60
result = ask(
    "Which routes had the most violations?",
    prefilter_hints={"days_back": 7, "max_score": 60},
)
print(result)
```

### Programmatic batch evaluation

```python
from rag_pipeline import batch_ask

queries = [
    "Which driver improved the most this month?",
    "List all critical drowsiness incidents this week.",
]
results = batch_ask(queries, top_k=5)
for r in results:
    print(r)
```

### Streaming output

```python
from generation import generate_answer_stream
from retrieval import retrieve, format_context_for_llm

docs = retrieve("Who had the most violations?")
context = format_context_for_llm(docs)
for token in generate_answer_stream("Who had the most violations?", context):
    print(token, end="", flush=True)
```

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `MONGODB_URI` | Yes | — | Atlas connection string |
| `MONGODB_DATABASE` | No | `bus_monitoring` | Database name |
| `MONGODB_COLLECTION` | No | `trips` | Collection name |
| `GROQ_API_KEY` | Yes | — | Groq API key |
| `GROQ_MODEL` | No | `llama3-8b-8192` | Groq model ID |
| `EMBEDDING_MODEL` | No | `all-MiniLM-L6-v2` | Sentence-transformers model |
| `VECTOR_INDEX_NAME` | No | `trip_vector_index` | Atlas Search index name |
| `TOP_K` | No | `5` | Documents to retrieve per query |
