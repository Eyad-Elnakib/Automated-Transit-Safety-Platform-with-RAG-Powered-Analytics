# 📊 Platform Performance Benchmarks & Empirical Evaluation Matrix

This technical document details the empirical performance metrics, dataset distributions, computer vision evaluation scores, and Retrieval-Augmented Generation (RAG) benchmarking results for the **Automated Transit Safety Platform**.

---

## 1. 🧠 Computer Vision & Object Detection Performance

The platform deploys 5 parallel **YOLOv8** neural networks executing simultaneously within an asynchronous Python thread pool. Each frame is evaluated across all detection tasks without sequential blocking, ensuring total inference latency equals only the slowest individual model in the pool ($\approx 500\text{ms}$ interval target).

### 🏆 Model Evaluation Summary

| Detection Task | Deployed Model Architecture | Performance Metric | Status | Primary Application |
| :--- | :--- | :--- | :---: | :--- |
| **Drowsiness / Fatigue** | **YOLOv8n (Nano)** | **97.1% Precision**, **97.4% mAP@50**, **82.7% mAP@50-95** | `DEPLOYED` | Detects micro-sleep, eye closure, and facial yawning |
| **Phone Usage** | **YOLOv8** | **94.3% mAP@50** | `DEPLOYED` | Detects handheld mobile devices and phone-to-ear gestures |
| **Seatbelt Compliance**| **YOLOv8x (896px)** | **85.4% mAP@50** | `DEPLOYED` | Verifies lap and shoulder seatbelt restraint positioning |
| **Smoking / Vaping** | **YOLOv8n (Nano)** | **82.1% mAP@50** | `DEPLOYED` | Identifies active cigarettes, vape devices, and smoke plumes |
| **Hands-Off Wheel** | **YOLOv8** | **89.7% mAP@50** | `DEPLOYED` | Enforces two-handed steering wheel control compliance |

---

### 📱 Phone Detection Dataset Distribution (Roboflow)
Trained on a specialized 16,973-image dataset containing annotated bounding boxes for handheld mobile devices inside vehicle cabins:

| Data Split | Percentage | Number of Images | Validation Purpose |
| :--- | :---: | :---: | :--- |
| **Training Set** | 91% | 15,528 | Neural network weight optimization & bounding box regression |
| **Validation Set** | 6% | 938 | Hyperparameter tuning & Non-Maximum Suppression (NMS) calibration |
| **Test Set** | 3% | 507 | Empirical out-of-sample benchmark evaluation |
| **Total** | **100%** | **16,973** | *All images contain precise coordinate annotations* |

---

### 😴 Drowsiness Detection Dataset & Deep Training Metrics
Trained using the lightweight **YOLOv8 Nano (`yolov8n`)** architecture optimized for real-time edge hardware deployment:

* **Training Configuration:**
  * **Model:** `YOLOv8n` (10 Epochs, Batch Size: 16, Optimizer: `AdamW`)
  * **Input Tensor Shape:** `3 × 640 × 640` (RGB Image Resolution)
  * **Target Classes:** `0 → Awake`, `1 → Drowsy`

#### Dataset Split & Class Distribution
| Data Split | Total Images | Target Classes |
| :--- | :---: | :--- |
| **Training** | 5,166 | `Awake`, `Drowsy` |
| **Validation** | 578 | `Awake`, `Drowsy` |
| **Testing** | 564 | `Awake`, `Drowsy` |

#### Detailed Test Performance (564 Test Images)
| Metric | Empirical Value | Analysis & Engineering Interpretation |
| :--- | :---: | :--- |
| **Precision** | **97.1%** | Extremely low false-positive rate; prevents driver alarm fatigue |
| **Recall** | **94.9%** | Identifies 94.9% of all actual fatigue events in real-world driving |
| **mAP@50** | **97.4%** | Exceptional mean average precision at 0.50 Intersection over Union (IoU) |
| **mAP@50-95** | **82.7%** | Strict multi-threshold boundary localization accuracy |
| **Awake (mAP50)** | **99.0%** | Near-perfect recognition of alert, attentive drivers |
| **Drowsy (mAP50)**| **95.9%** | High-reliability recognition of closed eyes and fatigue indicators |

---

## 2. 🤖 RAG Pipeline & Natural Language Retrieval Benchmarks

The conversational RAG assistant (`rag-agent`) utilizes a 4-Agent architecture (Query, Retriever, Analysis, and Response Agents) powered by **Groq LLaMA** and **SentenceTransformer (`all-MiniLM-L6-v2`, 384-dimensions)**. 

### 🎯 Retrieval Evaluation Metrics
Evaluated over historical fleet trip databases to measure semantic search accuracy and document ranking quality:

| Evaluation Metric | Empirical Value | Technical Interpretation |
| :--- | :---: | :--- |
| **Hit Rate** | **0.875 (87.5%)** | The target trip or violation record was successfully retrieved in 87.5% of all queries |
| **Recall@5** | **0.875 (87.5%)** | Top 5 vector candidates captured the exact ground-truth telematics document |
| **NDCG@5** | **0.829** | Normalized Discounted Cumulative Gain confirms high-quality ranking; best matches rank at the top |
| **MRR** | **0.813** | Mean Reciprocal Rank proves correct results appear near Rank 1 on average |
| **Precision@5** | **0.175** | Mathematical ceiling bounded by test dataset size (6 trips per sample; max possible $= 0.20$) |

#### Query Strategy Performance Comparison
* **Natural Language Queries (e.g., *"Which driver had cellphone violations?"*):**
  * **Recall:** `0.750` | **MRR:** `0.625` | **Hit Rate:** `0.750`
* **Summary-Prefix Routing (Near-Oracle Pipeline):**
  * **Recall:** `1.000` | **MRR:** `1.000` | **Hit Rate:** `1.000`

---

## 3. ⚡ Edge Telematics & Alert Throttling Load-Testing

To ensure stability during continuous high-definition webcam streaming, the Node.js telematics gateway was stress-tested under simulated network flooding and continuous hazard detection:

1. **Sliding Window Cooldown (`EVENT_COOLDOWN_MS`):** 
   * When a driver commits a prolonged violation (e.g., holding a cellphone for 30 continuous seconds at 15 FPS), raw frame evaluation generates over 450 positive bounding box detections.
   * The in-memory rate-limiting engine throttles database writes, recording **1 verified violation record** and saving **1 high-resolution proof snapshot (`sharp`)**, achieving a **99.78% reduction in database noise and storage waste**.
2. **Asynchronous Non-Blocking Alerting:**
   * Webhook dispatching to **n8n orchestration pipelines** (Gmail + Telegram) runs on an isolated asynchronous event loop. Network timeouts or SMTP delays produce zero latency impact on the real-time video WebSocket stream (`/ws/stream`).
