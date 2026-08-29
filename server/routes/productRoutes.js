const express = require('express');
const router = express.Router();
const { vectorSearch, syncProductEmbedding } = require('../controllers/productController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Public semantic search
router.post('/search-semantic', vectorSearch);

// Admin-only embedding regeneration
router.post('/sync-embedding/:id', requireAuth, requireAdmin, syncProductEmbedding);

module.exports = router;
