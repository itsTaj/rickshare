/**
 * Error Handler Middleware (server/src/middleware/errorHandler.js)
 * Purpose: Centralized error handling for the API.
 */

function errorHandler(err, req, res, next) {
  // eslint-disable-next-line no-console
  console.error(err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({ message: 'Internal Server Error' });
}

module.exports = errorHandler;
