/**
 * RickShare Rides Controller (server/src/controllers/ridesController.js)
 * Purpose: Business logic for rides endpoints.
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../services/db');

async function listRides(req, res, next) {
  try {
    const rides = await db.getRides();
    res.json(rides);
  } catch (err) {
    next(err);
  }
}

async function createRide(req, res, next) {
  try {
    const { riderName, pickup, destination } = req.body || {};
    if (!pickup || typeof pickup.lat !== 'number' || typeof pickup.lng !== 'number') {
      return res.status(400).json({ message: 'pickup {lat, lng} is required' });
    }

    const ride = {
      id: uuidv4(),
      riderName: riderName || 'Guest',
      pickup,
      destination: destination || null,
      status: 'requested',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.addRide(ride);
    res.status(201).json(ride);
  } catch (err) {
    next(err);
  }
}

async function getRide(req, res, next) {
  try {
    const { id } = req.params;
    const ride = await db.findRideById(id);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    res.json(ride);
  } catch (err) {
    next(err);
  }
}

async function updateRide(req, res, next) {
  try {
    const { id } = req.params;
    const allowed = ['status', 'destination'];
    const updates = {};
    for (const key of allowed) {
      if (key in req.body) updates[key] = req.body[key];
    }
    updates.updatedAt = new Date().toISOString();

    const updated = await db.updateRide(id, updates);
    if (!updated) return res.status(404).json({ message: 'Ride not found' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listRides,
  createRide,
  getRide,
  updateRide,
};
