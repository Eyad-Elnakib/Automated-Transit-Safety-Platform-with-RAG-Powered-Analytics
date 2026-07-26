const express = require('express');
const router = express.Router();
const { Violation } = require('@dms/shared-models');

// GET violations — optional ?type=drowsy&tripId=xxx&driverId=xxx query filters
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.type)     filter.type   = req.query.type;
    if (req.query.tripId)   filter.trip   = req.query.tripId;
    if (req.query.driverId) filter.driver = req.query.driverId;

    const violations = await Violation.find(filter)
      .sort({ timestamp: -1 })
      .limit(200)
      .populate('driver', 'id name')
      .populate('route',  'name')
      .populate('bus',    'busId capacity')
      .populate('trip',   'startTime endTime active')
      .lean();
    res.json(violations);
  } catch {
    res.status(500).json({ error: 'Failed to fetch violations' });
  }
});

module.exports = router;
