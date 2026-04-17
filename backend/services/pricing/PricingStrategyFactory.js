/**
 * ─── PricingStrategyFactory ────────────────────────────────────────────────────
 *
 * Design Pattern: Factory
 * Responsibility: Given a DB PricingRule document, instantiate and return
 * the correct concrete PricingStrategy subclass.
 *
 * This decouples the engine from knowing which class maps to which ruleType string.
 * To add a new strategy: add the class to PricingStrategy.js, then register it here.
 */
const {
  SeasonalPricing,
  DemandPricing,
  OccupancyPricing,
  LengthOfStayDiscount,
  EarlyBirdPricing,
  LastMinutePricing,
} = require('./PricingStrategy');

const STRATEGY_MAP = {
  seasonal:       SeasonalPricing,
  demand:         DemandPricing,
  occupancy:      OccupancyPricing,
  length_of_stay: LengthOfStayDiscount,
  early_bird:     EarlyBirdPricing,
  last_minute:    LastMinutePricing,
};

class PricingStrategyFactory {
  /**
   * Create a concrete PricingStrategy instance from a PricingRule document.
   * @param {Object} rule - Mongoose PricingRule document
   * @returns {PricingStrategy} Concrete strategy instance
   * @throws {Error} If ruleType has no registered strategy
   */
  static create(rule) {
    const StrategyClass = STRATEGY_MAP[rule.ruleType];
    if (!StrategyClass) {
      throw new Error(`No PricingStrategy registered for ruleType: "${rule.ruleType}"`);
    }
    return new StrategyClass(rule);
  }

  /** @returns {string[]} All supported ruleType keys */
  static getSupportedTypes() {
    return Object.keys(STRATEGY_MAP);
  }
}

module.exports = PricingStrategyFactory;
