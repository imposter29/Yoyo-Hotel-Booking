const express = require('express');
const router = express.Router();
const {
  createRoomType,
  getRoomTypes,
  getRoomType,
  updateRoomType,
  deleteRoomType,
  getRoomsForType,
  addRoom,
} = require('../controllers/roomTypeController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createRoomTypeSchema,
  updateRoomTypeSchema,
} = require('../validators/hotel.validator');

// Public
router.get('/', getRoomTypes);
router.get('/:id', getRoomType);

// Protected — admin only
router.use(protect, authorize('hotel_admin', 'superadmin'));
router.post('/', validate(createRoomTypeSchema), createRoomType);
router.patch('/:id', validate(updateRoomTypeSchema), updateRoomType);
router.delete('/:id', deleteRoomType);

// Room management under a room type
router.get('/:id/rooms', getRoomsForType);
router.post('/:id/rooms', addRoom);

module.exports = router;
