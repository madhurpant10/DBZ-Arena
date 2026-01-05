/**
 * Base Character Configuration Schema
 *
 * This file defines the structure and default values for all character configs.
 * Character files should spread this base and override specific values.
 *
 * ARCHITECTURE NOTES:
 * - Character files contain DATA ONLY, no gameplay logic
 * - All values are multipliers or absolute values that modify base game constants
 * - The Player entity reads these values at construction time
 * - Same character can be selected by both players
 */

/**
 * Base character configuration with all default values
 * Each property is documented with its purpose and valid range
 */
export const BASE_CHARACTER = {
  // ==================== IDENTITY ====================

  /**
   * Unique identifier for the character (used internally)
   * @type {string}
   */
  id: 'base',

  /**
   * Display name shown in UI
   * @type {string}
   */
  name: 'Base Fighter',

  /**
   * Short description for character select
   * @type {string}
   */
  description: 'A balanced fighter',

  // ==================== VISUALS ====================

  /**
   * Primary color for the character box (hex value)
   * @type {number}
   */
  color: 0x888888,

  /**
   * Secondary/accent color for effects
   * @type {number}
   */
  accentColor: 0xaaaaaa,

  // ==================== CORE STATS ====================

  /**
   * Maximum health points
   * Range: 80-150 (100 is baseline)
   * @type {number}
   */
  maxHealth: 100,

  /**
   * Maximum energy/ki points
   * Range: 80-150 (100 is baseline)
   * @type {number}
   */
  maxEnergy: 100,

  // ==================== MOVEMENT ====================

  /**
   * Horizontal movement force multiplier
   * Range: 0.8-1.3 (1.0 is baseline)
   * Higher = faster acceleration
   * @type {number}
   */
  moveSpeedMultiplier: 1.0,

  /**
   * Maximum horizontal velocity multiplier
   * Range: 0.8-1.3 (1.0 is baseline)
   * Higher = faster top speed
   * @type {number}
   */
  maxVelocityMultiplier: 1.0,

  /**
   * Jump velocity multiplier
   * Range: 0.9-1.2 (1.0 is baseline)
   * Higher = higher jumps
   * @type {number}
   */
  jumpPowerMultiplier: 1.0,

  // ==================== FLIGHT ====================

  /**
   * Flight energy drain rate multiplier
   * Range: 0.6-1.5 (1.0 is baseline)
   * Lower = more efficient flight (longer duration)
   * @type {number}
   */
  flightEnergyDrainMultiplier: 1.0,

  /**
   * Flight thrust force multiplier
   * Range: 0.8-1.3 (1.0 is baseline)
   * Higher = more responsive flight controls
   * @type {number}
   */
  flightThrustMultiplier: 1.0,

  /**
   * Flight max velocity multiplier
   * Range: 0.8-1.3 (1.0 is baseline)
   * Higher = faster flight speed
   * @type {number}
   */
  flightMaxVelocityMultiplier: 1.0,

  /**
   * Gravity counter force multiplier during flight
   * Range: 0.8-1.3 (1.0 is baseline)
   * Higher = floatier flight
   * @type {number}
   */
  flightGravityCounterMultiplier: 1.0,

  // ==================== COMBAT ====================

  /**
   * Base attack damage multiplier
   * Range: 0.8-1.3 (1.0 is baseline)
   * Higher = more damage dealt
   * @type {number}
   */
  attackDamageMultiplier: 1.0,

  /**
   * Knockback resistance multiplier
   * Range: 0.7-1.3 (1.0 is baseline)
   * Higher = receives less knockback
   * @type {number}
   */
  knockbackResistanceMultiplier: 1.0,

  /**
   * Attack cooldown multiplier
   * Range: 0.7-1.3 (1.0 is baseline)
   * Lower = faster attack rate
   * @type {number}
   */
  attackCooldownMultiplier: 1.0,

  // ==================== PROJECTILE ====================

  /**
   * Projectile speed multiplier
   * Range: 0.8-1.4 (1.0 is baseline)
   * Higher = faster projectiles
   * @type {number}
   */
  projectileSpeedMultiplier: 1.0,

  /**
   * Projectile lifetime multiplier
   * Range: 0.8-1.5 (1.0 is baseline)
   * Higher = longer range (travels further before despawning)
   * @type {number}
   */
  projectileLifetimeMultiplier: 1.0,

  /**
   * Projectile size multiplier
   * Range: 0.8-1.3 (1.0 is baseline)
   * Higher = larger projectile hitbox
   * @type {number}
   */
  projectileSizeMultiplier: 1.0,

  // ==================== ENERGY ====================

  /**
   * Energy regeneration rate multiplier
   * Range: 0.7-1.5 (1.0 is baseline)
   * Higher = faster energy recovery
   * @type {number}
   */
  energyRegenMultiplier: 1.0,

  /**
   * Energy regen delay multiplier
   * Range: 0.7-1.3 (1.0 is baseline)
   * Lower = shorter delay before regen starts
   * @type {number}
   */
  energyRegenDelayMultiplier: 1.0,

  /**
   * Attack energy cost multiplier
   * Range: 0.5-1.5 (1.0 is baseline)
   * Lower = cheaper attacks (can spam more)
   * @type {number}
   */
  attackEnergyCostMultiplier: 1.0,

  // ==================== DISPLAY STATS (for UI) ====================
  // These are simplified 1-5 star ratings for the character select screen

  /**
   * Speed rating (1-5) for display purposes
   * @type {number}
   */
  displaySpeed: 3,

  /**
   * Power rating (1-5) for display purposes
   * @type {number}
   */
  displayPower: 3,

  /**
   * Durability rating (1-5) for display purposes
   * @type {number}
   */
  displayDurability: 3,

  /**
   * Ki/Energy rating (1-5) for display purposes
   * @type {number}
   */
  displayKi: 3,
};

/**
 * Calculates a display stat (1-5) from multipliers using weighted average
 * @param {Object} values - Object with multiplier values
 * @param {Object} weights - Object with weights for each value (should sum to 1)
 * @param {Object} options - Optional min/max for the scale
 * @returns {number} Display stat from 1-5
 */
function calculateDisplayStat(values, weights, options = {}) {
  const { min = 0.7, max = 1.4 } = options; // Range of multipliers to map to 1-5

  let weightedSum = 0;
  let totalWeight = 0;

  for (const [key, weight] of Object.entries(weights)) {
    if (values[key] !== undefined) {
      weightedSum += values[key] * weight;
      totalWeight += weight;
    }
  }

  // Normalize if weights don't sum to 1
  const average = totalWeight > 0 ? weightedSum / totalWeight : 1.0;

  // Map from multiplier range to 1-5 scale
  // 0.7 -> 1, 1.0 -> 3, 1.4 -> 5 (approximately)
  const normalized = (average - min) / (max - min);
  const rating = Math.round(1 + normalized * 4);

  // Clamp to 1-5
  return Math.max(1, Math.min(5, rating));
}

/**
 * Calculates all display stats from character multipliers
 * @param {Object} char - Character configuration
 * @returns {Object} Display stats object
 */
function calculateDisplayStats(char) {
  // Speed: movement, velocity, flight speed, attack rate (inverted cooldown)
  const displaySpeed = calculateDisplayStat({
    moveSpeed: char.moveSpeedMultiplier,
    maxVelocity: char.maxVelocityMultiplier,
    flightSpeed: char.flightMaxVelocityMultiplier,
    attackRate: 2 - char.attackCooldownMultiplier, // Invert: lower cooldown = higher speed
  }, {
    moveSpeed: 0.3,
    maxVelocity: 0.25,
    flightSpeed: 0.25,
    attackRate: 0.2,
  });

  // Power: attack damage, projectile effectiveness
  const displayPower = calculateDisplayStat({
    damage: char.attackDamageMultiplier,
    projSpeed: char.projectileSpeedMultiplier,
    projSize: char.projectileSizeMultiplier,
  }, {
    damage: 0.5,
    projSpeed: 0.25,
    projSize: 0.25,
  });

  // Durability: health, knockback resistance
  const displayDurability = calculateDisplayStat({
    health: char.maxHealth / 100, // Normalize health to multiplier scale
    knockback: char.knockbackResistanceMultiplier,
  }, {
    health: 0.6,
    knockback: 0.4,
  });

  // Ki: energy pool, regen rate, attack cost efficiency (inverted)
  const displayKi = calculateDisplayStat({
    energy: char.maxEnergy / 100, // Normalize energy to multiplier scale
    regen: char.energyRegenMultiplier,
    efficiency: 2 - char.attackEnergyCostMultiplier, // Invert: lower cost = better Ki
    flightEfficiency: 2 - char.flightEnergyDrainMultiplier, // Invert: lower drain = better
  }, {
    energy: 0.25,
    regen: 0.3,
    efficiency: 0.25,
    flightEfficiency: 0.2,
  });

  return { displaySpeed, displayPower, displayDurability, displayKi };
}

/**
 * Creates a character config by merging overrides with base
 * Display stats are auto-calculated from multipliers
 * @param {Object} overrides - Character-specific values
 * @returns {Object} Complete character configuration
 */
export function createCharacter(overrides) {
  // Merge base with overrides
  const merged = {
    ...BASE_CHARACTER,
    ...overrides,
  };

  // Auto-calculate display stats from actual multipliers
  const calculatedStats = calculateDisplayStats(merged);

  // Use calculated stats, but allow manual override if specified
  return {
    ...merged,
    displaySpeed: overrides.displaySpeed ?? calculatedStats.displaySpeed,
    displayPower: overrides.displayPower ?? calculatedStats.displayPower,
    displayDurability: overrides.displayDurability ?? calculatedStats.displayDurability,
    displayKi: overrides.displayKi ?? calculatedStats.displayKi,
  };
}

export default BASE_CHARACTER;
