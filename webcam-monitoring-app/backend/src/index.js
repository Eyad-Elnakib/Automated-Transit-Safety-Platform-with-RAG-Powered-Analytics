const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');

const config = require('./config/env');
const { connectDB } = require('./db/connect');
const AiClient = require('./services/aiClient');
const CooldownManager = require('./services/cooldownManager');
const EventLogger = require('./services/eventLogger');

const createInferController = require('./controllers/inferController');
const createHealthController = require('./controllers/healthController');
const createStatusController = require('./controllers/statusController');
const createLogsController = require('./controllers/logsController');
const createLastEventsController = require('./controllers/lastEventsController');
const { startTrip, stopTrip } = require('./controllers/tripController');
const { getDrivers, getRoutes, getBuses } = require('./controllers/dataController');
const alertsRouter = require('./routes/alerts');
const errorHandler = require('./middleware/errorHandler');

// backend/src/index.js is in webcam-monitoring-app/backend/src/
// Two levels up reaches the webcam-monitoring-app root (where storage/ lives).
const APP_ROOT = path.resolve(__dirname, '../..');

async function main() {
  // ── Connect to MongoDB ───────────────────────────────────────────────────
  await connectDB(config.MONGO_URI);

  const app = express();
  app.disable('x-powered-by');

  app.use(
    cors({
      origin: config.FRONTEND_ORIGIN,
      credentials: true,
    })
  );

  // Serve snapshot images.  Allow any origin so <img> tags in any frontend
  // (dashboard at :5173, webcam UI at :5174) can load images without CORS errors.
  app.use('/storage', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
  }, express.static(path.join(APP_ROOT, 'storage')));

  app.use(express.json({ limit: '25mb' }));

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: config.FRONTEND_ORIGIN,
      credentials: true,
    },
  });

  const appState = {
    aiServiceReachable: null,
    smoking:    { label: 'none',   confidence: null },
    drowsiness: { label: 'awake',  confidence: null },
    belt:       { label: 'belt',   confidence: null },
    cellphone:  { label: 'none',   confidence: null },
    steering:   { label: 'hands_on_wheel', confidence: null },
    lastEvents: null,
  };

  // ── Alert config (injected wherever needed) ─────────────────────────────
  const alertConfig = {
    N8N_WEBHOOK_URL:      config.N8N_WEBHOOK_URL,
    ALERT_ENABLED:        config.ALERT_ENABLED,
    ALERT_MIN_CONFIDENCE: config.ALERT_MIN_CONFIDENCE,
  };

  // Make alertConfig available to Express routes via app.get('alertConfig')
  app.set('alertConfig', alertConfig);

  if (alertConfig.ALERT_ENABLED && alertConfig.N8N_WEBHOOK_URL) {
    console.log(`[alerts] Smart Alerts enabled — forwarding to: ${alertConfig.N8N_WEBHOOK_URL}`);
    console.log(`[alerts] Minimum confidence threshold: ${alertConfig.ALERT_MIN_CONFIDENCE}`);
  } else if (!alertConfig.N8N_WEBHOOK_URL) {
    console.log('[alerts] Smart Alerts inactive — set N8N_WEBHOOK_URL in .env to enable.');
  } else {
    console.log('[alerts] Smart Alerts disabled via ALERT_ENABLED=false.');
  }

  // EventLogger no longer needs logsBaseDir (JSON files are replaced by MongoDB).
  const eventLogger = new EventLogger({
    snapshotBaseDir: config.SNAPSHOT_BASE_DIR,
  });
  await eventLogger.init();
  appState.lastEvents = eventLogger.getLastEvents();

  const cooldownManager = new CooldownManager(config.EVENT_COOLDOWN_MS);

  const aiClient = new AiClient({
    aiServiceUrl: config.AI_SERVICE_URL,
    healthPath:   config.AI_HEALTH_PATH,
    predictPath:  config.AI_PREDICT_PATH,
  });

  async function refreshAiHealth() {
    try {
      await aiClient.checkHealth();
      appState.aiServiceReachable = true;
    } catch {
      appState.aiServiceReachable = false;
    }
  }

  await refreshAiHealth();
  setInterval(refreshAiHealth, 5000).unref();

  // ── Controller setup ─────────────────────────────────────────────────────
  const healthController     = createHealthController({ appState });
  const statusController     = createStatusController({ appState });
  const logsController       = createLogsController({ eventLogger });
  const lastEventsController = createLastEventsController({ eventLogger });

  const inferController = createInferController({
    config,
    aiClient,
    eventLogger,
    cooldownManager,
    appState,
    io,
    alertConfig,
  });

  // ── Socket.IO ────────────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    socket.emit('liveStatus', {
      aiServiceReachable: appState.aiServiceReachable,
      smoking:    appState.smoking,
      drowsiness: appState.drowsiness,
      belt:       appState.belt,
      cellphone:  appState.cellphone,
      steering:   appState.steering,
      lastEvents: appState.lastEvents,
    });
  });

  // ── Rate limiter ─────────────────────────────────────────────────────────
  const inferLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit:    config.INFER_RATE_LIMIT_PER_MIN,
    standardHeaders: true,
    legacyHeaders:   false,
  });

  // ── Routes: existing ─────────────────────────────────────────────────────
  app.get('/api/health',        healthController);
  app.get('/api/status',        statusController);
  app.get('/api/logs/:type',    logsController);
  app.get('/api/last-events',   lastEventsController);
  app.post('/api/infer',        inferLimiter, inferController);

  // ── Routes: trips ────────────────────────────────────────────────────────
  app.post('/api/trips/start',   startTrip);
  app.post('/api/trips/stop/:id', stopTrip);

  // ── Routes: data (drivers / routes / buses) from shared MongoDB ──────────
  app.get('/api/drivers', getDrivers);
  app.get('/api/routes',  getRoutes);
  app.get('/api/buses',   getBuses);

  // ── Routes: Smart Alerts ─────────────────────────────────────────────────
  app.use('/api/alerts', alertsRouter);

  app.use(errorHandler);

  // ── Ensure snapshot directories exist ────────────────────────────────────
  await fs.ensureDir(config.SNAPSHOT_BASE_DIR);

  const port = config.BACKEND_PORT;
  server.listen(port, () => {
    console.log(`[backend] listening on http://localhost:${port}`);
    console.log(`[backend] storage snapshots: ${config.SNAPSHOT_BASE_DIR}`);
  });
}

main().catch((err) => {
  console.error('[backend] failed to start:', err);
  process.exit(1);
});
