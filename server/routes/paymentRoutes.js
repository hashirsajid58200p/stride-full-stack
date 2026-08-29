// server/routes/paymentRoutes.js
const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const { checkoutLimiter } = require("../middleware/rateLimiters");

// Create checkout session with rate limiting and server-side price validation
router.post(
  "/create-checkout-session",
  checkoutLimiter,
  paymentController.createCheckoutSession
);

// Get authoritative order / session confirmation status
router.get(
  "/session/:sessionId",
  paymentController.getSessionStatus
);

// Stripe webhook
router.post(
  "/webhook",
  paymentController.handleStripeWebhook
);

module.exports = router;
