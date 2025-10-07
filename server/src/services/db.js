/**
 * RickShare DB Service (server/src/services/db.js)
 * Purpose: Minimal JSON-file-backed storage for demo purposes.
 * Notes:
 *  - Not for production use. Handles simple CRUD for rides.
 *  - Swappable with a real database or Firebase.
 */

const fs = require('fs/promises');
const path = require('path');

const DB_FILE_PATH = path.join(__dirname, '..', 'db', 'mock.json');

async function readDb() {
  const raw = await fs.readFile(DB_FILE_PATH, 'utf-8');
  const data = JSON.parse(raw || '{}');
  if (!data.rides) data.rides = [];
  return data;
}

async function writeDb(data) {
  const serialized = JSON.stringify(data, null, 2);
  await fs.writeFile(DB_FILE_PATH, serialized, 'utf-8');
}

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

module.exports = {
  getRides,
  addRide,
  findRideById,
  updateRide,
};
