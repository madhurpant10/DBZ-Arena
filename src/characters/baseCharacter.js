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
 * Creates a character config by merging overrides with base
 * @param {Object} overrides - Character-specific values
 * @returns {Object} Complete character configuration
 */
export function createCharacter(overrides) {
  return {
    ...BASE_CHARACTER,
    ...overrides,
  };
}

export default BASE_CHARACTER;
