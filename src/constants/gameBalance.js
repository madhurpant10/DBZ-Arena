/**
 * Game balance constants
 * All gameplay tuning values that affect game feel and balance
 */

/**
 * Player stats
 */
export const PLAYER_STATS = {
  maxHealth: 100,
  maxEnergy: 100, // Ki/energy for special moves
  energyRegenRate: 0.5, // Energy per frame
  energyRegenDelay: 1000, // Milliseconds after using energy before regen starts
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
 * UI settings
 */
export const UI = {
  healthBarWidth: 300,
  healthBarHeight: 25,
  energyBarWidth: 200,
  energyBarHeight: 15,
  hudPadding: 20,
};
