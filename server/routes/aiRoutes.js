const express = require("express");
const router = express.Router();
const aiController = require("../controllers/aiController");
const { requireAuth, requireAdmin } = require("../middleware/auth");

// Authenticated user order tracking
router.post("/track-order", requireAuth, aiController.getSmartTrackingUpdate);

// Admin-only AI product image generation
router.post("/generate-product-image", requireAuth, requireAdmin, aiController.generateProductImage);

module.exports = router;
