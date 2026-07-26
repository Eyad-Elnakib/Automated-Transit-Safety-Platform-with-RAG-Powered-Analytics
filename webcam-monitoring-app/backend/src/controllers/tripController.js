const { Trip, Driver } = require('@dms/shared-models');

/**
 * POST /api/trips/start
 * Body: { driverId, routeId?, busId? }
 *
 * Creates a new active Trip. Score starts at 100.
 * Closes any previously active trip for the same driver first.
 */
async function startTrip(req, res, next) {
  try {
    const { driverId, routeId, busId } = req.body;

    if (!driverId) {
      return res.status(400).json({ success: false, error: 'driverId is required' });
    }

    // Close any other active trip for the same driver, just in case.
    await Trip.updateMany(
      { driver: driverId, active: true },
      { active: false, endTime: new Date() }
    );

    const trip = await Trip.create({
      driver:     driverId,
      route:      routeId || null,
      bus:        busId   || null,
      startTime:  new Date(),
      active:     true,
      score:      100,
      violations: [],
    });

    return res.status(201).json({ success: true, trip });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/trips/stop/:id
 *
 * Marks the trip as ended.
 * After stopping, re-calculates and persists the driver's:
 *   totalTrips = count of all trips for that driver
 *   avgScore   = rounded average of all trip scores
 */
async function stopTrip(req, res, next) {
  try {
    const trip = await Trip.findByIdAndUpdate(
      req.params.id,
      { endTime: new Date(), active: false },
      { new: true }
    );

    if (!trip) {
      return res.status(404).json({ success: false, error: 'Trip not found' });
    }

    // Recompute driver stats from ALL trips for this driver (including the one just ended).
    const driverId = trip.driver;
    const allTrips = await Trip.find({ driver: driverId }).select('score').lean();
    const totalTrips = allTrips.length;
    const avgScore =
      totalTrips > 0
        ? Math.round(
            allTrips.reduce((sum, t) => sum + (typeof t.score === 'number' ? t.score : 100), 0) /
              totalTrips
          )
        : 0;

    await Driver.findByIdAndUpdate(driverId, { totalTrips, avgScore });

    return res.json({ success: true, trip });
  } catch (err) {
    return next(err);
  }
}

module.exports = { startTrip, stopTrip };
