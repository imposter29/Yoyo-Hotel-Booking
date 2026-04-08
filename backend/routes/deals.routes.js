const express = require('express');
const router = express.Router();
const {
  getDeals,
  getDeal,
  createDeal,
  updateDeal,
  deleteDeal,
} = require('../controllers/dealsController');
const { protect, authorize } = require('../middleware/auth');

// Public
router.get('/', getDeals);
router.get('/:id', getDeal);

// Admin only
router.post('/', protect, authorize('superadmin'), createDeal);
router.patch('/:id', protect, authorize('superadmin'), updateDeal);
router.delete('/:id', protect, authorize('superadmin'), deleteDeal);

module.exports = router;
