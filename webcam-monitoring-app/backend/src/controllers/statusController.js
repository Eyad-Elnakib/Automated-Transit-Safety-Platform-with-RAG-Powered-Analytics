function createStatusController({ appState }) {
  return async function status(req, res) {
    res.json({
      aiServiceReachable: appState.aiServiceReachable,
      smoking: appState.smoking || { label: 'none', confidence: null },
      drowsiness: appState.drowsiness || { label: 'awake', confidence: null },
      lastEvents: appState.lastEvents || null
    });
  };
}

module.exports = createStatusController;

