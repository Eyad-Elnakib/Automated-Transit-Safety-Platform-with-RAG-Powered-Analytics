# Smart Alerts — Setup & Deployment Guide

## Overview

The Smart Alerts system automatically forwards every driver violation detected by the webcam backend to an **n8n webhook**, which then dispatches notifications via Email, Telegram, and Slack.

```
Webcam AI → eventLogger.saveEvent() → alertService.sendViolationAlert()
                                              ↓
                                    POST → n8n Webhook URL
                                              ↓
                              IF: drowsy OR confidence ≥ 0.8
                                    ↙              ↘
                            YES (alert)        NO (skip/log)
                         ↙    ↓     ↘
                      Email Telegram Slack
```

---

## 1. Environment Variables

Edit `webcam-monitoring-app/backend/.env`:

```env
# Paste your n8n Production Webhook URL (or Test URL for development):
N8N_WEBHOOK_URL=https://your-workspace.app.n8n.cloud/webhook/driver-violation-alert

# Set to false to silence all forwarding without code changes:
ALERT_ENABLED=true

# Minimum confidence required to forward an alert [0.0 – 1.0]:
# 0 = forward every detection (good for testing)
# 0.5 = recommended for production
ALERT_MIN_CONFIDENCE=0
```

> **Tip:** The server logs `[alerts] Smart Alerts enabled — forwarding to: <url>` on startup when correctly configured.

---

## 2. Import the n8n Workflow

1. Open your n8n instance (cloud or self-hosted).
2. Go to **Workflows → Import from file**.
3. Select `webcam-monitoring-app/docs/n8n-workflow.json`.
4. The workflow named **"Driver Monitoring — Smart Violation Alerts"** will be imported.

### Configure Credentials

After importing, open each action node and attach your credentials:

| Node | Credential Required |
|------|---------------------|
| **Send Alert Email** | SMTP credential (host, port, user, password) |
| **Send Telegram Message** | Telegram Bot API Token; update `chatId` |
| **Send Slack Message** | Slack OAuth App token; update `channelId` |

### Get the Webhook URL

1. Open the **"Violation Webhook"** node.
2. Click **"Listen for test event"** (for development) or activate the workflow (for production).
3. Copy the **Production URL** — it looks like:
   ```
   https://your-workspace.app.n8n.cloud/webhook/driver-violation-alert
   ```
4. Paste it as `N8N_WEBHOOK_URL` in `.env`.

---

## 3. Workflow Logic

```
Webhook (POST)
    ↓
Respond 200 OK         ← immediate acknowledgement (runs in parallel)
    +
IF Node
├── TRUE  (type=drowsy OR confidence ≥ 0.8)
│       ↓
│   Format Alert Message (Set node — builds subject + body)
│       ↓ (parallel)
│   ├── Send Alert Email (HTML formatted)
│   ├── Send Telegram Message (plain text)
│   └── Send Slack Message (Block Kit)
│
└── FALSE (below threshold)
        ↓
    Log Skipped (Set node — records reason, no notification)
```

### Customising the IF Condition

Open the **"IF: Drowsy OR Confidence ≥ 0.8"** node to adjust thresholds:

- **Alert on ALL violations**: Remove the IF node; connect Webhook → Format → actions directly.
- **Alert only on critical severity**: Change condition to `body.severityLevel` equals `critical`.
- **Alert on specific types**: Add conditions for `type` equals `cellphone`, `no_belt`, etc.

---

## 4. n8n Payload Fields

Every alert sent to n8n contains these fields:

| Field | Type | Example | Description |
|-------|------|---------|-------------|
| `type` | string | `"drowsy"` | Violation type |
| `confidence` | number | `0.91` | AI model confidence [0–1] |
| `timestamp` | ISO string | `"2026-04-08T19:25:00Z"` | Detection time (UTC) |
| `imagePath` | string | `"storage/snapshots/..."` | Relative path to snapshot PNG |
| `driverName` | string | `"Ahmed Ali"` | Resolved driver full name |
| `route` | string | `"Abu Qir Line"` | Route name |
| `bus` | string | `"BUS-001 (50 seats)"` | Bus ID + capacity |
| `tripId` | string | `"642c6b9f..."` | MongoDB ObjectId of active trip |
| `severityLevel` | string | `"critical"` | `critical` / `high` / `medium` / `low` |
| `alertSource` | string | `"driver-monitoring-system"` | System identifier |

Severity thresholds:
- **critical** → confidence ≥ 0.90
- **high**     → confidence ≥ 0.75
- **medium**   → confidence ≥ 0.55
- **low**      → confidence < 0.55

---

## 5. Manual Testing (without a webcam)

### Option A — cURL

```bash
curl -X POST http://localhost:4000/api/alerts/violation \
  -H "Content-Type: application/json" \
  -d '{
    "type": "drowsy",
    "confidence": 0.91,
    "driverId": "<PASTE_MONGO_DRIVER_ID>",
    "routeId":  "<PASTE_MONGO_ROUTE_ID>",
    "busId":    "<PASTE_MONGO_BUS_ID>",
    "tripId":   "<PASTE_MONGO_TRIP_ID>"
  }'
```

Expected response: `{ "success": true, "message": "Alert dispatch initiated", ... }`

### Option B — by violationId (from MongoDB)

```bash
curl -X POST http://localhost:4000/api/alerts/violation \
  -H "Content-Type: application/json" \
  -d '{ "violationId": "<PASTE_VIOLATION_MONGO_ID>" }'
```

### Option C — n8n Test Webhook

Use the n8n "Listen for test event" button in the Webhook node, then send a request
from `docs/sample-payloads.json` to the **Test URL**.

---

## 6. Backend Logs

```
[alert] Dispatching alert to n8n: { type: 'drowsy', driverName: 'Ahmed Ali', severity: 'critical' }
[alert] Alert sent successfully (attempt 1) — status 200 { type: 'drowsy', ... }
```

Failed (e.g. n8n unreachable):
```
[alert] Alert dispatch failed (attempt 1, status network: ECONNREFUSED). Retrying in 2000ms…
[alert] Alert dispatch failed permanently after 2 attempts (status network: ECONNREFUSED).
```

Alerts are **always non-fatal** — a failed dispatch never interrupts the detection pipeline.

---

## 7. Architecture Notes

| File | Purpose |
|------|---------|
| `src/services/alertService.js` | Core: enrichment, payload building, HTTP dispatch with retry |
| `src/routes/alerts.js` | Express router: `POST /api/alerts/violation` |
| `src/services/eventLogger.js` | Calls `alertService` after each Violation is persisted |
| `src/controllers/inferController.js` | Passes `alertConfig` to `eventLogger.saveEvent()` |
| `src/config/env.js` | `N8N_WEBHOOK_URL`, `ALERT_ENABLED`, `ALERT_MIN_CONFIDENCE` |
| `docs/n8n-workflow.json` | Ready-to-import n8n workflow |
| `docs/sample-payloads.json` | Sample payloads for all 5 violation types |
