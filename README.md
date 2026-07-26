# 🚀 Automated Transit Safety Platform with RAG-Powered Analytics

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.13-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/YOLOv8-Ultralytics-00FFFF?style=for-the-badge&logo=yolo&logoColor=black" alt="YOLOv8" />
  <img src="https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/React-18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Docker-Enabled-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/n8n-Automated_Workflows-EA4B71?style=for-the-badge&logo=n8n&logoColor=white" alt="n8n" />
</p>

<p align="center">
  <b>An enterprise-grade, microservice-based Driver Monitoring System (DMS) designed to revolutionize transit and fleet safety.</b><br />
  Powered by real-time multi-model YOLOv8 computer vision, event-driven telematics, and Retrieval-Augmented Generation (RAG) for conversational safety analytics.
</p>

---

## 📸 Platform Showcase & Preview

| 📊 Fleet Overview & Real-Time Analytics | 🤖 Conversational AI Safety Agent (RAG) |
| :---: | :---: |
| ![Fleet Overview Dashboard](./screenshots/overview-dashboard.jpeg) | ![RAG AI Chatbot](./screenshots/fleet-ai-rag-chatbot.jpeg) |
| *Real-time telemetry, live driver status, and comprehensive safety scoring across transit fleets.* | *Interactive natural language queries and automated reporting powered by Python and RAG.* |

| 👤 Driver Profiles & Trip Telematics | 🚌 Fleet Asset & Route Management |
| :---: | :---: |
| ![Driver Profile and Trip History](./screenshots/driver-profile-history.jpeg) | ![Fleet Asset Management](./screenshots/fleet-entity-management.jpeg) |
| *Granular trip tracking, fatigue monitoring, and historical violation inspection per driver.* | *Seamless CRUD management and assignment for transit buses, routes, and active drivers.* |

### ⚡ Automated Alert Pipeline (n8n & Socket.IO)
<p align="center">
  <img src="./screenshots/n8n-alert-pipeline.jpeg" alt="n8n Violation Alert Pipeline" width="85%" />
  <br />
  <i>Event-driven webhooks triggering instant emergency notifications and dispatch alerts upon real-time AI hazard detection.</i>
</p>

---

## 🔄 How It Works: End-to-End Operational Workflow

The platform operates as a continuous, closed-loop safety pipeline that captures live video, evaluates hazards in milliseconds, logs telematics, and dispatches emergency alerts without human intervention:

```
[ 📷 Webcam / Edge UI ]
         │ (Socket.IO Live Video Streaming)
         ▼
[ 🌐 Webcam Backend Gateway ] ───(HTTP POST Frame / Predict)───► [ 🧠 Python AI Service (FastAPI) ]
         │                                                                  │
         │ (Returns Hazard Confidence & Bounding Boxes) ◄───────────────────┘
         ▼
[ ⚖️ Cooldown & Rate-Limiting Engine ]
         │
         ├───► 💾 Records Violation & Snapshot in MongoDB (@dms/shared-models)
         ├───► ⚡ Emits Real-Time Dashboard Alarms via Socket.IO
         └───► 🚨 Dispatches Webhook to n8n Automated Alert Workflows
```

1. **Edge Video Ingestion & Frame Capping:** The React streaming dashboard captures live driver video and transmits optimized, resized video frames over bi-directional **Socket.IO** WebSockets to the Node.js telematics gateway.
2. **Multi-Model YOLOv8 Inference:** The backend immediately dispatches the video frame to the **FastAPI Python AI Engine**. Five dedicated PyTorch/YOLOv8 neural networks evaluate the frame simultaneously to detect behavioral hazards (Smoking, Drowsiness, Seatbelt unfastened, Cellphone use, Hands-off wheel).
3. **Smart Event Cooldowns & Validation:** When a violation exceeds safety confidence thresholds (e.g., `DROWSY_EVENT_MIN_CONF > 0.35`), the gateway processes the event through a smart rate-limiting algorithm (`EVENT_COOLDOWN_MS`). This prevents alert fatigue while capturing high-resolution evidence snapshots.
4. **Automated Dispatch via n8n:** Verified violations are instantly saved to **MongoDB Atlas** and trigger external **n8n webhooks**, alerting fleet supervisors via email, SMS, or dispatch channels.
5. **Conversational RAG Analytics:** Fleet managers can interrogate historical data using natural language (e.g., *"Which bus route had the most fatigue violations this week?"*). The Python **RAG Agent** retrieves context from MongoDB and synthesizes executive safety summaries.

---

## 🧩 Microservice Components Deep-Dive

The repository is structured as a decoupled **Monorepo Workspace** powered by NPM Workspaces, separating concerns across specialized microservices:

### 1. 📁 `shared/models` (`@dms/shared-models`)
* **Purpose:** The single source of truth for database architecture.
* **Details:** Exports unified Mongoose schemas (`Driver`, `Trip`, `Violation`, `Bus`, `Route`). By sharing this package across all backends, the platform guarantees zero schema drift, consistent indexing, and strict data validation across both streaming and admin services.

### 2. 📁 `webcam-monitoring-app/ai-service` (Computer Vision Engine)
* **Purpose:** High-speed real-time AI inference.
* **Details:** Built with **Python 3.13**, **FastAPI**, and **Ultralytics YOLOv8**. Loads 5 independently trained PyTorch weights into memory upon startup. Utilizes asynchronous endpoints (`/predict`, `/health`) to analyze video frames with sub-50ms latency.

### 3. 📁 `webcam-monitoring-app/backend` & `frontend` (Telematics & Streaming)
* **Purpose:** Live video streaming and violation processing gateway.
* **Details:** Built on **Node.js, Express, Socket.IO, and Vite**. Manages real-time camera feeds, image snapshot caching (via `sharp`), alert frequency throttling, and automated integration with external n8n webhook endpoints.

### 4. 📁 `dashboard/backend` & `frontend` (Fleet Management Portal)
* **Purpose:** Enterprise administration and telematics reporting.
* **Details:** A full-featured REST API and React dashboard for fleet operators. Handles driver assignments, bus route mapping, trip histories, and granular statistical breakdowns of fleet compliance and safety scores.

### 5. 📁 `dashboard/rag-agent` (Conversational AI Analytics)
* **Purpose:** Intelligent natural language data retrieval.
* **Details:** A Python assistant built with **LangChain** and vector/RAG methodologies. Translates complex supervisor inquiries into actionable safety reports, identifying recurring hazard patterns across routes and drivers.

---

## 🛠️ Tech Stack & Technologies

- **Computer Vision & Machine Learning:** Python 3.13, Ultralytics YOLOv8, PyTorch, OpenCV, FastAPI, Starlette, Uvicorn
- **Conversational AI & Analytics:** LangChain, RAG (Retrieval-Augmented Generation), LLM Integration
- **Backend Infrastructure:** Node.js, Express.js, Socket.IO, Mongoose ORM, Sharp, Axios
- **Frontend User Interfaces:** React 18, Vite, Modern Responsive Design, Custom Vanilla CSS
- **Database & Cloud Storage:** MongoDB / MongoDB Atlas, Local File Snapshot Caching
- **DevOps & Workflow Automation:** Docker, Docker Compose, NPM Monorepo Workspaces, n8n Webhook Pipelines

---

## 🚀 Getting Started

### Option 1: One-Click Docker Setup (Recommended)
Ensure Docker is running on your machine and your YOLO `.pt` model files are placed inside `webcam-monitoring-app/ai-service/models/`.

```bash
# Start MongoDB, AI Engine, Backends, and Frontends simultaneously
docker compose up --build
```
- **Admin Dashboard:** [http://localhost:5173](http://localhost:5173)
- **Live Webcam Monitor:** [http://localhost:5174](http://localhost:5174)

---

### Option 2: Local Development (Manual Setup)

**1. Bootstrap Workspace & Dependencies:**
```bash
# From project root — installs packages for all JavaScript services via NPM Workspaces
npm install
```

**2. Ensure Database is Online:**
Make sure a local MongoDB server is running on port `27017`, or configure your cloud `MONGO_URI` in the respective service `.env` files.

**3. Start the Microservices:**
Open separate terminal tabs from the root directory and launch each service:
```bash
# 1. Fleet Admin Backend
cd dashboard/backend && npm run dev

# 2. Fleet Admin Frontend
cd dashboard/frontend && npm run dev

# 3. Live Streaming Backend
cd webcam-monitoring-app/backend && npm run dev

# 4. Live Streaming Frontend
cd webcam-monitoring-app/frontend && npm run dev

# 5. Computer Vision AI Engine (FastAPI)
cd webcam-monitoring-app/ai-service
py -m pip install -r requirements.txt
py -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

## 📄 License
This project is licensed under the MIT License. Designed and engineered for high-reliability transit safety.
