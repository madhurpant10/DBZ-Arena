/**
 * Vegeta Character Configuration
 *
 * Fighting Style: Power and Resilience
 * - Slightly slower than Goku
 * - Higher max health
 * - Better knockback resistance
 * - Slightly lower attack damage (trades speed for durability)
 *
 * Playstyle: Durable fighter who can take hits and stay in the fight.
 * More forgiving for players who get hit often.
 */

import { createCharacter } from './baseCharacter.js';

const vegeta = createCharacter({
  // Identity
  id: 'vegeta',
  name: 'Vegeta',
  description: 'Resilient powerhouse',

  // Visuals - Blue/White theme
  color: 0x1a5f7a, // Dark blue (armor)
  accentColor: 0xf4d160, // Gold (Super Saiyan hint)

  // Core Stats
  maxHealth: 115, // Higher health - can take more hits
  maxEnergy: 95, // Slightly less ki

  // Movement - Slightly slower
  moveSpeedMultiplier: 0.95, // 5% slower acceleration
  maxVelocityMultiplier: 0.95, // 5% slower top speed
  jumpPowerMultiplier: 1.0, // Standard jumps

  // Flight - Standard but controlled
  flightEnergyDrainMultiplier: 1.0, // Standard energy drain
  flightThrustMultiplier: 1.0, // Standard responsiveness
  flightMaxVelocityMultiplier: 0.95, // Slightly slower flight
  flightGravityCounterMultiplier: 0.95, // Slightly heavier in air

  // Combat - Tanky
  attackDamageMultiplier: 0.95, // 5% less damage
  knockbackResistanceMultiplier: 1.2, // 20% less knockback taken
  attackCooldownMultiplier: 1.0, // Standard attack rate

  // Projectile - Standard
  projectileSpeedMultiplier: 1.0,
  projectileLifetimeMultiplier: 1.0,
  projectileSizeMultiplier: 1.05, // Slightly larger projectiles

  // Energy - Standard
  energyRegenMultiplier: 1.0,
  energyRegenDelayMultiplier: 1.0,

  // Display Stats (1-5)
  displaySpeed: 3,
  displayPower: 3,
  displayDurability: 5,
  displayKi: 3,
});

export default vegeta;
