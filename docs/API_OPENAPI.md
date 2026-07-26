# 🔌 API Specifications & OpenAPI / Swagger Reference

The **Automated Transit Safety Platform** provides self-documenting REST and WebSocket APIs across its microservices. All computer vision inference endpoints natively conform to the OpenAPI 3.0 specification via FastAPI.

---

## 1. 🧠 AI Computer Vision Service (FastAPI — Port `8000`)

When running the Python inference engine (`webcam-monitoring-app/ai-service`), interactive API documentation is generated automatically in real time:

* **Interactive Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
* **ReDoc Documentation:** [http://localhost:8000/redoc](http://localhost:8000/redoc)
* **Raw OpenAPI JSON Schema:** [http://localhost:8000/openapi.json](http://localhost:8000/openapi.json)

### Core Inference Endpoints

#### `POST /predict`
Evaluates a video frame across 5 parallel YOLOv8 models and returns bounding boxes, labels, and confidence metrics.
* **Request Body:** `multipart/form-data` (image binary) or JSON payload containing Base64 encoded image string.
* **Response Example (`200 OK`):**
```json
{
  "status": "success",
  "timestamp": "2026-07-26T18:00:00Z",
  "inference_time_ms": 46.8,
  "detections": [
    {
      "category": "CELLPHONE",
      "label": "phone",
      "confidence": 0.943,
      "bbox": [142, 88, 310, 420],
      "model_attribution": "bestcellphone.pt"
    },
    {
      "category": "DROWSY",
      "label": "Drowsy",
      "confidence": 0.971,
      "bbox": [210, 115, 390, 310],
      "model_attribution": "bestyolov8drowsymodel.pt"
    }
  ]
}
```

#### `GET /health`
Kubernetes and Docker readiness probe reporting model memory footprints and inference device availability.
* **Response Example (`200 OK`):**
```json
{
  "status": "healthy",
  "models_loaded": 5,
  "active_models": [
    "bestsmokeyolov8n.pt",
    "bestyolov8drowsymodel.pt",
    "bestbelt.pt",
    "bestcellphone.pt",
    "bestClass_v2.pt"
  ],
  "device": "cpu",
  "version": "1.0.0"
}
```

---

## 2. 🌐 Telematics Gateway & Streaming API (Node.js — Port `3001` / `5000`)

### REST Endpoints
* `POST /api/alerts`: Ingests violation events from edge devices, enforces cooldown rate-limiting, stores proof snapshots (`sharp`), and triggers n8n webhooks.
* `GET /api/alerts`: Retrieves paginated violation audit logs filtered by `driverId`, `category`, or date ranges.
* `GET /api/status`: Returns system connectivity metrics and Socket.IO active client counts.

### Bi-Directional WebSocket Channel (`/ws/stream`)
Establishes low-latency real-time video streaming over **Socket.IO**:
* **Client Emit (`frame`):** Sends binary video buffer or Base64 string at 15–30 FPS.
* **Server Broadcast (`detection_result`):** Pushes AI bounding box coordinates and status alerts to connected UI dashboards without HTTP polling overhead.

---

## 3. 🤖 Conversational RAG Analytics Service (Python — Port `8001`)

* **Interactive Swagger UI:** [http://localhost:8001/docs](http://localhost:8001/docs)
* **Raw OpenAPI JSON:** [http://localhost:8001/openapi.json](http://localhost:8001/openapi.json)

### Core NL Query Endpoint
#### `POST /api/chat`
Translates natural language supervisor inquiries into vector similarity searches and structured LLM safety analyses.
* **Request Payload:**
```json
{
  "query": "Which transit driver had the most drowsiness events this week, and what was their average safety score?",
  "top_k": 5
}
```
* **Response Example (`200 OK`):**
```json
{
  "answer": "Driver DRV-004 (Malak Yasser) recorded the highest number of drowsiness events this week (3 distinct incidents on Route R-102). Her cumulative safety score dropped to 72.4%.",
  "supporting_evidence": [
    {
      "tripId": "TRP-8921",
      "driverId": "DRV-004",
      "date": "2026-07-25",
      "violation_count": 2,
      "snapshot_proof": "/snapshots/v-8921-1.png",
      "similarity_score": 0.892
    }
  ],
  "retrieval_strategy": "hybrid_router_aggregation",
  "execution_time_ms": 312
}
```
