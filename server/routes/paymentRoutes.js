// server/routes/paymentRoutes.js
const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");

// Create checkout session with server-side price validation
router.post(
  "/create-checkout-session",
  paymentController.createCheckoutSession
);

// Get authoritative order / session confirmation status
router.get(
  "/session/:sessionId",
  paymentController.getSessionStatus
);

// Stripe webhook (also mounted with raw body in server.js)
router.post(
  "/webhook",
  paymentController.handleStripeWebhook
);

module.exports = router;
