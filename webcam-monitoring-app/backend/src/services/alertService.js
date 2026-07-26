/**
 * alertService.js
 *
 * Responsible for dispatching violation alerts to an n8n Webhook (or any
 * HTTP endpoint).  All failures are non-fatal: the main detection pipeline
 * must never break because of a missing/slow alert destination.
 *
 * Features
 *  - Configurable via environment variables (see config/env.js)
 *  - Minimal retry with exponential back-off (1 retry, 2s delay)
 *  - Structured console logging (prefixed with [alert])
 *  - DB enrichment: resolves driverName, routeName, busLabel from ObjectIds
 *  - Gracefully skips when N8N_WEBHOOK_URL is not set or ALERT_ENABLED=false
 */

const axios = require('axios');
const { Driver, Route, Bus } = require('@dms/shared-models');

/* ── Constants ─────────────────────────────────────────────────────────── */
const PREFIX        = '[alert]';
const RETRY_DELAY   = 2000;  // ms before single retry
const REQUEST_TIMEOUT = 8000; // ms — n8n webhook should respond quickly

/* ── Helpers ────────────────────────────────────────────────────────────── */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const log = {
  info:  (...args) => console.log (PREFIX, ...args),
  warn:  (...args) => console.warn (PREFIX, ...args),
  error: (...args) => console.error(PREFIX, ...args),
};

/**
 * Resolve human-readable labels from MongoDB ObjectId references.
 * All lookups are best-effort; missing docs return fallback strings.
 *
 * @returns {{ driverName, routeName, busLabel }}
 */
async function enrichContext({ driverId, routeId, busId }) {
  const [driverDoc, routeDoc, busDoc] = await Promise.allSettled([
    driverId ? Driver.findById(driverId).select('name id').lean() : Promise.resolve(null),
    routeId  ? Route.findById(routeId).select('name').lean()      : Promise.resolve(null),
    busId    ? Bus.findById(busId).select('busId capacity').lean() : Promise.resolve(null),
  ]);

  const driverName = driverDoc.status === 'fulfilled' && driverDoc.value
    ? driverDoc.value.name
    : 'Unknown Driver';

  const routeName = routeDoc.status === 'fulfilled' && routeDoc.value
    ? routeDoc.value.name
    : 'Unknown Route';

  const busLabel = busDoc.status === 'fulfilled' && busDoc.value
    ? `${busDoc.value.busId} (${busDoc.value.capacity} seats)`
    : 'Unknown Bus';

  return { driverName, routeName, busLabel };
}

/**
 * Build the canonical alert payload sent to n8n.
 *
 * @param {object} violation    Raw violation data (type, confidence, timestamp, imagePath…)
 * @param {object} context      Enriched labels (driverName, routeName, busLabel)
 * @param {string} tripId       Active trip ObjectId string
 * @returns {object}            Plain-object payload
 */
function buildPayload(violation, context, tripId) {
  return {
    /* ─── Core violation fields ─── */
    type:       violation.type,
    confidence: Number((violation.confidence ?? 0).toFixed(4)),
    timestamp:  violation.timestamp instanceof Date
                  ? violation.timestamp.toISOString()
                  : (violation.timestamp ?? new Date().toISOString()),
    imagePath:  violation.imagePath  ?? null,

    /* ─── Context labels ─── */
    driverName: context.driverName,
    route:      context.routeName,
    bus:        context.busLabel,
    tripId:     tripId ?? null,

    /* ─── Derived / convenience fields ─── */
    severityLevel: confidenceToSeverity(violation.confidence),
    alertSource:   'driver-monitoring-system',
  };
}

/** Map confidence to a human-readable severity for easier n8n IF conditions. */
function confidenceToSeverity(confidence) {
  const c = Number(confidence ?? 0);
  if (c >= 0.90) return 'critical';
  if (c >= 0.75) return 'high';
  if (c >= 0.55) return 'medium';
  return 'low';
}

/**
 * POST payload to the given URL with one automatic retry.
 *
 * @param {string} url
 * @param {object} payload
 * @param {number} attempt  1 or 2
 */
async function postToWebhook(url, payload, attempt = 1) {
  try {
    const res = await axios.post(url, payload, {
      timeout: REQUEST_TIMEOUT,
      headers: { 'Content-Type': 'application/json' },
    });
    log.info(`Alert sent successfully (attempt ${attempt}) — status ${res.status}`, {
      type:       payload.type,
      driverName: payload.driverName,
      severity:   payload.severityLevel,
    });
    return true;
  } catch (err) {
    const status = err?.response?.status;
    const msg    = err?.message;

    if (attempt === 1) {
      log.warn(`Alert dispatch failed (attempt 1, status ${status ?? 'network'}: ${msg}). Retrying in ${RETRY_DELAY}ms…`);
      await sleep(RETRY_DELAY);
      return postToWebhook(url, payload, 2);
    }

    log.error(`Alert dispatch failed permanently after 2 attempts (status ${status ?? 'network'}: ${msg}).`);
    return false;
  }
}

/* ── Public API ─────────────────────────────────────────────────────────── */

/**
 * Send a violation alert to the configured n8n webhook.
 *
 * Designed to be awaited with .catch(() => {}) from callers so it can never
 * crash the detection pipeline even if this function throws unexpectedly.
 *
 * @param {object}      violation   Mongoose violation document or plain object
 * @param {object}      opts
 * @param {string|null} opts.driverId
 * @param {string|null} opts.routeId
 * @param {string|null} opts.busId
 * @param {string|null} opts.tripId
 * @param {object}      envConfig   config object from env.js (passed in to avoid circular requires)
 */
async function sendViolationAlert(violation, { driverId, routeId, busId, tripId } = {}, envConfig = {}) {
  /* ─── Guard: disabled or not configured ─── */
  if (!envConfig.ALERT_ENABLED) {
    log.info('Alerts disabled (ALERT_ENABLED=false). Skipping.');
    return;
  }

  const webhookUrl = envConfig.N8N_WEBHOOK_URL;
  if (!webhookUrl) {
    log.warn('N8N_WEBHOOK_URL is not set. Skipping alert dispatch.');
    return;
  }

  /* ─── Guard: confidence threshold pre-filter ─── */
  const minConf = envConfig.ALERT_MIN_CONFIDENCE ?? 0;
  if (violation.confidence < minConf) {
    log.info(`Skipping alert — confidence ${violation.confidence.toFixed(3)} below threshold ${minConf}`);
    return;
  }

  /* ─── Enrich with human-readable labels ─── */
  let context;
  try {
    context = await enrichContext({ driverId, routeId, busId });
  } catch (err) {
    log.warn('DB enrichment failed, using fallback labels:', err.message);
    context = { driverName: 'Unknown Driver', routeName: 'Unknown Route', busLabel: 'Unknown Bus' };
  }

  const payload = buildPayload(violation, context, tripId);
  log.info('Dispatching alert to n8n:', { type: payload.type, driverName: payload.driverName, severity: payload.severityLevel });

  /* ─── Fire-and-forget dispatch (best-effort) ─── */
  await postToWebhook(webhookUrl, payload);
}

module.exports = { sendViolationAlert, buildPayload, enrichContext };
