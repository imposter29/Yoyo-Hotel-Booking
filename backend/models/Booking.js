const mongoose = require('mongoose');

/**
 * Booking state machine:
 *  HOLD → CONFIRMED → CHECKED_IN → CHECKED_OUT
 *       ↘ CANCELLED
 *       ↘ EXPIRED (hold TTL exceeded)
 */
const BOOKING_STATUSES = ['hold', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'expired'];

const bookingItemSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    roomType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RoomType',
      required: true,
    },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    nights: { type: Number, required: true, min: 1 },
    basePricePerNight: { type: Number, required: true },
    finalPricePerNight: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    // Audit trail of how price was computed
    pricingBreakdown: {
      seasonMultiplier: { type: Number, default: 1 },
      demandMultiplier: { type: Number, default: 1 },
      occupancyMultiplier: { type: Number, default: 1 },
      lengthOfStayDiscount: { type: Number, default: 1 },
      appliedRules: [String],
    },
  },
  { _id: true }
);

const bookingSchema = new mongoose.Schema(
  {
    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hotel',
      required: true,
    },
    items: {
      type: [bookingItemSchema],
      validate: [(v) => v.length > 0, 'A booking must have at least one item'],
    },
    status: {
      type: String,
      enum: BOOKING_STATUSES,
      default: 'hold',
    },
    checkIn: {
      type: Date,
      required: true,
    },
    checkOut: {
      type: Date,
      required: true,
    },
    totalNights: {
      type: Number,
      required: true,
      min: 1,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
    },
    refundAmount: {
      type: Number,
      default: 0,
    },
    // Hold expires 15 minutes after creation
    holdExpiresAt: {
      type: Date,
    },
    // Special guest requests
    guestRequests: {
      type: String,
      maxlength: 500,
    },
    // Number of guests
    guestCount: {
      type: Number,
      default: 1,
      min: 1,
    },
    // Timestamp tracking
    confirmedAt: Date,
    checkedInAt: Date,
    checkedOutAt: Date,
    cancelledAt: Date,
    cancellationReason: String,
    // Soft reference to payment
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Virtual: booking reference number ────────────────────────────────────────
bookingSchema.virtual('referenceNumber').get(function () {
  return `YY-${this._id.toString().slice(-8).toUpperCase()}`;
});

// ─── Pre-save: compute derived fields ────────────────────────────────────────
bookingSchema.pre('save', function (next) {
  if (this.isNew && this.status === 'hold') {
    this.holdExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // +15 minutes
  }
  if (this.checkIn && this.checkOut) {
    const msPerDay = 1000 * 60 * 60 * 24;
    this.totalNights = Math.round((this.checkOut - this.checkIn) / msPerDay);
  }
  next();
});

// ─── Method: state machine transitions ────────────────────────────────────────
const VALID_TRANSITIONS = {
  hold: ['confirmed', 'cancelled', 'expired'],
  confirmed: ['checked_in', 'cancelled'],
  checked_in: ['checked_out'],
  checked_out: [],
  cancelled: [],
  expired: [],
};

bookingSchema.methods.transitionTo = function (newStatus) {
  const allowed = VALID_TRANSITIONS[this.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new Error(`Cannot transition booking from '${this.status}' to '${newStatus}'`);
  }
  this.status = newStatus;
  if (newStatus === 'confirmed') this.confirmedAt = new Date();
  if (newStatus === 'checked_in') this.checkedInAt = new Date();
  if (newStatus === 'checked_out') this.checkedOutAt = new Date();
  if (newStatus === 'cancelled') this.cancelledAt = new Date();
};

// ─── Indexes ──────────────────────────────────────────────────────────────────
bookingSchema.index({ guest: 1, status: 1 });
bookingSchema.index({ hotel: 1, status: 1 });
bookingSchema.index({ holdExpiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL auto-delete

module.exports = mongoose.model('Booking', bookingSchema);
