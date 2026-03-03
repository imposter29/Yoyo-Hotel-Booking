const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hotel',
      required: true,
    },
    roomType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RoomType',
      required: true,
    },
    roomNumber: {
      type: String,
      required: [true, 'Room number is required'],
      trim: true,
    },
    floor: {
      type: Number,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Housekeeping / operational status
    status: {
      type: String,
      enum: ['available', 'occupied', 'maintenance', 'cleaning'],
      default: 'available',
    },
  },
  {
    timestamps: true,
  }
);

// Unique room number per hotel
roomSchema.index({ hotel: 1, roomNumber: 1 }, { unique: true });
roomSchema.index({ hotel: 1, roomType: 1, isActive: 1 });

module.exports = mongoose.model('Room', roomSchema);
