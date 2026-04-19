const mongoose = require('mongoose');

const dealSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Deal title is required'],
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    code: {
      type: String,
      required: [true, 'Deal code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: [20, 'Code cannot exceed 20 characters'],
    },
    subtitle: {
      type: String,
      maxlength: [300, 'Subtitle cannot exceed 300 characters'],
    },
    tag: {
      type: String,
      trim: true,
      maxlength: [60, 'Tag cannot exceed 60 characters'],
    },
    type: {
      type: String,
      enum: ['insta_stays', 'weekend', 'early_bird', 'last_minute', 'seasonal', 'custom'],
      default: 'custom',
    },
    discount: {
      type: Number,
      min: [0, 'Discount cannot be negative'],
      max: [100, 'Discount cannot exceed 100%'],
      default: 0,
    },
    cta: {
      type: String,
      default: 'Book Now',
    },
    ctaUrl: {
      type: String,
      default: '/hotels',
    },
    bgColor: {
      type: String,
      default: '#f8f9fa',
    },
    appStoreUrl: { type: String, default: '' },
    playStoreUrl: { type: String, default: '' },
    isActive: {
      type: Boolean,
      default: true,
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiry date is required'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

dealSchema.index({ isActive: 1, expiresAt: 1 });

module.exports = mongoose.model('Deal', dealSchema);
