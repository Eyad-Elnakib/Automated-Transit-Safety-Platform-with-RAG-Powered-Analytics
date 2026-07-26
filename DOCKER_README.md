# Driver Monitoring System - Docker Deployment Guide

This repository utilizes a microservices architecture consisting of two platforms (`webcam-monitoring-app` and `Dashboard`). This guide explains how to build, run, and manage the system natively via Docker.

## 1. Detected Stack & Architecture
- **Webcam AI Service**: Python, FastAPI, YOLO PyTorch Models (`webcam-ai` container)
- **Webcam Backend**: Node.js, Express, Socket.IO, Storage (`webcam-backend` container)
- **Webcam UI**: React, Vite, served via Nginx proxy (`webcam-frontend` container, Port 5174)
- **Dashboard Backend**: Node.js, Express, MongoDB (`dashboard-backend` container)
- **Dashboard UI**: React, Vite, served via Nginx proxy (`dashboard-frontend` container, Port 5173)
- **Database**: MongoDB (`mongodb` container, Port 27017)

## 2. Prerequisites
1. Ensure you have **Docker Desktop** installed and **running**.
2. The YOLO `.pt` models must be placed inside `webcam-monitoring-app/ai-service/models/`. (These are dynamically mapped via volumes at runtime).
3. If running on a GPU, read the "Hardware Acceleration" section below.

## 3. Build & Run Instructions

To spin up the entire cluster simultaneously in the background:
```bash
docker-compose up -d --build
```

To stop the cluster while retaining volumes (Database & Snapshots intact):
```bash
docker-compose down
```

## 4. Accessing the Application
- **Dashboard UI**: [http://localhost:5173](http://localhost:5173)
- **Webcam System UI**: [http://localhost:5174](http://localhost:5174)

Nginx handles reversing API requests from the frontend containers (`/api/*`) straight to their respective Node.js backend. You do not need to hit port `5000` manually in the browser. 

## 5. View Logs & Debugging

If something isn't working, check the logs for an individual service:

```bash
docker logs dms-webcam-ai -f
docker logs dms-webcam-backend -f
docker logs dms-dashboard-backend -f
```

### Common Errors:
- **Docker Desktop not running (`error during connect`)**: Make sure you have opened the Docker Desktop application on Windows before running `docker-compose`.
- **Webcam Backend Crash (`EADDRINUSE`)**: This won't happen here! By isolating the backends in their own containers (`webcam-backend` and `dashboard-backend`), both can safely listen on port `5000` internally without colliding on your host machine.
- **AI Service Model Not Found**: If the python service crashes, verify the models physically exist on your host at `./webcam-monitoring-app/ai-service/models/`.

## 6. Development Workflow vs Production

**Production:**
Use the provided `docker-compose.yml`. It uses static HTML/JS bundles parsed by Nginx. This heavily reduces compute requirements overhead and prevents Vite server hangups.

**Development (Hot Reload):**
If you need hot reloading while developing UI components, bring up the database and AI natively in docker, but run the Node.js/React tiers locally:
```bash
# Start just Mongo and AI inference engine
docker-compose up -d mongodb webcam-ai

# Then, on your local machine terminal:
cd webcam-monitoring-app/frontend && npm run dev
```

## 7. Performance Optimization Tips & Hardware Acceleration
The standard Python AI Docker image utilizes standard CPU inference via `python:3.11-slim`. If you process frames in real-time and possess an NVIDIA GPU:
1. Open the `Dockerfile`.
2. Find `FROM python:3.11-slim AS webcam-ai`.
3. Change it to a CUDA-supported environment: `FROM pytorch/pytorch:2.1.0-cuda11.8-cudnn8-runtime AS webcam-ai`.
4. Update `docker-compose.yml` to pass GPU resources down:
   ```yaml
   webcam-ai:
     deploy:
       resources:
         reservations:
           devices:
             - driver: nvidia
               count: 1
               capabilities: [gpu]
   ```
