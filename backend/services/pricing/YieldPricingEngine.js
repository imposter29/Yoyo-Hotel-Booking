const PricingRule = require('../../models/PricingRule');
const InventoryCalendar = require('../../models/InventoryCalendar');
const RoomType = require('../../models/RoomType');
const PricingStrategyFactory = require('./PricingStrategyFactory');

/**
 * ─── PricingContext ────────────────────────────────────────────────────────────
 * Value object passed to every PricingStrategy.apply() call.
 * Encapsulates all runtime data strategies need to make a pricing decision.
 *
 * @typedef {Object} PricingContext
 * @property {Date}   checkIn            - Check-in date
 * @property {Date}   checkOut           - Check-out date
 * @property {number} nights             - Total nights
 * @property {number} demandIndex        - 0–1 booking-velocity index
 * @property {number} occupancyPercent   - % of rooms already booked/held
 * @property {number} daysBeforeCheckin  - Days from now until check-in
 */

/**
 * ─── YieldPricingEngine ───────────────────────────────────────────────────────
 *
 * Design Patterns used:
 *   - Strategy   : each PricingStrategy subclass is interchangeable
 *   - Factory    : PricingStrategyFactory creates the right strategy per rule
 *   - Composition: engine composes an array of loaded strategies
 *
 * OOP Principles:
 *   - Encapsulation  : loadStrategies() is internal; callers only call computePrice()
 *   - Abstraction    : engine applies strategies without knowing their concrete types
 *   - Polymorphism   : strategy.apply(context) is called on objects of different classes
 */
class YieldPricingEngine {
  constructor() {
    /** @type {import('./PricingStrategy').PricingStrategy[]} */
    this.strategies = [];
  }

  /**
   * Load and instantiate all active PricingStrategy instances for a given room type.
   * Uses PricingStrategyFactory to convert DB rules → class instances.
   *
   * @param {string} roomTypeId
   * @param {Date}   checkIn
   */
  async loadStrategies(roomTypeId, checkIn) {
    const rules = await PricingRule.find({
      roomType: roomTypeId,
      isActive: true,
      $or: [
        { effectiveFrom: { $lte: checkIn }, effectiveTo: { $gte: checkIn } },
        { effectiveFrom: null, effectiveTo: null },
      ],
    }).sort({ priority: -1 }); // highest priority applied first

    this.strategies = rules
      .map((rule) => {
        try {
          return PricingStrategyFactory.create(rule);
        } catch {
          // Unknown ruleType — skip gracefully
          return null;
        }
      })
      .filter(Boolean);
  }

  /**
   * Apply all loaded strategies sequentially to the base rate.
   * Each strategy returns a multiplier; they are composed multiplicatively.
   *
   * @param {number}         baseRate
   * @param {PricingContext} context
   * @returns {{ finalMultiplier: number, appliedRules: string[] }}
   */
  applyStrategies(baseRate, context) { // eslint-disable-line no-unused-vars
    let cumulativeMultiplier = 1;
    const appliedRules = [];

    for (const strategy of this.strategies) {
      const multiplier = strategy.apply(context);
      if (multiplier !== 1) {
        cumulativeMultiplier *= multiplier;
        appliedRules.push(`${strategy.getName()} (×${multiplier})`);
      }
    }

    return { finalMultiplier: cumulativeMultiplier, appliedRules };
  }

  /**
   * Main public method — compute the dynamic yield price for a room type and date range.
   *
   * Flow:
   *   1. Load RoomType base rate
   *   2. Fetch inventory context (occupancy %, demand index)
   *   3. Load & instantiate pricing strategies via Factory
   *   4. Apply strategies via polymorphic .apply() calls
   *   5. Return PricingResult with full breakdown
   *
   * @param {string} roomTypeId
   * @param {Date}   checkIn
   * @param {Date}   checkOut
   * @returns {Promise<PricingResult>}
   */
  async computePrice(roomTypeId, checkIn, checkOut) {
    // 1. Load room type
    const roomType = await RoomType.findById(roomTypeId);
    if (!roomType) throw new Error('Room type not found');

    const nights = Math.round((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    const baseRate = roomType.baseRatePerNight;

    // 2. Load inventory context for demand/occupancy strategies
    const inventory = await InventoryCalendar.findOne({
      roomType: roomTypeId,
      date: checkIn,
    });

    const occupancyPercent = inventory
      ? ((inventory.bookedCount + inventory.heldCount) / Math.max(inventory.totalRooms, 1)) * 100
      : 0;
    const demandIndex = inventory?.demandIndex ?? 0;
    const daysBeforeCheckin = Math.round((checkIn - new Date()) / (1000 * 60 * 60 * 24));

    /** @type {PricingContext} */
    const context = {
      checkIn,
      checkOut,
      nights,
      demandIndex,
      occupancyPercent,
      daysBeforeCheckin,
    };

    // 3. Load strategies via Factory (Strategy + Factory patterns)
    await this.loadStrategies(roomTypeId, checkIn);

    // 4. Apply strategies polymorphically
    const { finalMultiplier, appliedRules } = this.applyStrategies(baseRate, context);

    // 5. Compute final price
    const pricePerNight = +(baseRate * finalMultiplier).toFixed(2);
    const totalPrice = +(pricePerNight * nights).toFixed(2);

    return {
      baseRate,
      pricePerNight,
      totalPrice,
      nights,
      appliedRules,
      breakdown: {
        cumulativeMultiplier: +finalMultiplier.toFixed(4),
        occupancyPercent: +occupancyPercent.toFixed(1),
        demandIndex,
        daysBeforeCheckin,
        appliedRules,
        strategiesLoaded: this.strategies.length,
      },
    };
  }
}

// ─── Singleton Export ──────────────────────────────────────────────────────────
// A single engine instance is created per request (stateless between requests).
// bookingController calls: const { computePrice } = require('./YieldPricingEngine')
// to maintain backward-compatible API with the controller.

const engine = new YieldPricingEngine();

/**
 * Backward-compatible functional wrapper so bookingController requires no changes.
 * @param {string} roomTypeId
 * @param {Date}   checkIn
 * @param {Date}   checkOut
 */
async function computePrice(roomTypeId, checkIn, checkOut) {
  // Create a fresh engine per call to avoid cross-request state contamination
  const freshEngine = new YieldPricingEngine();
  return freshEngine.computePrice(roomTypeId, checkIn, checkOut);
}

module.exports = {
  computePrice,        // backward-compat export (used by bookingController)
  YieldPricingEngine,  // class export (for direct OOP use or testing)
};
