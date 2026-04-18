const mongoose = require('mongoose');

const hotelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Hotel name is required'],
      trim: true,
      maxlength: [100, 'Hotel name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    address: {
      street: { type: String, default: '' },
      city: { type: String, required: true },
      state: String,
      country: { type: String, required: true },
      postalCode: String,
    },
    location: {
      // GeoJSON for proximity searches
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        index: '2dsphere',
      },
    },
    starRating: {
      type: Number,
      min: [1, 'Star rating must be at least 1'],
      max: [5, 'Star rating cannot exceed 5'],
      required: true,
    },
    contactEmail: {
      type: String,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    contactPhone: String,
    images: [
      {
        url: String,
        caption: String,
        isPrimary: { type: Boolean, default: false },
      },
    ],
    amenities: [String], // e.g. ['wifi', 'pool', 'gym', 'parking']
    policies: {
      checkInTime: { type: String, default: '14:00' },
      checkOutTime: { type: String, default: '11:00' },
      petFriendly: { type: Boolean, default: false },
      smokingAllowed: { type: Boolean, default: false },
    },
    isActive: {
      type: Boolean,
      default: false,   // only true after superadmin approves
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    // Hotel owner/admin user
    managedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    averageRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

//  Virtual: rooms (populated separately) 
hotelSchema.virtual('rooms', {
  ref: 'Room',
  localField: '_id',
  foreignField: 'hotel',
});

hotelSchema.virtual('roomTypes', {
  ref: 'RoomType',
  localField: '_id',
  foreignField: 'hotel',
});

//  Pre-save: auto-generate slug 
hotelSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }
  next();
});

//  Index for geo queries 
hotelSchema.index({ 'address.city': 1, isActive: 1 });
hotelSchema.index({ starRating: 1 });

module.exports = mongoose.model('Hotel', hotelSchema);
