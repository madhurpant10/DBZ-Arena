import { PROJECTILE_BODY, PROJECTILE_MOVEMENT } from '../constants/physics.js';
import { PROJECTILE } from '../constants/gameBalance.js';
import { logDebug } from '../utils/debug.js';

/**
 * Projectile Entity
 * Represents a fired projectile with physics and damage
 * Now supports 2D directional aiming toward opponents
 */
export default class Projectile {
  /**
   * Creates a projectile that travels toward a target position
   * @param {Phaser.Scene} scene - The game scene
   * @param {PhysicsSystem} physicsSystem - The physics system
   * @param {number} ownerPlayerNumber - Player number who fired this
   * @param {number} x - Start X position
   * @param {number} y - Start Y position
   * @param {Object} targetPos - Target position { x, y } to aim at
   * @param {number} facingDirection - Fallback direction if no target (1 or -1)
   */
  constructor(scene, physicsSystem, ownerPlayerNumber, x, y, targetPos, facingDirection = 1) {
    this.scene = scene;
    this.physics = physicsSystem;
    this.ownerPlayerNumber = ownerPlayerNumber;
    this.damage = PROJECTILE.damage;

    // Calculate direction vector toward target
    const directionVector = this.calculateDirection(x, y, targetPos, facingDirection);
    this.directionX = directionVector.x;
    this.directionY = directionVector.y;

    // Lifecycle
    this.createdAt = scene.time.now;
    this.lifetime = PROJECTILE_MOVEMENT.lifetime;
    this.shouldDestroy = false;

    // Create physics body
    this.body = this.createBody(x, y);

    // Create visual representation
    this.graphics = this.createVisuals();

    // Apply initial velocity in the calculated direction
    this.physics.setVelocity(this.body, {
      x: PROJECTILE_MOVEMENT.speed * this.directionX,
      y: PROJECTILE_MOVEMENT.speed * this.directionY,
    });

    logDebug(`Projectile: Created by Player ${ownerPlayerNumber} at (${x}, ${y}) → dir(${this.directionX.toFixed(2)}, ${this.directionY.toFixed(2)})`);
  }

  /**
   * Calculates normalized direction vector from source to target
   * @param {number} sourceX - Source X position
   * @param {number} sourceY - Source Y position
   * @param {Object} targetPos - Target position { x, y }
   * @param {number} facingDirection - Fallback horizontal direction
   * @returns {Object} Normalized direction vector { x, y }
   */
  calculateDirection(sourceX, sourceY, targetPos, facingDirection) {
    // If no target provided, use horizontal direction based on facing
    if (!targetPos) {
      return { x: facingDirection, y: 0 };
    }

    // Calculate delta to target
    const dx = targetPos.x - sourceX;
    const dy = targetPos.y - sourceY;

    // Calculate magnitude
    const magnitude = Math.sqrt(dx * dx + dy * dy);

    // If target is too close (same position), use facing direction
    if (magnitude < 1) {
      return { x: facingDirection, y: 0 };
    }

    // Normalize the vector
    return {
      x: dx / magnitude,
      y: dy / magnitude,
    };
  }

  /**
   * Creates the physics body for the projectile
   * @param {number} x - X position
   * @param {number} y - Y position
   * @returns {MatterJS.BodyType}
   */
  createBody(x, y) {
    const body = this.scene.matter.add.circle(x, y, PROJECTILE_BODY.radius, {
      friction: PROJECTILE_BODY.friction,
      frictionAir: PROJECTILE_BODY.frictionAir,
      restitution: PROJECTILE_BODY.restitution,
      density: PROJECTILE_BODY.density,
      isSensor: false,
      label: `projectile_${this.ownerPlayerNumber}`,
      // Disable gravity for projectiles
      ignoreGravity: true,
      collisionFilter: {
        category: PROJECTILE_BODY.collisionCategory,
        mask: PROJECTILE_BODY.collisionMask,
      },
    });

    // Disable gravity for this body
    body.gravityScale = { x: 0, y: 0 };

    return body;
  }

  /**
   * Creates visual representation
   * @returns {Phaser.GameObjects.Graphics}
   */
  createVisuals() {
    const graphics = this.scene.add.graphics();
    return graphics;
  }

  /**
   * Updates visual representation
   * Now includes a trail effect to show direction
   */
  updateVisuals() {
    this.graphics.clear();

    const x = this.body.position.x;
    const y = this.body.position.y;

    // Color based on owner
    const color = this.ownerPlayerNumber === 1 ? 0xf39c12 : 0x9b59b6;
    const glowColor = this.ownerPlayerNumber === 1 ? 0xf1c40f : 0x8e44ad;

    // Draw trail (opposite to direction of travel)
    const trailLength = 20;
    const trailX = x - this.directionX * trailLength;
    const trailY = y - this.directionY * trailLength;

    this.graphics.lineStyle(8, glowColor, 0.2);
    this.graphics.lineBetween(x, y, trailX, trailY);
    this.graphics.lineStyle(4, color, 0.4);
    this.graphics.lineBetween(x, y, trailX, trailY);

    // Draw glow effect (larger, transparent circle)
    this.graphics.fillStyle(glowColor, 0.3);
    this.graphics.fillCircle(x, y, PROJECTILE_BODY.radius * 1.5);

    // Draw core
    this.graphics.fillStyle(color, 1);
    this.graphics.fillCircle(x, y, PROJECTILE_BODY.radius);

    // Draw inner bright spot (offset in direction of travel for leading edge effect)
    this.graphics.fillStyle(0xffffff, 0.6);
    this.graphics.fillCircle(
      x + this.directionX * 3,
      y + this.directionY * 3,
      PROJECTILE_BODY.radius * 0.4
    );
  }

  /**
   * Updates projectile each frame
   * @param {number} time - Current time
   * @param {number} delta - Delta time
   */
  update(time, delta) {
    // Check lifetime
    if (time - this.createdAt >= this.lifetime) {
      this.shouldDestroy = true;
      return;
    }

    // Check if out of bounds
    const { width, height } = this.scene.cameras.main;
    const pos = this.body.position;

    if (pos.x < -50 || pos.x > width + 50 || pos.y < -50 || pos.y > height + 50) {
      this.shouldDestroy = true;
      return;
    }

    // Maintain intended velocity (counteract any physics drift)
    // This ensures projectiles travel in a straight line at constant speed
    const expectedVelX = PROJECTILE_MOVEMENT.speed * this.directionX;
    const expectedVelY = PROJECTILE_MOVEMENT.speed * this.directionY;
    const currentVel = this.body.velocity;

    // Only correct if there's significant drift
    if (Math.abs(currentVel.x - expectedVelX) > 0.5 || Math.abs(currentVel.y - expectedVelY) > 0.5) {
      this.physics.setVelocity(this.body, { x: expectedVelX, y: expectedVelY });
    }

    // Update visuals
    this.updateVisuals();
  }

  /**
   * Gets the direction vector (for knockback calculations)
   * @returns {Object} Direction vector { x, y }
   */
  getDirection() {
    return {
      x: this.directionX,
      y: this.directionY,
    };
  }

  /**
   * Cleans up projectile resources
   */
  destroy() {
    this.graphics.destroy();

    // Remove physics body
    if (this.body) {
      this.scene.matter.world.remove(this.body);
    }

    logDebug(`Projectile: Destroyed`);
  }
}
