const express = require('express');
const router = express.Router();
const {
  subscribe,
  unsubscribe,
  getSubscribers,
} = require('../controllers/newsletterController');
const { protect, authorize } = require('../middleware/auth');

router.post('/subscribe', subscribe);
router.post('/unsubscribe', unsubscribe);
router.get('/subscribers', protect, authorize('superadmin'), getSubscribers);

module.exports = router;
