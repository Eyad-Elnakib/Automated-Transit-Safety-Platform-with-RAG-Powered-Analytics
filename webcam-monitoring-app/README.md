# Real-Time Webcam Monitoring (YOLO)

This project is a production-structured, real-time webcam monitoring website that:
- Streams frames from a browser webcam to a Node/Express backend
- Runs two Ultralytics YOLO models in a Python (FastAPI) inference service
- Detects smoking (cigarettes/vape) and alertness (awake/drowsy)
- Saves event snapshots and structured JSON logs with per-event cooldowns

## Folder layout
- `frontend/` - React + Vite + Tailwind + Socket.IO client
- `backend/` - Express + Socket.IO orchestrator + cooldowns + snapshot/log persistence
- `ai-service/` - FastAPI inference service (loads YOLO `.pt` models once)
- `storage/` - runtime snapshots + JSON logs

## Prerequisites
- Node.js 18+ (recommended 20+)
- Python 3.10+ (recommended 3.11+)
- Install dependencies per-service (instructions below)

## YOLO models
The AI service expects:
- `ai-service/models/smoking_model.pt`
- `ai-service/models/drowsiness_model.pt`

These are already copied in this scaffold from the provided models in the original repository.

## Environment variables
Copy `webcam-monitoring-app/.env.example` to:
- `backend/.env`
- `ai-service/.env`
- `frontend/.env`

Windows (PowerShell) quick copy:
```powershell
Copy-Item .env.example backend\.env
Copy-Item .env.example ai-service\.env
Copy-Item .env.example frontend\.env
```

## Run the system (3 terminals)

### 1) Python AI service
```bash
cd ai-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 2) Backend (Node + Express)
```bash
cd backend
npm install
npm run dev
```

### 3) Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```

Then open the frontend URL shown by Vite (default `http://localhost:5173`).

## Endpoints / health checks

Backend:
- `GET /api/health`
- `GET /api/status`
- `POST /api/infer`
- `GET /api/logs/:type` where `type` is `cigarettes|vape|drowsy`
- `GET /api/last-events`

Python AI service:
- `GET /health`
- `POST /predict`

## Main flow
1. Browser captures webcam frames (throttled by an inference interval)
2. Frontend sends frames to backend `POST /api/infer`
3. Backend forwards the frame to Python `POST /predict`
4. Python runs both YOLO models and returns structured predictions
5. Backend applies cooldown/debouncing per event type
6. If a meaningful event occurs, backend:
   - saves a PNG snapshot to `storage/snapshots/<event>/`
   - appends a record to `storage/logs/<event>.json`
7. Backend broadcasts live detection status via Socket.IO so the UI updates

