const express = require('express');
const router = express.Router();
const { vectorSearch, syncProductEmbedding } = require('../controllers/productController');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { semanticSearchLimiter } = require('../middleware/rateLimiters');

// Rate-limited public semantic vector search
router.post('/search-semantic', semanticSearchLimiter, vectorSearch);

// Admin-only embedding regeneration
router.post('/sync-embedding/:id', requireAuth, requireAdmin, syncProductEmbedding);

module.exports = router;
