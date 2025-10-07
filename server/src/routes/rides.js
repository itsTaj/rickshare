/**
 * Rides Routes (server/src/routes/rides.js)
 * Purpose: Express routes for rides.
 * Summary of endpoints:
 *   GET    /api/rides            -> list all rides (mock store)
 *   POST   /api/rides            -> legacy create (pickup/destination)
 *   POST   /api/rides/create     -> create ride with userId/start/end/fare
 *   GET    /api/rides/nearby     -> nearby rides by start point
 *   POST   /api/rides/join       -> join a ride (overlap + fare share)
 *   POST   /api/rides/complete   -> finalize ride, compute fare breakdown
 *   GET    /api/rides/live/:id   -> SSE live updates (simulated)
 *   GET    /api/rides/:id        -> get ride by id
 *   PATCH  /api/rides/:id        -> update ride (status/destination)
 */

const express = require('express');
const controller = require('../controllers/ridesController');

const router = express.Router();

router.get('/', controller.listRides);
router.post('/', controller.createRide);
router.post('/create', controller.createRideInit);
router.get('/nearby', controller.nearbyRides);
router.post('/join', controller.joinRide);
router.post('/complete', controller.completeRide);
router.get('/live/:id', controller.liveRideSse);
router.get('/:id', controller.getRide);
router.patch('/:id', controller.updateRide);

module.exports = router;
