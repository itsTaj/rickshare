/**
 * Users Routes (server/src/routes/users.js)
 * Purpose: Express routes for user registration, profile management, and wallet linking.
 * Summary of endpoints:
 *   POST   /api/register           -> register (mock OTP)
 *   GET    /api/profile/:id        -> get user's profile
 *   POST   /api/profile/:id        -> set/update user's profile
 *   POST   /api/link-wallet/:id    -> link a wallet (bKash/Nagad)
 */

const express = require('express');
const controller = require('../controllers/usersController');

const router = express.Router();

router.post('/register', controller.register);
router.post('/login', controller.login);
router.get('/profile/:id', controller.getProfile);
router.post('/profile/:id', controller.setProfile);
router.post('/link-wallet/:id', controller.linkWallet);

// New namespaced endpoints to support /api/users/* flow
router.post('/users/register', controller.register);
router.post('/users/login', controller.login);
router.get('/users/profile/:id', controller.getProfile);
router.post('/users/profile/:id', controller.setProfile);

module.exports = router;
