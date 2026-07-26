/**
 * routes/alerts.js
 *
 * Express router for the Smart Alerts API.
 *
 * POST /api/alerts/violation
 *   Accepts a violation payload (either raw fields OR a violationId to look up)
 *   and forwards it to the n8n webhook.
 *
 *   This endpoint can be:
 *   a) Called internally by other services
 *   b) Triggered manually during testing / integration debugging
 *   c) Called externally by other microservices in the fleet system
 *
 * The route does NOT trigger detection — it is purely a forwarding/alert gateway.
 */

const express = require('express');
const { Violation } = require('@dms/shared-models');
const { sendViolationAlert } = require('../services/alertService');

const router = express.Router();

/**
 * POST /api/alerts/violation
 *
 * Body (option A — raw fields):
 * {
 *   "type":       "drowsy",
 *   "confidence": 0.91,
 *   "timestamp":  "2026-04-08T19:25:00Z",  // optional, defaults to now
 *   "imagePath":  "storage/snapshots/...",  // optional
 *   "driverId":   "<ObjectId>",             // optional
 *   "routeId":    "<ObjectId>",             // optional
 *   "busId":      "<ObjectId>",             // optional
 *   "tripId":     "<ObjectId>"              // optional
 * }
 *
 * Body (option B — look up from DB by violationId):
 * {
 *   "violationId": "<ObjectId>"
 * }
 */
router.post('/violation', async (req, res, next) => {
  try {
    const config = req.app.get('alertConfig');  // injected in index.js

    let violation;
    let driverId, routeId, busId, tripId;

    /* ── Option B: look up from DB ── */
    if (req.body.violationId) {
      const doc = await Violation.findById(req.body.violationId).lean();
      if (!doc) {
        return res.status(404).json({ success: false, error: 'Violation not found' });
      }
      violation = doc;
      driverId  = doc.driver?.toString();
      routeId   = doc.route?.toString();
      busId     = doc.bus?.toString();
      tripId    = doc.trip?.toString();
    } else {
      /* ── Option A: raw fields from body ── */
      const { type, confidence, timestamp, imagePath } = req.body;

      const VALID_TYPES = ['drowsy', 'cellphone', 'cigarettes', 'vape', 'no_belt'];
      if (!type || !VALID_TYPES.includes(type)) {
        return res.status(400).json({
          success: false,
          error: `Invalid or missing "type". Must be one of: ${VALID_TYPES.join(', ')}`,
        });
      }
      if (confidence === undefined || confidence === null || isNaN(Number(confidence))) {
        return res.status(400).json({ success: false, error: '"confidence" must be a number' });
      }

      violation = {
        type,
        confidence: Number(confidence),
        timestamp:  timestamp ? new Date(timestamp) : new Date(),
        imagePath:  imagePath ?? null,
      };

      driverId = req.body.driverId ?? null;
      routeId  = req.body.routeId  ?? null;
      busId    = req.body.busId    ?? null;
      tripId   = req.body.tripId   ?? null;
    }

    /* ── Dispatch ── */
    // sendViolationAlert is best-effort — it never throws into the pipeline.
    sendViolationAlert(violation, { driverId, routeId, busId, tripId }, config)
      .catch((err) => console.error('[alert-route] unexpected error:', err?.message));

    return res.status(202).json({
      success: true,
      message: 'Alert dispatch initiated',
      payload: {
        type:      violation.type,
        confidence: violation.confidence,
        timestamp: violation.timestamp instanceof Date
                     ? violation.timestamp.toISOString()
                     : violation.timestamp,
      },
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
