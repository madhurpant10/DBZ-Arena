/**
 * Game balance constants
 * All gameplay tuning values that affect game feel and balance
 */

/**
 * Player states for state machine
 * These define what actions are available and how physics behaves
 */
export const PLAYER_STATES = {
  GROUNDED: 'GROUNDED', // On the ground, can walk/jump/attack
  AIRBORNE: 'AIRBORNE', // In the air from jumping, subject to full gravity
  FLYING: 'FLYING', // Controlled flight mode, reduced gravity, consumes stamina
  CHARGING: 'CHARGING', // Charging Ki, reduced movement, cannot attack
  STUNNED: 'STUNNED', // In hitstun, cannot act
  DEAD: 'DEAD', // KO'd, awaiting respawn or game over
};

/**
 * Player stats
 */
export const PLAYER_STATS = {
  maxHealth: 100,
  // Stamina - used for attacks, flight, and special moves (auto-regenerates)
  maxStamina: 100,
  staminaRegenRate: 0.08, // Stamina per frame (normalized to 60fps) - slow regen, ~20 sec to full
  staminaRegenDelay: 500, // Milliseconds after using stamina before regen starts
  staminaRegenRateAir: 0.05, // Slower regen while airborne
};

/**
 * Ki / Power Gauge system
 * Ki is built up through combat and used for transformations
 * Does NOT auto-regenerate - must be earned through combat or charging
 */
export const KI_SYSTEM = {
  maxKi: 100,

  // Ki gain from combat (reduced ~5x for slower buildup)
  kiGainOnHit: 1, // Ki gained when landing a melee attack (was 5)
  kiGainOnDamage: 1.5, // Ki gained when taking damage - comeback mechanic (was 8)
  kiGainOnProjectileHit: 0.6, // Ki gained when projectile lands (was 3)

  // Charging mechanic - rewards sustained holding, punishes tap-spamming
  chargeRateBase: 0.03, // Starting Ki gain per frame (very slow at first)
  chargeRateMax: 0.25, // Maximum Ki gain per frame after full ramp-up
  chargeRampTime: 3000, // Milliseconds to reach full charge rate (3 seconds of holding)
  chargeMovementPenalty: 0.3, // Movement speed multiplier while charging (30% speed)

  // Transformation thresholds (percentage of maxKi)
  partialPowerThreshold: 50, // 50% Ki - enables partial power-up (aura, minor buffs)
  transformationThreshold: 100, // 100% Ki - full transformation available

  // Transformation timeout - player must use it or lose it
  transformationTimeout: 20000, // Milliseconds before Ki resets if transformation not used (20 sec)

  // Transformation duration (how long the power-up lasts once activated)
  transformationDuration: 15000, // 15 seconds of powered-up state
};

/**
 * Transformation stat bonuses
 * Applied when player activates transformation at 100% Ki
 */
export const TRANSFORMATION_BONUSES = {
  // Damage boost - attacks hit harder
  damageMultiplier: 1.25, // 25% more damage

  // Defense boost - take less damage
  defenseMultiplier: 0.85, // Take 15% less damage (multiplied to incoming damage)

  // Health bonus - gain extra max health during transformation
  maxHealthBonus: 20, // +20 max health (and heal that amount on transform)

  // Stamina bonus - more stamina pool and faster regen
  maxStaminaBonus: 20, // +20 max stamina
  staminaRegenMultiplier: 1.3, // 30% faster stamina regen

  // Speed boost - faster movement
  speedMultiplier: 1.1, // 10% faster movement speed

  // Flight efficiency - fly longer
  flightDrainMultiplier: 0.75, // 25% less stamina drain while flying
};

/**
 * Combat balance
 */
export const COMBAT = {
  // Basic attack
  basicAttackDamage: 10,
  basicAttackCooldown: 250, // Milliseconds between attacks (faster combat)
  basicAttackStaminaCost: 8, // Stamina cost per attack - prevents spamming
  // Knockback scaling (damage multiplier for knockback)
  knockbackScaling: 0.01,
  // Invincibility frames after being hit
  invincibilityDuration: 200, // Milliseconds
};

/**
 * Projectile balance
 */
export const PROJECTILE = {
  damage: 10,
  staminaCost: 8, // Stamina cost per projectile - same as basic attack
  cooldown: 250, // Milliseconds (faster to match attack cooldown)
};

/**
 * Round/Match settings
 */
export const MATCH = {
  roundTime: 99, // Seconds (0 = infinite)
  roundsToWin: 2,
  respawnDelay: 2000, // Milliseconds after KO before respawn
};

/**
 * Arena settings
 */
export const ARENA = {
  width: 1280,
  height: 720,
  groundHeight: 100, // Height of ground platform
  spawnPoints: {
    player1: { x: 300, y: 500 },
    player2: { x: 980, y: 500 },
  },
  deathZone: {
    // Y position below which players die
    bottom: 800,
  },
};

/**
 * Flight system balance
 */
export const FLIGHT = {
  // Stamina consumption
  // 0.083 allows ~20 seconds of flight from full stamina (100 / 20 / 60 ≈ 0.083)
  staminaDrainRate: 0.083, // Stamina per frame while flying (normalized to 60fps)
  minStaminaToFly: 10, // Minimum stamina required to enter flight mode

  // Thrust forces (applied as forces, not velocity overrides)
  // These need to be strong enough to overcome gravity (1.0)
  thrustForce: 0.008, // Horizontal thrust force
  verticalThrustUp: 0.010, // Upward thrust (fight reduced gravity)
  verticalThrustDown: 0.012, // Downward thrust (stronger for active descent control)

  // Velocity limits during flight
  maxFlightVelocityX: 8, // Horizontal speed cap while flying
  maxFlightVelocityY: 8, // Vertical speed cap while flying

  // Gravity counterforce - applied constantly to create floaty feel
  // This counteracts most of gravity so player hovers when not pressing anything
  gravityCounterForce: 0.0010, // Counteracts gravity for floaty hover

  // State transition thresholds
  knockbackExitThreshold: 8, // Velocity magnitude that forces exit from flight
};

/**
 * UI settings
 */
export const UI = {
  healthBarWidth: 300,
  healthBarHeight: 25,
  staminaBarWidth: 200,
  staminaBarHeight: 12,
  kiBarWidth: 200,
  kiBarHeight: 12,
  hudPadding: 20,
};
