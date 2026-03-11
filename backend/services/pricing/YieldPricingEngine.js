const PricingRule = require('../../models/PricingRule');
const InventoryCalendar = require('../../models/InventoryCalendar');
const RoomType = require('../../models/RoomType');

/**
 * ─── Strategy Implementations ─────────────────────────────────────────────────
 * Each strategy is a function: (basePrice, context) => multiplier
 */

const strategies = {
  seasonal: (rule, context) => {
    const { startDate, endDate } = rule.conditions;
    if (!startDate || !endDate) return 1;
    const checkIn = context.checkIn;
    if (checkIn >= new Date(startDate) && checkIn <= new Date(endDate)) {
      return rule.multiplier;
    }
    return 1;
  },

  demand: (rule, context) => {
    const { minDemandIndex } = rule.conditions;
    if (context.demandIndex >= (minDemandIndex ?? 0)) return rule.multiplier;
    return 1;
  },

  occupancy: (rule, context) => {
    const { minOccupancyPercent } = rule.conditions;
    if (context.occupancyPercent >= (minOccupancyPercent ?? 0)) return rule.multiplier;
    return 1;
  },

  length_of_stay: (rule, context) => {
    const { minNights } = rule.conditions;
    if (context.nights >= (minNights ?? 1)) return rule.multiplier;
    return 1;
  },

  early_bird: (rule, context) => {
    const { minDaysBeforeCheckin } = rule.conditions;
    if (context.daysBeforeCheckin >= (minDaysBeforeCheckin ?? 0)) return rule.multiplier;
    return 1;
  },

  last_minute: (rule, context) => {
    const { maxDaysBeforeCheckin } = rule.conditions;
    if (context.daysBeforeCheckin <= (maxDaysBeforeCheckin ?? 7)) return rule.multiplier;
    return 1;
  },
};

/**
 * computePrice — runs all active pricing rules for a room type and date range.
 *
 * @param {string} roomTypeId
 * @param {Date} checkIn
 * @param {Date} checkOut
 * @returns {PricingResult}
 */
async function computePrice(roomTypeId, checkIn, checkOut) {
  const roomType = await RoomType.findById(roomTypeId);
  if (!roomType) throw new Error('Room type not found');

  const nights = Math.round((checkOut - checkIn) / (1000 * 60 * 60 * 24));
  const baseRate = roomType.baseRatePerNight;

  // Load active rules sorted by priority (descending)
  const rules = await PricingRule.find({
    roomType: roomTypeId,
    isActive: true,
    $or: [
      { effectiveFrom: { $lte: checkIn }, effectiveTo: { $gte: checkIn } },
      { effectiveFrom: null, effectiveTo: null },
    ],
  }).sort({ priority: -1 });

  // Load demand/occupancy context from inventory calendar (use checkIn day)
  const inventory = await InventoryCalendar.findOne({
    roomType: roomTypeId,
    date: checkIn,
  });

  const occupancyPercent = inventory
    ? ((inventory.bookedCount + inventory.heldCount) / inventory.totalRooms) * 100
    : 0;
  const demandIndex = inventory?.demandIndex ?? 0;
  const daysBeforeCheckin = Math.round((checkIn - new Date()) / (1000 * 60 * 60 * 24));

  const context = {
    checkIn,
    checkOut,
    nights,
    demandIndex,
    occupancyPercent,
    daysBeforeCheckin,
  };

  // Apply strategies
  const appliedRules = [];
  let cumulativeMultiplier = 1;

  for (const rule of rules) {
    const strategyFn = strategies[rule.ruleType];
    if (!strategyFn) continue;
    const multiplier = strategyFn(rule, context);
    if (multiplier !== 1) {
      cumulativeMultiplier *= multiplier;
      appliedRules.push(`${rule.name} (×${multiplier})`);
    }
  }

  const pricePerNight = +(baseRate * cumulativeMultiplier).toFixed(2);
  const totalPrice = +(pricePerNight * nights).toFixed(2);

  return {
    baseRate,
    pricePerNight,
    totalPrice,
    nights,
    appliedRules,
    breakdown: {
      cumulativeMultiplier,
      appliedRules,
    },
  };
}

module.exports = { computePrice };
