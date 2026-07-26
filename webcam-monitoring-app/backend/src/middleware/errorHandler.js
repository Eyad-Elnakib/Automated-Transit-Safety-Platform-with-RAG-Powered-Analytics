function errorHandler(err, req, res, next) {
  // eslint-disable-next-line no-unused-vars
  const _ = next;
  console.error('Request error:', err?.message || err);
  const status =
    err?.statusCode ||
    err?.status ||
    err?.response?.status ||
    (err?.code ? 503 : 500);
  res.status(status).json({
    success: false,
    error: err?.message || 'Internal error'
  });
}

module.exports = errorHandler;

