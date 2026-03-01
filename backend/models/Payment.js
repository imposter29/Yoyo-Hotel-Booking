const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      maxlength: 3,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded', 'partially_refunded'],
      default: 'pending',
    },
    // Gateway identifiers (Stripe / Razorpay)
    gatewayProvider: {
      type: String,
      enum: ['stripe', 'razorpay', 'mock'],
      default: 'mock',
    },
    gatewayChargeId: String,
    gatewayOrderId: String,
    paymentMethod: {
      type: String,
      enum: ['card', 'upi', 'netbanking', 'wallet', 'test'],
      default: 'test',
    },
    refundedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    paidAt: Date,
    refundedAt: Date,
    failureReason: String,
    // Raw gateway response for debugging
    gatewayResponse: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({ booking: 1 });
paymentSchema.index({ gatewayChargeId: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
