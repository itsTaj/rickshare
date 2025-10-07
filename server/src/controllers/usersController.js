/**
 * Users Controller (server/src/controllers/usersController.js)
 * Purpose: Handle user registration, profile management, and wallet linking.
 * Endpoints documented in routes/users.js
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../services/db');

/**
 * POST /register
 * Body: { email: string, otp?: string, name?: string }
 * Behavior: Mock OTP flow. If user exists by email, return it; else create.
 */
async function register(req, res, next) {
  try {
    const { email } = req.body || {};
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ message: 'email is required' });
    }

    // In a real app, verify OTP. Here it's mocked/assumed valid.
    let user = await db.findUserByEmail(email);
    if (!user) {
      user = {
        id: uuidv4(),
        email,
        profile: null,
        wallets: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.addUser(user);
    }

    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /profile/:id
 * Returns the user's profile object or null if not set.
 */
async function getProfile(req, res, next) {
  try {
    const { id } = req.params;
    const user = await db.findUserById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ profile: user.profile || null });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /profile/:id
 * Body: { name: string, photoUrl?: string, emergencyContact?: string }
 */
async function setProfile(req, res, next) {
  try {
    const { id } = req.params;
    const { name, photoUrl, emergencyContact } = req.body || {};

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ message: 'name is required' });
    }

    const updated = await db.setUserProfile(id, {
      name,
      photoUrl: photoUrl || null,
      emergencyContact: emergencyContact || null,
    });

    if (!updated) return res.status(404).json({ message: 'User not found' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /link-wallet/:id
 * Body: { provider: 'bKash' | 'Nagad', account: string }
 * Behavior: Mock linking; just stores the wallet entry.
 */
async function linkWallet(req, res, next) {
  try {
    const { id } = req.params;
    const { provider, account } = req.body || {};

    if (!provider || !['bKash', 'Nagad'].includes(provider)) {
      return res
        .status(400)
        .json({ message: "provider must be 'bKash' or 'Nagad'" });
    }
    if (!account || typeof account !== 'string') {
      return res.status(400).json({ message: 'account is required' });
    }

    const updated = await db.linkUserWallet(id, { provider, account });
    if (!updated) return res.status(404).json({ message: 'User not found' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  getProfile,
  setProfile,
  linkWallet,
};
