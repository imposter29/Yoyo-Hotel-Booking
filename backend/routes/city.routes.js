const express = require('express');
const router = express.Router();
const { getCities, getCityStats } = require('../controllers/cityController');

router.get('/stats', getCityStats);
router.get('/', getCities);

module.exports = router;
