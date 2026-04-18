const mongoose = require('mongoose');

const roomTypeSchema = new mongoose.Schema(
  {
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hotel',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Room type name is required'],
      trim: true,
      maxlength: [80, 'Room type name cannot exceed 80 characters'],
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    maxOccupancy: {
      type: Number,
      required: true,
      min: [1, 'At least 1 occupant required'],
    },
    baseRatePerNight: {
      type: Number,
      required: true,
      min: [0, 'Base rate must be non-negative'],
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      maxlength: 3,
    },
    amenities: [String], // room-specific: ['AC', 'minibar', 'balcony', 'bathtub']
    bedConfiguration: {
      // e.g. [{ type: 'king', count: 1 }, { type: 'sofa', count: 1 }]
      type: [
        {
          bedType: { type: String, enum: ['single', 'double', 'queen', 'king', 'sofa', 'bunk'] },
          count: { type: Number, min: 1 },
        },
      ],
      default: [],
    },
    images: [
      {
        url: String,
        caption: String,
      },
    ],
    cancellationPolicy: {
      freeCancellationHours: { type: Number, default: 24 },
      // tiered penalties: array of { hoursBeforeCheckin, refundPercent }
      tiers: [
        {
          hoursBeforeCheckin: Number,
          refundPercent: Number,
        },
      ],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

//  Virtual: individual rooms of this type 
roomTypeSchema.virtual('rooms', {
  ref: 'Room',
  localField: '_id',
  foreignField: 'roomType',
});

roomTypeSchema.index({ hotel: 1, isActive: 1 });

module.exports = mongoose.model('RoomType', roomTypeSchema);
