// server/routes/chatRoutes.js
const express = require("express");
const router = express.Router();
const { handleChat } = require("../controllers/chatController");
const { optionalAuth } = require("../middleware/auth");
const { chatLimiter } = require("../middleware/rateLimiters");

// Rate-limited chat endpoint with optional authenticated user context
router.post("/ask", chatLimiter, optionalAuth, handleChat);

module.exports = router;
