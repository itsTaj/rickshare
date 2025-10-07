/**
 * Feedback Routes (server/src/routes/feedback.js)
 * Purpose: Routes for feedback and ratings storage.
 */

const express = require('express');
const controller = require('../controllers/feedbackController');

const router = express.Router();

router.post('/', controller.postFeedback);
router.get('/', controller.listAll);
router.get('/ride/:rideId', controller.listByRide);
router.get('/user/:userId', controller.listByUser);

module.exports = router;
