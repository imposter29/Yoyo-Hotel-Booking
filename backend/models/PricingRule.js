const mongoose = require('mongoose');

const pricingRuleSchema = new mongoose.Schema(
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
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // rule type maps to a strategy class in the pricing engine
    ruleType: {
      type: String,
      enum: ['seasonal', 'demand', 'occupancy', 'length_of_stay', 'early_bird', 'last_minute'],
      required: true,
    },
    multiplier: {
      type: Number,
      required: true,
      min: [0.01, 'Multiplier must be positive'],
    },
    // Higher priority rules are applied first
    priority: {
      type: Number,
      default: 0,
    },
    // Flexible conditions for strategy evaluation
    conditions: {
      // For 'seasonal': date range
      startDate: Date,
      endDate: Date,
      // For 'demand': minimum demand index threshold
      minDemandIndex: Number,
      // For 'occupancy': minimum occupancy percentage
      minOccupancyPercent: Number,
      // For 'length_of_stay': minimum nights
      minNights: Number,
      // For 'last_minute': max days before check-in
      maxDaysBeforeCheckin: Number,
      // For 'early_bird': min days before check-in
      minDaysBeforeCheckin: Number,
    },
    effectiveFrom: Date,
    effectiveTo: Date,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

pricingRuleSchema.index({ roomType: 1, isActive: 1, priority: -1 });
pricingRuleSchema.index({ hotel: 1, ruleType: 1 });

module.exports = mongoose.model('PricingRule', pricingRuleSchema);
