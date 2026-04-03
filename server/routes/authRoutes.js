const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// This defines the POST request to /api/auth/verify
router.post("/verify", authController.verifyToken);

module.exports = router;
