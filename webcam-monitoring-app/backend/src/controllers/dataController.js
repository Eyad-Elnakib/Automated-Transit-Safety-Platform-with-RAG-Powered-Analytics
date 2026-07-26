/**
 * dataController.js
 *
 * Exposes the Dashboard backend's Drivers, Routes, and Buses collections
 * as read-only endpoints for the webcam frontend dropdowns.
 * Because both backends share the same MongoDB database, we query the
 * collections directly via the shared Mongoose models.
 */
const { Driver, Route, Bus } = require('@dms/shared-models');

async function getDrivers(req, res, next) {
  try {
    const drivers = await Driver.find({}, 'id name').sort({ name: 1 }).lean();
    res.json(drivers);
  } catch (err) {
    next(err);
  }
}

async function getRoutes(req, res, next) {
  try {
    const routes = await Route.find({}, 'name').sort({ name: 1 }).lean();
    res.json(routes);
  } catch (err) {
    next(err);
  }
}

async function getBuses(req, res, next) {
  try {
    const buses = await Bus.find({}, 'busId capacity').sort({ busId: 1 }).lean();
    res.json(buses);
  } catch (err) {
    next(err);
  }
}

module.exports = { getDrivers, getRoutes, getBuses };
