function createLogsController({ eventLogger }) {
  return async function logs(req, res, next) {
    try {
      const type = req.params.type;
      const allowed = ['cigarettes', 'vape', 'drowsy'];
      if (!allowed.includes(type)) return res.status(400).json({ success: false, error: 'Invalid type' });
      const events = await eventLogger.readLogs(type);
      res.json({ success: true, type, events });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = createLogsController;

