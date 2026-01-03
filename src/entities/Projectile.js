import { PROJECTILE_BODY, PROJECTILE_MOVEMENT } from '../constants/physics.js';
import { PROJECTILE } from '../constants/gameBalance.js';
import { logDebug } from '../utils/debug.js';

/**
 * Projectile Entity
 * Represents a fired projectile with physics and damage
 */
export default class Projectile {
  /**
   * @param {Phaser.Scene} scene - The game scene
   * @param {PhysicsSystem} physicsSystem - The physics system
   * @param {number} ownerPlayerNumber - Player number who fired this
   * @param {number} x - Start X position
   * @param {number} y - Start Y position
   * @param {number} direction - 1 (right) or -1 (left)
   */
  constructor(scene, physicsSystem, ownerPlayerNumber, x, y, direction) {
    this.scene = scene;
    this.physics = physicsSystem;
    this.ownerPlayerNumber = ownerPlayerNumber;
    this.direction = direction;
    this.damage = PROJECTILE.damage;

    // Lifecycle
    this.createdAt = scene.time.now;
    this.lifetime = PROJECTILE_MOVEMENT.lifetime;
    this.shouldDestroy = false;

    // Create physics body
    this.body = this.createBody(x, y);

    // Create visual representation
    this.graphics = this.createVisuals();

    // Apply initial velocity
    this.physics.setVelocity(this.body, {
      x: PROJECTILE_MOVEMENT.speed * direction,
      y: 0,
    });

    logDebug(`Projectile: Created by Player ${ownerPlayerNumber} at (${x}, ${y})`);
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
   */
  updateVisuals() {
    this.graphics.clear();

    const x = this.body.position.x;
    const y = this.body.position.y;

    // Color based on owner
    const color = this.ownerPlayerNumber === 1 ? 0xf39c12 : 0x9b59b6;
    const glowColor = this.ownerPlayerNumber === 1 ? 0xf1c40f : 0x8e44ad;

    // Draw glow effect (larger, transparent circle)
    this.graphics.fillStyle(glowColor, 0.3);
    this.graphics.fillCircle(x, y, PROJECTILE_BODY.radius * 1.5);

    // Draw core
    this.graphics.fillStyle(color, 1);
    this.graphics.fillCircle(x, y, PROJECTILE_BODY.radius);

    // Draw inner bright spot
    this.graphics.fillStyle(0xffffff, 0.6);
    this.graphics.fillCircle(
      x - this.direction * 3,
      y - 3,
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

    // Maintain velocity (counteract any physics effects)
    const currentVel = this.body.velocity;
    if (Math.abs(currentVel.y) > 0.1) {
      this.physics.setVelocityY(this.body, 0);
    }

    // Update visuals
    this.updateVisuals();
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
