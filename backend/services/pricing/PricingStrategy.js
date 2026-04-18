/**
 *  PricingStrategy — Abstract Base Class (Interface Simulation) 
 *
 * In JavaScript we simulate interfaces via an abstract base class.
 * All concrete pricing strategies MUST extend this class and implement:
 *   - apply(context)  → returns a numeric multiplier (e.g. 1.4 = +40%)
 *   - getName()       → human-readable strategy name
 *   - getPriority()   → numeric priority (higher = applied first)
 *
 * OOP Principles demonstrated:
 *   - Abstraction    : callers work against this interface, not concrete classes
 *   - Polymorphism   : engine calls .apply() on any strategy; each behaves differently
 *   - Encapsulation  : conditions/config are private to each subclass
 *   - Inheritance    : SeasonalPricing, DemandPricing, etc. extend this base
 */
class PricingStrategy {
  constructor(rule) {
    if (new.target === PricingStrategy) {
      throw new Error('PricingStrategy is abstract and cannot be instantiated directly.');
    }
    this.rule = rule; // The DB PricingRule document
  }

  /**
   * Compute and return the multiplier to apply to the base price.
   * @param {PricingContext} context
   * @returns {number} multiplier (1 = no change, 1.2 = +20%, 0.9 = -10%)
   */
  apply(context) { // eslint-disable-line no-unused-vars
    throw new Error(`${this.constructor.name} must implement apply(context).`);
  }

  /** @returns {string} */
  getName() {
    return this.rule.name || this.constructor.name;
  }

  /** @returns {number} */
  getPriority() {
    return this.rule.priority ?? 0;
  }
}

//  Concrete Strategy: Seasonal Pricing 
/**
 * Applies a multiplier when the check-in date falls within a defined season.
 * E.g. Christmas peak → ×1.4
 */
class SeasonalPricing extends PricingStrategy {
  apply(context) {
    const { startDate, endDate } = this.rule.conditions;
    if (!startDate || !endDate) return 1;
    const checkIn = context.checkIn;
    if (checkIn >= new Date(startDate) && checkIn <= new Date(endDate)) {
      return this.rule.multiplier;
    }
    return 1;
  }
}

//  Concrete Strategy: Demand-Based Pricing 
/**
 * Applies a multiplier when the demand index (booking velocity) exceeds a threshold.
 * E.g. high search volume → ×1.2
 */
class DemandPricing extends PricingStrategy {
  apply(context) {
    const { minDemandIndex = 0 } = this.rule.conditions;
    return context.demandIndex >= minDemandIndex ? this.rule.multiplier : 1;
  }
}

//  Concrete Strategy: Occupancy-Based Pricing 
/**
 * Applies a multiplier when room occupancy exceeds a threshold.
 * E.g. >80% booked → ×1.3 (scarcity premium)
 */
class OccupancyPricing extends PricingStrategy {
  apply(context) {
    const { minOccupancyPercent = 0 } = this.rule.conditions;
    return context.occupancyPercent >= minOccupancyPercent ? this.rule.multiplier : 1;
  }
}

//  Concrete Strategy: Length-of-Stay Discount 
/**
 * Applies a discount multiplier for longer stays.
 * E.g. stays ≥7 nights → ×0.9 (10% off)
 */
class LengthOfStayDiscount extends PricingStrategy {
  apply(context) {
    const { minNights = 1 } = this.rule.conditions;
    return context.nights >= minNights ? this.rule.multiplier : 1;
  }
}

//  Concrete Strategy: Early Bird Discount 
/**
 * Applies a discount when the booking is made far in advance.
 * E.g. booked ≥30 days before check-in → ×0.85
 */
class EarlyBirdPricing extends PricingStrategy {
  apply(context) {
    const { minDaysBeforeCheckin = 0 } = this.rule.conditions;
    return context.daysBeforeCheckin >= minDaysBeforeCheckin ? this.rule.multiplier : 1;
  }
}

//  Concrete Strategy: Last-Minute Pricing 
/**
 * Applies a multiplier (or discount) for last-minute bookings.
 * E.g. booking within 3 days of check-in → ×0.8 (fill empty rooms)
 */
class LastMinutePricing extends PricingStrategy {
  apply(context) {
    const { maxDaysBeforeCheckin = 7 } = this.rule.conditions;
    return context.daysBeforeCheckin <= maxDaysBeforeCheckin ? this.rule.multiplier : 1;
  }
}

module.exports = {
  PricingStrategy,
  SeasonalPricing,
  DemandPricing,
  OccupancyPricing,
  LengthOfStayDiscount,
  EarlyBirdPricing,
  LastMinutePricing,
};
