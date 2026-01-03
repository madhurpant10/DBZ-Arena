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
  FLYING: 'FLYING', // Controlled flight mode, reduced gravity, consumes energy
  STUNNED: 'STUNNED', // In hitstun, cannot act
  DEAD: 'DEAD', // KO'd, awaiting respawn or game over
};

/**
 * Player stats
 */
export const PLAYER_STATS = {
  maxHealth: 100,
  maxEnergy: 100, // Ki/energy for special moves
  energyRegenRate: 0.5, // Energy per frame (normalized to 60fps)
  energyRegenDelay: 1000, // Milliseconds after using energy before regen starts
  energyRegenRateAir: 0.2, // Slower regen while airborne/flying
};

/**
 * Combat balance
 */
export const COMBAT = {
  // Basic attack
  basicAttackDamage: 10,
  basicAttackCooldown: 500, // Milliseconds between attacks
  basicAttackEnergyCost: 0,
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
  energyCost: 0, // Basic projectile is free for now
  cooldown: 500, // Milliseconds
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
  // Energy consumption
  // 0.055 allows ~30 seconds of flight from full energy (100 / 30 / 60 ≈ 0.055)
  energyDrainRate: 0.055, // Energy per frame while flying (normalized to 60fps)
  minEnergyToFly: 10, // Minimum energy required to enter flight mode

  // Thrust forces (applied as forces, not velocity overrides)
  // These need to be strong enough to overcome gravity (1.5)
  thrustForce: 0.008, // Horizontal thrust force
  verticalThrustUp: 0.012, // Upward thrust (stronger to fight gravity)
  verticalThrustDown: 0.006, // Downward thrust (gravity assists)

  // Velocity limits during flight
  maxFlightVelocityX: 8, // Horizontal speed cap while flying
  maxFlightVelocityY: 8, // Vertical speed cap while flying

  // Gravity counterforce - applied constantly to create floaty feel
  // This counteracts most of gravity so player hovers when not pressing anything
  gravityCounterForce: 0.0012, // Counteracts ~80% of gravity for floaty hover

  // State transition thresholds
  knockbackExitThreshold: 8, // Velocity magnitude that forces exit from flight
};

/**
 * UI settings
 */
export const UI = {
  healthBarWidth: 300,
  healthBarHeight: 25,
  energyBarWidth: 200,
  energyBarHeight: 15,
  hudPadding: 20,
};
