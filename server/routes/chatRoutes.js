// server/routes/chatRoutes.js
const express = require("express");
const router = express.Router();
const { handleChat } = require("../controllers/chatController");
const { optionalAuth } = require("../middleware/auth");

// Chat endpoint (attaches verified req.user if present, supports guest Q&A safely)
router.post("/ask", optionalAuth, handleChat);

module.exports = router;
