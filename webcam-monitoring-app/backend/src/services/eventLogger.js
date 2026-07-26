const fs = require('fs-extra');
const path = require('path');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const { toUTCDateParts, toFilenameTimestamp } = require('../utils/time');
const { Violation, Trip } = require('@dms/shared-models');
const { sendViolationAlert } = require('./alertService');

const EVENT_TYPES = ['cigarettes', 'vape', 'drowsy', 'cellphone', 'no_belt'];

/**
 * EventLogger
 *
 * Keeps snapshot PNG saving exactly as before (via sharp).
 * Replaces JSON file writing with MongoDB Violation documents.
 * In-memory lastEventByType cache is seeded from MongoDB on init().
 */
class EventLogger {
  constructor({ snapshotBaseDir }) {
    this.snapshotBaseDir = snapshotBaseDir;
    this.lastEventByType = {};
  }

  // ── Initialisation ───────────────────────────────────────────────────────
  async init() {
    // Ensure snapshot directories exist (unchanged behaviour).
    await fs.ensureDir(this.snapshotBaseDir);
    for (const type of EVENT_TYPES) {
      await fs.ensureDir(path.join(this.snapshotBaseDir, type));
    }

    // Prime the in-memory cache from MongoDB so /api/last-events works
    // correctly after a server restart.
    for (const type of EVENT_TYPES) {
      try {
        const last = await Violation.findOne({ type }).sort({ timestamp: -1 }).lean();
        if (last) this.lastEventByType[type] = this._toRecord(last);
      } catch {
        // Non-fatal: DB may be empty or unreachable on first boot.
      }
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────
  _toRecord(violation) {
    return {
      id:         violation._id.toString(),
      object:     violation.type,
      timestamp:  violation.timestamp instanceof Date
                    ? violation.timestamp.toISOString()
                    : violation.timestamp,
      photo:      violation.imagePath,
      confidence: violation.confidence,
      source:     violation.source,
      model:      violation.model,
      driver:     violation.driver   ?? null,
      route:      violation.route    ?? null,
      bus:        violation.bus      ?? null,
      trip:       violation.trip     ?? null,
    };
  }

  _snapshotFilePath(type, filename) {
    return path.join(this.snapshotBaseDir, type, filename);
  }

  _snapshotRelativePath(filename, type) {
    return path.posix.join('storage', 'snapshots', type, filename);
  }

  // ── Public API ───────────────────────────────────────────────────────────
  getLastEvents() {
    const pick = (t) => this.lastEventByType[t] || null;
    const all = EVENT_TYPES.map(pick).filter(Boolean);
    const last = all.length
      ? all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]
      : null;
    return {
      cigarettes: pick('cigarettes'),
      vape:       pick('vape'),
      drowsy:     pick('drowsy'),
      cellphone:  pick('cellphone'),
      no_belt:    pick('no_belt'),
      last,
    };
  }

  /**
   * Save a detection event.
   *
   * Snapshot PNG is written to disk exactly as before.
   * Violation is persisted to MongoDB instead of a JSON file.
   *
   * @param {object} opts
   * @param {string}      opts.type         - one of EVENT_TYPES
   * @param {number}      opts.confidence
   * @param {string}      opts.source
   * @param {string}      opts.model
   * @param {Buffer}      opts.imageBuffer
   * @param {string|null} opts.driverId     - MongoDB ObjectId string (optional)
   * @param {string|null} opts.routeId
   * @param {string|null} opts.busId
   * @param {string|null} opts.tripId
   */
  /**
   * @param {object}      opts
   * @param {string}      opts.type
   * @param {number}      opts.confidence
   * @param {string}      opts.source
   * @param {string}      opts.model
   * @param {Buffer}      opts.imageBuffer
   * @param {string|null} opts.driverId
   * @param {string|null} opts.routeId
   * @param {string|null} opts.busId
   * @param {string|null} opts.tripId
   * @param {object}      [opts.alertConfig]  — config object from env.js, injected at init
   */
  async saveEvent({ type, confidence, source, model, imageBuffer, driverId, routeId, busId, tripId, alertConfig }) {
    if (!EVENT_TYPES.includes(type)) throw new Error(`Invalid event type: ${type}`);

    const ts = new Date();
    const filenameBase = `${type}_${toFilenameTimestamp(ts)}_${uuidv4().slice(0, 8)}`;
    const filename = `${filenameBase}.png`;
    const relativePath = this._snapshotRelativePath(filename, type);

    // ── Snapshot (unchanged) ──────────────────────────────────────────────
    const outPath = this._snapshotFilePath(type, filename);
    await sharp(imageBuffer).png().toFile(outPath);

    // ── MongoDB persistence (replaces JSON write) ─────────────────────────
    const violation = await Violation.create({
      type,
      confidence:  Number(confidence),
      timestamp:   ts,
      imagePath:   relativePath,
      source:      source || 'webcam',
      model:       model  || null,
      driver:      driverId || null,
      route:       routeId  || null,
      bus:         busId    || null,
      trip:        tripId   || null,
    });

    // ── Link violation to trip + decrement score (floor at 0) ─────────────
    if (tripId) {
      try {
        await Trip.findByIdAndUpdate(tripId, [
          {
            $set: {
              score: { $max: [0, { $subtract: ['$score', 10] }] },
              violations: { $concatArrays: ['$violations', [violation._id]] },
            },
          },
        ]);
      } catch {
        // Non-fatal: trip score update is best-effort.
      }
    }

    // ── Smart Alert: forward to n8n (best-effort, never blocks pipeline) ──
    sendViolationAlert(
      violation,
      { driverId, routeId, busId, tripId },
      alertConfig || {}
    ).catch((err) => {
      console.error('[alert] unexpected error in sendViolationAlert:', err?.message);
    });

    const record = this._toRecord(violation);
    this.lastEventByType[type] = record;
    return record;
  }

  /**
   * Read recent violations for a given type (used by /api/logs/:type).
   * Returns the 100 most recent documents, newest first.
   */
  async readLogs(type) {
    if (!EVENT_TYPES.includes(type)) throw new Error('Invalid log type');
    const violations = await Violation.find({ type })
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();
    return violations.map((v) => this._toRecord(v));
  }
}

module.exports = EventLogger;
