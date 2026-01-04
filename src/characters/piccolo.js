/**
 * Piccolo Character Configuration
 *
 * Fighting Style: Defensive and Tactical
 * - Slower overall movement
 * - High max health
 * - Strong energy regeneration
 * - Stable, controlled flight
 *
 * Playstyle: Patient, methodical fighter who outlasts opponents.
 * Rewards careful play and energy management.
 */

import { createCharacter } from './baseCharacter.js';

const piccolo = createCharacter({
  // Identity
  id: 'piccolo',
  name: 'Piccolo',
  description: 'Defensive tactician',

  // Visuals - Green/Purple theme
  color: 0x2ecc71, // Green (skin)
  accentColor: 0x8e44ad, // Purple (cape)

  // Core Stats
  maxHealth: 120, // Highest health - very tanky
  maxEnergy: 105, // Good ki pool

  // Movement - Slower but deliberate
  moveSpeedMultiplier: 0.9, // 10% slower acceleration
  maxVelocityMultiplier: 0.9, // 10% slower top speed
  jumpPowerMultiplier: 0.95, // Slightly lower jumps

  // Flight - Stable and efficient
  flightEnergyDrainMultiplier: 0.85, // 15% more efficient flight
  flightThrustMultiplier: 0.95, // Slightly less responsive
  flightMaxVelocityMultiplier: 0.9, // Slower flight
  flightGravityCounterMultiplier: 1.0, // Standard hover

  // Combat - Defensive
  attackDamageMultiplier: 1.05, // 5% more damage (methodical strikes)
  knockbackResistanceMultiplier: 1.15, // 15% less knockback taken
  attackCooldownMultiplier: 1.1, // 10% slower attack rate

  // Projectile - Standard
  projectileSpeedMultiplier: 0.95, // Slightly slower
  projectileLifetimeMultiplier: 1.1, // 10% longer range
  projectileSizeMultiplier: 1.1, // 10% larger hitbox

  // Energy - Excellent regeneration, standard attack cost
  energyRegenMultiplier: 1.4, // 40% faster regen (best in game)
  energyRegenDelayMultiplier: 0.8, // 20% shorter delay
  attackEnergyCostMultiplier: 1.0, // Standard cost - relies on regen advantage

  // Display Stats (1-5)
  displaySpeed: 2,
  displayPower: 4,
  displayDurability: 4,
  displayKi: 5,
});

export default piccolo;
