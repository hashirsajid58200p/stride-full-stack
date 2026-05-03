const express = require('express');
const router = express.Router();
const { vectorSearch, syncProductEmbedding } = require('../controllers/productController');

router.post('/search-semantic', vectorSearch);
router.post('/sync-embedding/:id', syncProductEmbedding);

module.exports = router;
