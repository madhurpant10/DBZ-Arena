import { COMBAT, PROJECTILE, KI_SYSTEM } from '../constants/gameBalance.js';
import { COMBAT_PHYSICS } from '../constants/physics.js';
import { logInfo, logDebug } from '../utils/debug.js';

/**
 * CombatSystem - Handles all combat-related logic
 * Manages damage, knockback, projectiles, and hit detection
 */
export default class CombatSystem {
  /**
   * @param {Phaser.Scene} scene - The game scene
   * @param {PhysicsSystem} physicsSystem - Reference to physics system
   */
  constructor(scene, physicsSystem) {
    this.scene = scene;
    this.physics = physicsSystem;

    // Track active projectiles
    this.projectiles = new Set();

    // Track player entities
    this.players = new Map();

    // Attack cooldowns per player
    this.attackCooldowns = new Map();

    this.setupCollisionHandling();

    logInfo('CombatSystem: Initialized');
  }

  /**
   * Registers a player entity with the combat system
   * @param {Player} player - The player entity
   */
  registerPlayer(player) {
    this.players.set(player.playerNumber, player);
    this.attackCooldowns.set(player.playerNumber, 0);

    logDebug(`CombatSystem: Registered Player ${player.playerNumber}`);
  }

  /**
   * Unregisters a player
   * @param {number} playerNumber
   */
  unregisterPlayer(playerNumber) {
    this.players.delete(playerNumber);
    this.attackCooldowns.delete(playerNumber);
  }

  /**
   * Sets up collision event handling
   */
  setupCollisionHandling() {
    this.physics.onCollision('collisionstart', (event) => {
      this.handleCollisions(event.pairs);
    });
  }

  /**
   * Handles collision pairs
   * @param {Array} pairs - Collision pairs from Matter.js
   */
  handleCollisions(pairs) {
    pairs.forEach((pair) => {
      const { bodyA, bodyB } = pair;

      // Check for projectile-player collision
      this.checkProjectileHit(bodyA, bodyB);
      this.checkProjectileHit(bodyB, bodyA);

      // Check for projectile-wall/ground collision
      this.checkProjectileWallHit(bodyA, bodyB);
      this.checkProjectileWallHit(bodyB, bodyA);
    });
  }

  /**
   * Checks if a projectile hit a wall or ground
   * @param {MatterJS.BodyType} projectileBody - Potential projectile
   * @param {MatterJS.BodyType} wallBody - Potential wall/ground
   */
  checkProjectileWallHit(projectileBody, wallBody) {
    // Check if first body is a projectile
    if (!projectileBody.label || !projectileBody.label.startsWith('projectile_')) {
      return;
    }

    // Check if second body is a wall, ground, or static body
    const isWallOrGround =
      wallBody.isStatic ||
      wallBody.label === 'ground' ||
      wallBody.label === 'wallLeft' ||
      wallBody.label === 'wallRight' ||
      wallBody.label === 'ceiling';

    if (!isWallOrGround) {
      return;
    }

    // Find and destroy the projectile
    const projectile = this.findProjectileByBody(projectileBody);
    if (projectile) {
      projectile.shouldDestroy = true;
    }
  }

  /**
   * Checks if a projectile hit a player
   * @param {MatterJS.BodyType} projectileBody - Potential projectile
   * @param {MatterJS.BodyType} targetBody - Potential target
   */
  checkProjectileHit(projectileBody, targetBody) {
    // Find projectile by label pattern
    if (!projectileBody.label || !projectileBody.label.startsWith('projectile_')) {
      return;
    }

    // Find target player by label pattern
    if (!targetBody.label || !targetBody.label.startsWith('player_')) {
      return;
    }

    // Extract player numbers
    const projectileOwner = parseInt(projectileBody.label.split('_')[1], 10);
    const targetPlayerNumber = parseInt(targetBody.label.split('_')[1], 10);

    // Don't hit self
    if (projectileOwner === targetPlayerNumber) {
      return;
    }

    // Get entities
    const targetPlayer = this.players.get(targetPlayerNumber);
    const projectile = this.findProjectileByBody(projectileBody);

    if (!targetPlayer || !projectile) {
      return;
    }

    // Apply hit
    this.applyProjectileHit(projectile, targetPlayer);
  }

  /**
   * Finds projectile entity by its physics body
   * @param {MatterJS.BodyType} body
   * @returns {Projectile|null}
   */
  findProjectileByBody(body) {
    for (const projectile of this.projectiles) {
      if (projectile.body === body) {
        return projectile;
      }
    }
    return null;
  }

  /**
   * Applies damage and knockback from projectile hit
   * Now fully 2D-aware - knockback follows projectile direction
   * @param {Projectile} projectile - The projectile that hit
   * @param {Player} target - The player that was hit
   */
  applyProjectileHit(projectile, target) {
    // Check if target is invincible
    if (target.isInvincible) {
      return;
    }

    logDebug(`CombatSystem: Player ${target.playerNumber} hit by projectile`);

    // Apply damage
    target.takeDamage(projectile.damage);

    // Ki gain: Target gains Ki from taking damage (comeback mechanic)
    target.gainKi(KI_SYSTEM.kiGainOnDamage);

    // Ki gain: Attacker gains Ki from landing the hit
    const attacker = this.players.get(projectile.owner);
    if (attacker) {
      attacker.onHitLanded(); // Use onHitLanded for all damage dealt
    }

    // Get projectile's travel direction (normalized vector)
    const projDir = projectile.getDirection();

    // Calculate knockback force with damage scaling
    const damageMultiplier = 1 + target.damageTaken * COMBAT.knockbackScaling;
    const knockbackMagnitude = COMBAT_PHYSICS.knockbackForce * damageMultiplier;

    // Base knockback is in the direction the projectile was traveling
    // We add an upward component to prevent targets from being driven into the ground
    const upwardBias = -0.4; // Slight upward deflection

    // Normalize the combined direction
    const dirX = projDir.x;
    const dirY = projDir.y + upwardBias;
    const dirMag = Math.sqrt(dirX * dirX + dirY * dirY);

    const knockbackForce = {
      x: (dirX / dirMag) * knockbackMagnitude,
      y: (dirY / dirMag) * knockbackMagnitude,
    };

    // Apply knockback
    target.applyKnockback(knockbackForce);

    // Destroy the projectile
    projectile.destroy();
    this.projectiles.delete(projectile);
  }

  /**
   * Attempts to fire a projectile for a player
   * Uses character-specific cooldown and stamina costs
   * @param {Player} player - The player firing
   * @param {Function} createProjectile - Factory function to create projectile
   * @returns {boolean} Whether the attack was successful
   */
  attemptAttack(player, createProjectile) {
    const now = this.scene.time.now;
    const lastAttack = this.attackCooldowns.get(player.playerNumber) || 0;
    const stats = player.getStats();

    // Check cooldown using character-specific value
    if (now - lastAttack < stats.attackCooldown) {
      return false;
    }

    // Check stamina cost using character-specific value
    if (player.stamina < stats.attackStaminaCost) {
      return false;
    }

    // Consume stamina using character-specific cost
    player.useStamina(stats.attackStaminaCost);

    // Update cooldown
    this.attackCooldowns.set(player.playerNumber, now);

    // Create and register projectile
    const projectile = createProjectile();
    this.projectiles.add(projectile);

    logDebug(`CombatSystem: Player ${player.playerNumber} fired projectile (cost: ${stats.attackStaminaCost.toFixed(1)} stamina)`);

    return true;
  }

  /**
   * Updates combat system
   * @param {number} time - Current time
   * @param {number} delta - Delta time since last frame
   */
  update(time, delta) {
    // Update all projectiles
    this.projectiles.forEach((projectile) => {
      projectile.update(time, delta);

      // Check if projectile should be destroyed
      if (projectile.shouldDestroy) {
        projectile.destroy();
        this.projectiles.delete(projectile);
      }
    });
  }

  /**
   * Cleans up the combat system
   */
  destroy() {
    // Destroy all projectiles
    this.projectiles.forEach((projectile) => {
      projectile.destroy();
    });
    this.projectiles.clear();

    this.players.clear();
    this.attackCooldowns.clear();

    logInfo('CombatSystem: Destroyed');
  }
}
