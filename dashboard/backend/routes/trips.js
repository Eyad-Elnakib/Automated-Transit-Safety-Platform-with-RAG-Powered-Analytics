const express = require('express');
const router = express.Router();
const { Trip } = require('@dms/shared-models');

// GET all trips (newest first, with populated refs)
router.get('/', async (req, res) => {
  try {
    const trips = await Trip.find()
      .sort({ startTime: -1 })
      .limit(100)
      .populate('driver', 'id name')
      .populate('route',  'name')
      .populate('bus',    'busId capacity')
      .lean();
    res.json(trips);
  } catch {
    res.status(500).json({ error: 'Failed to fetch trips' });
  }
});

// GET single trip with violations and all refs populated
router.get('/:id', async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id)
      .populate('driver', 'id name')
      .populate('route',  'name')
      .populate('bus',    'busId capacity')
      .populate({ path: 'violations', options: { sort: { timestamp: 1 } } })
      .lean();
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    res.json(trip);
  } catch {
    res.status(500).json({ error: 'Failed to fetch trip' });
  }
});

module.exports = router;
