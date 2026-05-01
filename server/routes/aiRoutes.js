const express = require("express");
const router = express.Router();
const aiController = require("../controllers/aiController");

router.post("/track-order", aiController.getSmartTrackingUpdate);

module.exports = router;
