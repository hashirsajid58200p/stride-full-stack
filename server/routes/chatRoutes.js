// server/routes/chatRoutes.js
const express = require("express");
const router = express.Router();
const { handleChat } = require("../controllers/chatController");

// This creates the POST endpoint
router.post("/ask", handleChat);

module.exports = router;
