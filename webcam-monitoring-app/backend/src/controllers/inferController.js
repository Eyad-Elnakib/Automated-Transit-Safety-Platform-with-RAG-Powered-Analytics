const { validateInferBody } = require('../utils/validators');

/**
 * POST /api/infer
 *
 * Accepts the same frame payload as before PLUS optional trip context:
 *   { imageBase64, imageMime, width, height, driverId?, routeId?, busId?, tripId? }
 *
 * Detection logic, cooldowns, and confidence thresholds are UNCHANGED.
 * The only addition is passing the context IDs to eventLogger.saveEvent()
 * so each Violation is linked to the active trip.
 */
function createInferController({ config, aiClient, eventLogger, cooldownManager, appState, io, alertConfig = {} }) {
  return async function infer(req, res, next) {
    try {
      const validation = validateInferBody(req.body, { maxFrameBytes: config.MAX_FRAME_BYTES });
      if (!validation.ok) return res.status(400).json({ success: false, error: validation.error });

      const { imageBase64, imageMime, width, height } = req.body;

      // Trip context — all optional; violations are still saved without them.
      const driverId = req.body.driverId || null;
      const routeId  = req.body.routeId  || null;
      const busId    = req.body.busId    || null;
      const tripId   = req.body.tripId   || null;

      const imageBuffer = Buffer.from(imageBase64, 'base64');

      // Forward to Python AI service (unchanged).
      const predictions = await aiClient.predict({ imageBase64, imageMime, width, height });
      if (!predictions?.success) throw new Error('AI service returned unsuccessful response');

      const smokingPred    = predictions.smoking    || {};
      const drowsinessPred = predictions.drowsiness || {};
      const beltPred       = predictions.belt       || {};
      const cellphonePred  = predictions.cellphone  || {};
      const steeringPred   = predictions.steering   || {};

      const smokingLabel      = smokingPred.detected ? smokingPred.label : 'none';
      const smokingConfidence = typeof smokingPred.confidence === 'number' ? smokingPred.confidence : null;
      const drowsinessLabel   = drowsinessPred.label || 'awake';
      const drowsinessConfidence =
        typeof drowsinessPred.confidence === 'number' ? drowsinessPred.confidence : null;
      const beltLabel      = beltPred.detected ? 'belt' : (beltPred.label || 'no_belt');
      const beltConfidence = typeof beltPred.confidence === 'number' ? beltPred.confidence : null;
      const cellphoneLabel = cellphonePred.detected ? 'cellphone' : 'none';
      const cellphoneConfidence =
        typeof cellphonePred.confidence === 'number' ? cellphonePred.confidence : null;
      const steeringLabel  = steeringPred.detected ? 'hands_on_wheel' : 'hands_off_wheel';
      const steeringConfidence =
        typeof steeringPred.confidence === 'number' ? steeringPred.confidence : null;

      // Update live app state.
      appState.smoking    = { label: smokingLabel,    confidence: smokingConfidence };
      appState.drowsiness = { label: drowsinessLabel, confidence: drowsinessConfidence };
      appState.belt       = { label: beltLabel,       confidence: beltConfidence };
      appState.cellphone  = { label: cellphoneLabel,  confidence: cellphoneConfidence };
      appState.steering   = { label: steeringLabel,   confidence: steeringConfidence };
      appState.lastEvents = eventLogger.getLastEvents();

      const livePayload = {
        aiServiceReachable: appState.aiServiceReachable,
        smoking:    appState.smoking,
        drowsiness: appState.drowsiness,
        belt:       appState.belt,
        cellphone:  appState.cellphone,
        steering:   appState.steering,
        lastEvents: appState.lastEvents,
        // Echo back the active trip id so the UI can confirm it.
        tripId,
      };
      io.emit('liveStatus', livePayload);

      const savedEvents = [];
      const now = Date.now();

      // ── Cigarettes ────────────────────────────────────────────────────────
      if (smokingPred.detected && smokingPred.label === 'cigarettes') {
        const conf = typeof smokingPred.confidence === 'number' ? smokingPred.confidence : 0;
        if (conf >= config.SMOKING_EVENT_MIN_CONF && cooldownManager.isAllowed('cigarettes', now)) {
          const record = await eventLogger.saveEvent({
            type: 'cigarettes', confidence: conf,
            source: 'webcam', model: 'smoking-model', imageBuffer,
            driverId, routeId, busId, tripId, alertConfig,
          });
          cooldownManager.markTriggered('cigarettes', now);
          savedEvents.push(record);
          io.emit('eventSaved', record);
        }
      }

      // ── Vape ──────────────────────────────────────────────────────────────
      if (smokingPred.detected && smokingPred.label === 'vape') {
        const conf = typeof smokingPred.confidence === 'number' ? smokingPred.confidence : 0;
        if (conf >= config.SMOKING_EVENT_MIN_CONF && cooldownManager.isAllowed('vape', now)) {
          const record = await eventLogger.saveEvent({
            type: 'vape', confidence: conf,
            source: 'webcam', model: 'smoking-model', imageBuffer,
            driverId, routeId, busId, tripId, alertConfig,
          });
          cooldownManager.markTriggered('vape', now);
          savedEvents.push(record);
          io.emit('eventSaved', record);
        }
      }

      // ── Drowsy ────────────────────────────────────────────────────────────
      if (drowsinessPred.detected && drowsinessPred.label === 'drowsy') {
        const conf = typeof drowsinessPred.confidence === 'number' ? drowsinessPred.confidence : 0;
        if (conf >= config.DROWSY_EVENT_MIN_CONF && cooldownManager.isAllowed('drowsy', now)) {
          const record = await eventLogger.saveEvent({
            type: 'drowsy', confidence: conf,
            source: 'webcam', model: 'drowsiness-model', imageBuffer,
            driverId, routeId, busId, tripId, alertConfig,
          });
          cooldownManager.markTriggered('drowsy', now);
          savedEvents.push(record);
          io.emit('eventSaved', record);
        }
      }

      // ── Cellphone ─────────────────────────────────────────────────────────
      if (cellphonePred.detected) {
        const conf = typeof cellphonePred.confidence === 'number' ? cellphonePred.confidence : 0;
        if (conf >= config.CELLPHONE_EVENT_MIN_CONF && cooldownManager.isAllowed('cellphone', now)) {
          const record = await eventLogger.saveEvent({
            type: 'cellphone', confidence: conf,
            source: 'webcam', model: 'cellphone-model', imageBuffer,
            driverId, routeId, busId, tripId, alertConfig,
          });
          cooldownManager.markTriggered('cellphone', now);
          savedEvents.push(record);
          io.emit('eventSaved', record);
        }
      }

      // ── No Belt ───────────────────────────────────────────────────────────
      if (!beltPred.detected && beltPred.confidence > 0) {
        const conf = typeof beltPred.confidence === 'number' ? beltPred.confidence : 0;
        if (conf >= config.BELT_EVENT_MIN_CONF && cooldownManager.isAllowed('no_belt', now)) {
          const record = await eventLogger.saveEvent({
            type: 'no_belt', confidence: conf,
            source: 'webcam', model: 'belt-model', imageBuffer,
            driverId, routeId, busId, tripId, alertConfig,
          });
          cooldownManager.markTriggered('no_belt', now);
          savedEvents.push(record);
          io.emit('eventSaved', record);
        }
      }

      // ── Hands Off Wheel ──────────────────────────────────────────────────
      if (!steeringPred.detected && steeringPred.confidence > 0) {
        const conf = typeof steeringPred.confidence === 'number' ? steeringPred.confidence : 0;
        if (conf >= config.STEERING_EVENT_MIN_CONF && cooldownManager.isAllowed('hands_off_wheel', now)) {
          const record = await eventLogger.saveEvent({
            type: 'hands_off_wheel', confidence: conf,
            source: 'webcam', model: 'steering-model', imageBuffer,
            driverId, routeId, busId, tripId, alertConfig,
          });
          cooldownManager.markTriggered('hands_off_wheel', now);
          savedEvents.push(record);
          io.emit('eventSaved', record);
        }
      }

      appState.lastEvents = eventLogger.getLastEvents();

      return res.json({
        success: true,
        aiServiceReachable: appState.aiServiceReachable,
        smoking:    appState.smoking,
        drowsiness: appState.drowsiness,
        belt:       appState.belt,
        cellphone:  appState.cellphone,
        steering:   appState.steering,
        lastEvents: appState.lastEvents,
        savedEvents,
        tripId,
      });
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = createInferController;
