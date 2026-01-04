/**
 * Frieza Character Configuration
 *
 * Fighting Style: Zoning and Projectiles
 * - Faster projectiles with longer range
 * - Lower physical durability
 * - Strong air control
 * - Best at keeping opponents at distance
 *
 * Playstyle: Keep-away fighter who dominates at range.
 * Weak up close but deadly from afar.
 */

import { createCharacter } from './baseCharacter.js';

const frieza = createCharacter({
  // Identity
  id: 'frieza',
  name: 'Frieza',
  description: 'Ranged specialist',

  // Visuals - Purple/White theme
  color: 0x9b59b6, // Purple
  accentColor: 0xecf0f1, // White

  // Core Stats
  maxHealth: 85, // Lower health - fragile
  maxEnergy: 120, // High ki pool for projectiles

  // Movement - Good lateral speed
  moveSpeedMultiplier: 1.05, // 5% faster
  maxVelocityMultiplier: 1.0, // Standard top speed
  jumpPowerMultiplier: 0.95, // Slightly lower jumps

  // Flight - Excellent air control
  flightEnergyDrainMultiplier: 0.9, // 10% more efficient flight
  flightThrustMultiplier: 1.2, // 20% more responsive (best air control)
  flightMaxVelocityMultiplier: 1.05, // 5% faster flight
  flightGravityCounterMultiplier: 1.15, // Floatier - hovers well

  // Combat - Weak up close
  attackDamageMultiplier: 0.9, // 10% less melee damage
  knockbackResistanceMultiplier: 0.85, // 15% more knockback taken (fragile)
  attackCooldownMultiplier: 1.1, // 10% slower attack rate

  // Projectile - Exceptional
  projectileSpeedMultiplier: 1.3, // 30% faster projectiles
  projectileLifetimeMultiplier: 1.4, // 40% longer range
  projectileSizeMultiplier: 0.9, // Slightly smaller but faster

  // Energy - Fast recovery for zoning
  energyRegenMultiplier: 1.2, // 20% faster regen
  energyRegenDelayMultiplier: 0.85, // 15% shorter delay

  // Display Stats (1-5)
  displaySpeed: 4,
  displayPower: 2,
  displayDurability: 1,
  displayKi: 5,
});

export default frieza;
