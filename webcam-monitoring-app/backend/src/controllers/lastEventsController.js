function createLastEventsController({ eventLogger }) {
  return async function lastEvents(req, res) {
    res.json({ success: true, ...eventLogger.getLastEvents() });
  };
}

module.exports = createLastEventsController;

