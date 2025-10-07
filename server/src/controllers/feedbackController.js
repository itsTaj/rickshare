/**
 * Feedback Controller (server/src/controllers/feedbackController.js)
 * Purpose: Store and retrieve post-ride feedback and ratings.
 * Endpoints:
 *   POST /api/feedback        -> submit feedback { rideId, userId, rating(1-5), comment, targetUserId? }
 *   GET  /api/feedback        -> list all feedback (for demo)
 *   GET  /api/feedback/ride/:rideId -> list feedback for a ride
 *   GET  /api/feedback/user/:userId -> list feedback by/about a user
 */

const db = require('../services/db');

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

async function postFeedback(req, res, next) {
  try {
    const { rideId, userId, rating, comment, targetUserId } = req.body || {};
    if (!rideId || !userId) {
      return res.status(400).json({ message: 'rideId and userId are required' });
    }
    const normalized = {
      rideId,
      userId,
      targetUserId: targetUserId || null,
      rating: clamp(Number(rating || 0), 1, 5),
      comment: (comment || '').slice(0, 1000),
      createdAt: new Date().toISOString(),
    };
    const saved = await db.addFeedback(normalized);
    res.status(201).json(saved);
  } catch (err) {
    next(err);
  }
}

async function listAll(req, res, next) {
  try {
    const items = await db.getFeedbackAll();
    res.json(items);
  } catch (err) {
    next(err);
  }
}

async function listByRide(req, res, next) {
  try {
    const { rideId } = req.params;
    const items = await db.getFeedbackByRide(rideId);
    res.json(items);
  } catch (err) {
    next(err);
  }
}

async function listByUser(req, res, next) {
  try {
    const { userId } = req.params;
    const items = await db.getFeedbackByUser(userId);
    res.json(items);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  postFeedback,
  listAll,
  listByRide,
  listByUser,
};
