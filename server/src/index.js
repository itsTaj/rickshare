/**
 * RickShare Express Server (server/src/index.js)
 * Purpose: Bootstraps Express app, wires middleware and routes, and serves API under /api.
 */

const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const fs = require('fs');

const errorHandler = require('./middleware/errorHandler');
const ridesRoutes = require('./routes/rides');
const feedbackRoutes = require('./routes/feedback');
const usersRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Basic healthcheck
app.get('/health', (_req, res) => res.json({ ok: true }));

// API routes
app.use('/api/rides', ridesRoutes);
// Users & auth related endpoints
app.use('/api', usersRoutes);
// Feedback endpoints
app.use('/api/feedback', feedbackRoutes);

// Ensure DB file exists at startup
const dbFile = path.join(__dirname, 'db', 'mock.json');
if (!fs.existsSync(dbFile)) {
  fs.writeFileSync(
    dbFile,
    JSON.stringify({ rides: [], users: [] }, null, 2),
    'utf-8'
  );
}

// Error handler should be last
app.use(errorHandler);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`RickShare API listening on http://localhost:${PORT}`);
});
