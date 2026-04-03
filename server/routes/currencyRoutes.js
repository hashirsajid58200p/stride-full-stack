// server/routes/currencyRoutes.js
const express = require("express");
const router = express.Router();
const currencyController = require("../controllers/currencyController");

// Handles GET requests to /api/currency
router.get("/", currencyController.getExchangeRate);

module.exports = router;
