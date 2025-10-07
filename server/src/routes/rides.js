/**
 * Rides Routes (server/src/routes/rides.js)
 * Purpose: Express routes for rides.
 */

const express = require('express');
const controller = require('../controllers/ridesController');

const router = express.Router();

router.get('/', controller.listRides);
router.post('/', controller.createRide);
router.get('/:id', controller.getRide);
router.patch('/:id', controller.updateRide);

module.exports = router;
