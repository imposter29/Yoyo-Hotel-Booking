const mongoose = require('mongoose');

/**
 * InventoryCalendar: one document per RoomType per date.
 * Tracks real-time availability for the yield pricing engine and booking flow.
 */
const inventoryCalendarSchema = new mongoose.Schema(
  {
    roomType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RoomType',
      required: true,
    },
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hotel',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    totalRooms: {
      type: Number,
      required: true,
      min: 0,
    },
    availableCount: {
      type: Number,
      required: true,
      min: 0,
    },
    heldCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    bookedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // demand index 0–1, updated by nightly cron
    demandIndex: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
    },
  },
  {
    timestamps: true,
  }
);

// Unique constraint: one record per roomType per date
inventoryCalendarSchema.index({ roomType: 1, date: 1 }, { unique: true });
inventoryCalendarSchema.index({ hotel: 1, date: 1 });

module.exports = mongoose.model('InventoryCalendar', inventoryCalendarSchema);
