const express = require('express');
const router = express.Router();
const { createTest } = require('../controllers/testController');

// POST /api/test
router.post('/', createTest);

module.exports = router;
