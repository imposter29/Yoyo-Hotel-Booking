const express = require('express');
const router = express.Router();
const {
  getAnalytics,
  getAllUsers,
  getUserById,
  updateUser,
  getAllBookings,
  updateBookingStatus,
  getAdminHotels,
  getAdminReviews,
  updateHotelRooms,
  createAdminHotel,
  approveHotel,
  rejectHotel,
  getPendingHotels,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

// All admin routes are protected
router.use(protect);
router.use(authorize('hotel_admin', 'superadmin'));

// ─── Analytics (superadmin only) ──────────────────────────────────────────────
router.get('/analytics', authorize('superadmin'), getAnalytics);

// ─── Users (superadmin only) ──────────────────────────────────────────────────
router.get('/users', authorize('superadmin'), getAllUsers);
router.get('/users/:id', authorize('superadmin'), getUserById);
router.patch('/users/:id', authorize('superadmin'), updateUser);

// ─── Hotels ──────────────────────────────────────────────────────────────────
router.get('/hotels',                                          getAdminHotels);
router.get('/hotels/pending',    authorize('superadmin'),      getPendingHotels);
router.post('/hotels',           authorize('superadmin'),      createAdminHotel);
router.patch('/hotels/:hotelId/rooms',   authorize('superadmin'), updateHotelRooms);
router.patch('/hotels/:hotelId/approve', authorize('superadmin'), approveHotel);
router.patch('/hotels/:hotelId/reject',  authorize('superadmin'), rejectHotel);

// ─── Bookings ─────────────────────────────────────────────────────────────────
router.get('/bookings', getAllBookings);
router.patch('/bookings/:id/status', updateBookingStatus);

// ─── Reviews (superadmin only) ────────────────────────────────────────────────
router.get('/reviews', authorize('superadmin'), getAdminReviews);

module.exports = router;
