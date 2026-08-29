const express = require("express");
const router = express.Router();
const aiController = require("../controllers/aiController");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { chatLimiter, aiImageLimiter } = require("../middleware/rateLimiters");

// Authenticated user order tracking
router.post("/track-order", chatLimiter, requireAuth, aiController.getSmartTrackingUpdate);

// Admin-only AI product image generation
router.post("/generate-product-image", aiImageLimiter, requireAuth, requireAdmin, aiController.generateProductImage);

module.exports = router;
