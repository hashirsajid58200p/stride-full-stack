const express = require('express');
const router = express.Router();
const { vectorSearch } = require('../controllers/productController');

router.post('/search-semantic', vectorSearch);

module.exports = router;
