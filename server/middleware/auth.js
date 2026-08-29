// server/middleware/auth.js
const admin = require("../config/firebaseAdmin");

/**
 * Middleware: Requires a valid Firebase ID Token in Authorization: Bearer <token>
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Authentication token is required" });
  }

  try {
    if (!admin || !admin.apps || admin.apps.length === 0) {
      throw new Error("Firebase Admin SDK is not initialized.");
    }
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (err) {
    console.error("[Auth Middleware Error]:", err.message);
    return res.status(401).json({ error: "Invalid or expired authentication token" });
  }
}

/**
 * Middleware: Requires the authenticated user to possess role === 'admin' in Custom Claims
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin authorization required for this action" });
  }
  next();
}

/**
 * Optional Auth Middleware: Attaches req.user if a valid token is sent, but allows guests to proceed
 */
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (token) {
    try {
      if (admin && admin.apps && admin.apps.length > 0) {
        req.user = await admin.auth().verifyIdToken(token);
      }
    } catch (err) {
      // Ignore token verification error for guest sessions
      req.user = null;
    }
  }
  next();
}

module.exports = { requireAuth, requireAdmin, optionalAuth };
