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
 * Stamina increased for larger arena - more actions before needing to recover
 */
export const PLAYER_STATS = {
  maxHealth: 100,
  // Stamina - used for attacks, flight, and special moves (auto-regenerates)
  maxStamina: 130, // Increased from 100 for larger arena playability
  staminaRegenRate: 0.10, // Stamina per frame (normalized to 60fps) - slightly faster regen
  staminaRegenDelay: 400, // Milliseconds after using stamina before regen starts (reduced)
  staminaRegenRateAir: 0.07, // Slightly faster air regen for larger arena
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
  // Increased for larger arena - more time to utilize the power-up
  transformationDuration: 25000, // 25 seconds of powered-up state
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
  staminaRegenMultiplier: 1.6, // 60% faster stamina regen

  // Speed boost - faster movement
  speedMultiplier: 1.3, // 30% faster movement speed

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
 * Arena is larger than the viewport to allow for dynamic camera movement
 */
export const ARENA = {
  // Arena dimensions (larger than viewport for expansive combat)
  width: 2560, // 2x viewport width
  height: 1440, // 2x viewport height

  // Ground settings
  groundHeight: 100, // Height of ground platform
  groundY: 1000, // Y position of ground (near bottom of arena)

  // Spawn points (symmetric around arena center x=1280)
  // Each player spawns 400 units from center
  spawnPoints: {
    player1: { x: 880, y: 850 },  // 1280 - 400 = 880
    player2: { x: 1680, y: 850 }, // 1280 + 400 = 1680
  },

  // Death zones
  deathZone: {
    bottom: 1500, // Below arena
    top: -200, // Above arena (optional)
    left: -100, // Left of arena
    right: 2660, // Right of arena
  },

  // Soft boundary push-back (prevents hard wall collisions)
  softBoundary: {
    margin: 100, // Distance from edge where push-back starts
    pushForce: 0.008, // Force applied to push players back
  },
};

/**
 * Camera system settings
 * Dynamic camera that frames both players with smooth zoom
 */
export const CAMERA = {
  // Viewport dimensions (what the player sees)
  viewportWidth: 1280,
  viewportHeight: 720,

  // Zoom limits
  zoomMin: 0.5, // Maximum zoom out (see more of arena)
  zoomMax: 0.95, // Maximum zoom in - capped to prevent disorienting close-ups
  zoomDefault: 0.85, // Default zoom level

  // Zoom behavior
  zoomPadding: 200, // Extra padding around players when calculating zoom
  zoomSmoothing: 0.12, // How quickly zoom changes (higher = faster/more responsive)

  // Position tracking
  positionSmoothing: 0.18, // How quickly camera follows midpoint (increased for faster tracking)
  verticalBias: 0.3, // Slight upward bias to show more sky during flight

  // Bounds padding (how close camera can get to arena edges)
  boundsPadding: {
    horizontal: 100,
    vertical: 50,
  },

  // Dead zone - camera won't move for small player movements
  deadZone: {
    width: 50,
    height: 30,
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
