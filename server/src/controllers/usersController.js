/**
 * Users Controller (server/src/controllers/usersController.js)
 * Purpose: Handle user registration, profile management, and wallet linking.
 * Endpoints documented in routes/users.js
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../services/db');

/**
 * POST /register
 * Body: { name?: string, email?: string, phone?: string, password?: string, otp?: string }
 * Behavior (mock): If user exists by email/phone, return/update; else create new with persistent ID.
 */
async function register(req, res, next) {
  try {
    const { name, email, phone, password, otp } = req.body || {};
    if (!email && !phone) {
      return res.status(400).json({ message: 'email or phone is required' });
    }

    // Mock verification: accept any password/otp
    const identifier = email || phone;
    let user = await db.findUserByEmailOrPhone(identifier);
    if (!user) {
      user = {
        id: uuidv4(),
        email: email || null,
        phone: phone || null,
        password: password || otp || null, // MOCK ONLY - do not store plaintext in production
        profile: name ? { name } : null,
        wallets: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.addUser(user);
    } else {
      // Update optional fields if provided
      const updates = { updatedAt: new Date().toISOString() };
      if (name) {
        updates.profile = { ...(user.profile || {}), name };
      }
      if (password || otp) {
        updates.password = password || otp; // MOCK ONLY
      }
      user = await db.updateUser(user.id, updates);
    }

    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /login
 * Body: { email?: string, phone?: string, identifier?: string, password?: string, otp?: string }
 * Behavior (mock): Look up by email/phone and accept provided password/otp if matches
 *                  stored mock password (if any); otherwise accept any value.
 */
async function login(req, res, next) {
  try {
    const { email, phone, identifier, password, otp } = req.body || {};
    const idf = identifier || email || phone;
    if (!idf) return res.status(400).json({ message: 'email or phone is required' });

    const user = await db.findUserByEmailOrPhone(idf);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const provided = password || otp || null;
    if (user.password && provided && user.password !== provided) {
      return res.status(401).json({ message: 'Invalid credentials (mock)' });
    }

    res.json({ user, token: 'mock-token' });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /profile/:id
 * Returns the user's basic account info plus profile and wallets.
 */
async function getProfile(req, res, next) {
  try {
    const { id } = req.params;
    const user = await db.findUserById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({
      id: user.id,
      email: user.email || null,
      phone: user.phone || null,
      profile: user.profile || null,
      wallets: user.wallets || [],
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /profile/:id
 * Body (any subset allowed): {
 *   name?: string,
 *   photoUrl?: string,          // can be a data URL from client for demo uploads
 *   emergencyContacts?: string[],
 *   emergencyContact?: string,  // legacy single contact
 *   email?: string,
 *   phone?: string
 * }
 */
async function setProfile(req, res, next) {
  try {
    const { id } = req.params;
    const { name, photoUrl, emergencyContacts, emergencyContact, email, phone } = req.body || {};

    const user = await db.findUserById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const currentProfile = user.profile || {};
    const nextProfile = { ...currentProfile };
    if (typeof name === 'string' && name.trim().length > 0) nextProfile.name = name.trim();
    if (typeof photoUrl === 'string' && photoUrl) nextProfile.photoUrl = photoUrl;

    if (Array.isArray(emergencyContacts)) {
      nextProfile.emergencyContacts = emergencyContacts.filter((c) => typeof c === 'string' && c.trim().length > 0);
    } else if (typeof emergencyContact === 'string' && emergencyContact.trim().length > 0) {
      nextProfile.emergencyContacts = [emergencyContact.trim()];
    }

    const updates = { profile: nextProfile, updatedAt: new Date().toISOString() };
    if (typeof email === 'string') updates.email = email.trim();
    if (typeof phone === 'string') updates.phone = phone.trim();

    const updatedUser = await db.updateUser(id, updates);
    res.json(updatedUser);
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
  login,
  getProfile,
  setProfile,
  linkWallet,
};
