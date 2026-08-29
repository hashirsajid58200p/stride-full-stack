// server/utils/safeError.js

/**
 * Utility helper to safely log internal errors server-side without leaking
 * stack traces, database schema fragments, or library details to the client.
 */
function sendError(res, status, publicMessage, err = null) {
  if (err) {
    console.error(`[Server SafeError - ${status}] ${publicMessage}:`, err.message || err);
    if (err.stack && process.env.NODE_ENV !== "production") {
      console.error(err.stack);
    }
  }
  return res.status(status).json({ error: publicMessage });
}

module.exports = { sendError };
