const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hotel',
      required: true,
    },
    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: false,   // optional — omit for unverified reviews
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    title: {
      type: String,
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    comment: {
      type: String,
      required: [true, 'Review comment is required'],
      trim: true,
      minlength: [10, 'Comment must be at least 10 characters'],
      maxlength: [2000, 'Comment cannot exceed 2000 characters'],
    },
    // Sub-ratings per category
    categories: {
      cleanliness: { type: Number, min: 1, max: 5 },
      service: { type: Number, min: 1, max: 5 },
      location: { type: Number, min: 1, max: 5 },
      value: { type: Number, min: 1, max: 5 },
    },
    isVerifiedStay: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

//  One review per guest per hotel 
reviewSchema.index({ hotel: 1, guest: 1 }, { unique: true });
reviewSchema.index({ hotel: 1, createdAt: -1 });

//  Post-save: recalculate hotel averageRating 
async function recalcHotelRating(hotelId) {
  const Hotel = mongoose.model('Hotel');
  const result = await mongoose.model('Review').aggregate([
    { $match: { hotel: hotelId } },
    {
      $group: {
        _id: '$hotel',
        avg: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);
  if (result.length > 0) {
    await Hotel.findByIdAndUpdate(hotelId, {
      averageRating: Math.round(result[0].avg * 10) / 10,
      reviewCount: result[0].count,
    });
  }
}

reviewSchema.post('save', async function () {
  await recalcHotelRating(this.hotel);
});

reviewSchema.post('findOneAndDelete', async function (doc) {
  if (doc) await recalcHotelRating(doc.hotel);
});

module.exports = mongoose.model('Review', reviewSchema);
