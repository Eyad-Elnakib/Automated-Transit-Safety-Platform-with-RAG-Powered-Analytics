const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

// backend/src/config/env.js -> project root
const PROJECT_ROOT = path.resolve(__dirname, '../../..');

function resolvePathFromRoot(value, fallbackRelative) {
  if (value === undefined || value === null || value === '') return path.resolve(PROJECT_ROOT, fallbackRelative);
  if (path.isAbsolute(value)) return value;
  return path.resolve(PROJECT_ROOT, value);
}

const env = {
  BACKEND_PORT: Number(process.env.BACKEND_PORT || 4000),
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN || 'http://localhost:5174',
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:8000',

  // MongoDB — shared with the Dashboard backend
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/driver-monitoring',

  EVENT_COOLDOWN_MS: Number(process.env.EVENT_COOLDOWN_MS || 10000),

  SMOKING_EVENT_MIN_CONF:   Number(process.env.SMOKING_EVENT_MIN_CONF   || 0.3),
  DROWSY_EVENT_MIN_CONF:    Number(process.env.DROWSY_EVENT_MIN_CONF    || 0.35),
  CELLPHONE_EVENT_MIN_CONF: Number(process.env.CELLPHONE_EVENT_MIN_CONF || 0.3),
  BELT_EVENT_MIN_CONF:      Number(process.env.BELT_EVENT_MIN_CONF      || 0.3),
  STEERING_EVENT_MIN_CONF:  Number(process.env.STEERING_EVENT_MIN_CONF  || 0.3),

  MAX_FRAME_BYTES: Number(process.env.MAX_FRAME_BYTES || 400000),

  SNAPSHOT_BASE_DIR: resolvePathFromRoot(process.env.SNAPSHOT_BASE_DIR, 'storage/snapshots'),

  AI_HEALTH_PATH:  process.env.AI_HEALTH_PATH  || '/health',
  AI_PREDICT_PATH: process.env.AI_PREDICT_PATH || '/predict',

  INFER_RATE_LIMIT_PER_MIN: Number(process.env.INFER_RATE_LIMIT_PER_MIN || 60),

  // ── Smart Alerts / n8n Integration ──────────────────────────────────────
  // Set N8N_WEBHOOK_URL to your n8n webhook endpoint (Production or Test URL).
  // Leave blank to disable forwarding without errors.
  N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL || '',

  // Set to 'false' to globally disable alert forwarding (useful in dev/test).
  ALERT_ENABLED: process.env.ALERT_ENABLED !== 'false',

  // Only forward alerts where confidence >= this value. Default 0 = forward all.
  // Recommended production value: 0.5 (avoids spamming on borderline detections).
  ALERT_MIN_CONFIDENCE: Number(process.env.ALERT_MIN_CONFIDENCE || 0),
};

module.exports = env;
