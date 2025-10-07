/**
 * RickShare DB Service (server/src/services/db.js)
 * Purpose: Minimal JSON-file-backed storage for demo purposes.
 * Notes:
 *  - Not for production use. Handles simple CRUD for rides and users.
 *  - Swappable with a real database or Firebase.
 */

const fs = require('fs/promises');
const path = require('path');

const DB_FILE_PATH = path.join(__dirname, '..', 'db', 'mock.json');

async function readDb() {
  let raw;
  try {
    raw = await fs.readFile(DB_FILE_PATH, 'utf-8');
  } catch (_e) {
    raw = '{}';
  }
  const data = JSON.parse(raw || '{}');
  if (!data.rides) data.rides = [];
  if (!data.users) data.users = [];
  if (!data.feedback) data.feedback = [];
  if (!data.rideHistory) data.rideHistory = [];
  return data;
}

async function writeDb(data) {
  const serialized = JSON.stringify(data, null, 2);
  await fs.writeFile(DB_FILE_PATH, serialized, 'utf-8');
}

// ---------------- Rides ----------------
async function getRides() {
  const db = await readDb();
  return db.rides;
}

async function addRide(ride) {
  const db = await readDb();
  db.rides.push(ride);
  await writeDb(db);
  return ride;
}

async function findRideById(id) {
  const db = await readDb();
  return db.rides.find((r) => r.id === id) || null;
}

async function updateRide(id, updates) {
  const db = await readDb();
  const index = db.rides.findIndex((r) => r.id === id);
  if (index === -1) return null;
  const updated = { ...db.rides[index], ...updates };
  db.rides[index] = updated;
  await writeDb(db);
  return updated;
}

async function archiveRide(id, summary) {
  const db = await readDb();
  const index = db.rides.findIndex((r) => r.id === id);
  if (index === -1) return null;
  const ride = db.rides[index];
  const historyEntry = { ...summary, rideId: ride.id };
  db.rideHistory.push(historyEntry);
  // Optionally remove from active rides; for demo we keep it but mark completed
  db.rides[index] = { ...ride, status: 'completed', completedAt: new Date().toISOString() };
  await writeDb(db);
  return historyEntry;
}

// ---------------- Feedback ----------------
async function addFeedback(entry) {
  const db = await readDb();
  db.feedback.push(entry);
  await writeDb(db);
  return entry;
}

async function getFeedbackAll() {
  const db = await readDb();
  return db.feedback;
}

async function getFeedbackByRide(rideId) {
  const db = await readDb();
  return db.feedback.filter((f) => f.rideId === rideId);
}

async function getFeedbackByUser(userId) {
  const db = await readDb();
  return db.feedback.filter((f) => f.userId === userId || f.targetUserId === userId);
}

// ---------------- Users ----------------
async function getUsers() {
  const db = await readDb();
  return db.users;
}

async function addUser(user) {
  const db = await readDb();
  db.users.push(user);
  await writeDb(db);
  return user;
}

async function findUserById(id) {
  const db = await readDb();
  return db.users.find((u) => u.id === id) || null;
}

async function findUserByEmail(email) {
  const db = await readDb();
  return db.users.find((u) => u.email === email) || null;
}

async function updateUser(id, updates) {
  const db = await readDb();
  const index = db.users.findIndex((u) => u.id === id);
  if (index === -1) return null;
  const updated = { ...db.users[index], ...updates };
  db.users[index] = updated;
  await writeDb(db);
  return updated;
}

async function setUserProfile(id, profile) {
  const db = await readDb();
  const index = db.users.findIndex((u) => u.id === id);
  if (index === -1) return null;
  const updated = { ...db.users[index], profile: { ...profile } };
  db.users[index] = updated;
  await writeDb(db);
  return updated;
}

async function linkUserWallet(id, wallet) {
  const db = await readDb();
  const index = db.users.findIndex((u) => u.id === id);
  if (index === -1) return null;
  const existing = db.users[index];
  const wallets = Array.isArray(existing.wallets) ? existing.wallets : [];
  const updated = { ...existing, wallets: [...wallets, wallet] };
  db.users[index] = updated;
  await writeDb(db);
  return updated;
}

module.exports = {
  // rides
  getRides,
  addRide,
  findRideById,
  updateRide,
  archiveRide,
  // feedback
  addFeedback,
  getFeedbackAll,
  getFeedbackByRide,
  getFeedbackByUser,
  // users
  getUsers,
  addUser,
  findUserById,
  findUserByEmail,
  updateUser,
  setUserProfile,
  linkUserWallet,
};
