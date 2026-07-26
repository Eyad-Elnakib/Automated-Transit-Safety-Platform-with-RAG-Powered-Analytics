function createHealthController({ appState }) {
  return async function health(req, res) {
    res.json({
      ok: true,
      aiServiceReachable: appState.aiServiceReachable,
      timestamp: new Date().toISOString()
    });
  };
}

module.exports = createHealthController;

