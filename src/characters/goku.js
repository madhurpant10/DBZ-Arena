/**
 * Goku Character Configuration
 *
 * Fighting Style: Speed and Agility
 * - Higher movement speed
 * - Better flight efficiency
 * - Lower max health (glass cannon)
 * - Balanced damage output
 *
 * Playstyle: Mobile fighter who excels at aerial combat
 * and outmaneuvering opponents. Must avoid taking hits.
 */

import { createCharacter } from './baseCharacter.js';

const goku = createCharacter({
  // Identity
  id: 'goku',
  name: 'Goku',
  description: 'Fast and agile fighter',

  // Visuals - Orange/Red theme
  color: 0xff6b35, // Bright orange (gi color)
  accentColor: 0x004e89, // Blue (undershirt)

  // Core Stats
  maxHealth: 90, // Lower health - high risk, high reward
  maxEnergy: 110, // Slightly more ki

  // Movement - Fast and nimble
  moveSpeedMultiplier: 1.2, // 20% faster acceleration
  maxVelocityMultiplier: 1.15, // 15% faster top speed
  jumpPowerMultiplier: 1.1, // 10% higher jumps

  // Flight - Efficient and fast
  flightEnergyDrainMultiplier: 0.8, // 20% less energy drain (more efficient)
  flightThrustMultiplier: 1.15, // 15% more responsive
  flightMaxVelocityMultiplier: 1.1, // 10% faster flight
  flightGravityCounterMultiplier: 1.1, // Slightly floatier

  // Combat - Balanced
  attackDamageMultiplier: 1.0, // Standard damage
  knockbackResistanceMultiplier: 0.9, // 10% more knockback taken
  attackCooldownMultiplier: 0.9, // 10% faster attack rate

  // Projectile - Standard
  projectileSpeedMultiplier: 1.05, // Slightly faster projectiles
  projectileLifetimeMultiplier: 1.0,
  projectileSizeMultiplier: 1.0,

  // Energy - Good regeneration
  energyRegenMultiplier: 1.1, // 10% faster regen
  energyRegenDelayMultiplier: 0.9, // 10% shorter delay

  // Display Stats (1-5)
  displaySpeed: 5,
  displayPower: 3,
  displayDurability: 2,
  displayKi: 4,
});

export default goku;
