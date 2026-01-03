import { PLAYER_STATS, COMBAT } from '../constants/gameBalance.js';
import { PLAYER_BODY, PLAYER_MOVEMENT, COMBAT_PHYSICS } from '../constants/physics.js';
import { logDebug, logInfo } from '../utils/debug.js';

/**
 * Player Entity
 * Represents a playable fighter with physics, combat, and rendering
 */
export default class Player {
  /**
   * @param {Phaser.Scene} scene - The game scene
   * @param {PhysicsSystem} physicsSystem - The physics system
   * @param {number} playerNumber - 1 or 2
   * @param {number} x - Spawn X position
   * @param {number} y - Spawn Y position
   */
  constructor(scene, physicsSystem, playerNumber, x, y) {
    this.scene = scene;
    this.physics = physicsSystem;
    this.playerNumber = playerNumber;

    // State
    this.health = PLAYER_STATS.maxHealth;
    this.energy = PLAYER_STATS.maxEnergy;
    this.damageTaken = 0; // Cumulative damage for knockback scaling
    this.facingDirection = playerNumber === 1 ? 1 : -1; // 1 = right, -1 = left
    this.isGrounded = false;
    this.jumpsRemaining = PLAYER_MOVEMENT.maxJumps;
    this.isInvincible = false;
    this.isInHitstun = false;

    // Timing
    this.lastEnergyUse = 0;

    // Create physics body
    this.body = this.physics.createPlayerBody(x, y, `player_${playerNumber}`);

    // Create visual representation
    this.graphics = this.createVisuals();

    // Store reference to this entity on the body for collision lookup
    // Use 'entity' instead of 'gameObject' to avoid conflict with Phaser's internal usage
    this.body.entity = this;

    logInfo(`Player ${playerNumber}: Created at (${x}, ${y})`);
  }

  /**
   * Creates visual representation of the player
   * @returns {Phaser.GameObjects.Graphics}
   */
  createVisuals() {
    // Create the graphics object and assign to this.graphics first
    this.graphics = this.scene.add.graphics();
    // Now we can safely call updateVisuals which uses this.graphics
    this.updateVisuals();
    return this.graphics;
  }

  /**
   * Updates the visual representation
   */
  updateVisuals() {
    this.graphics.clear();

    const x = this.body.position.x;
    const y = this.body.position.y;
    const halfWidth = PLAYER_BODY.width / 2;
    const halfHeight = PLAYER_BODY.height / 2;

    // Player color based on player number
    const color = this.playerNumber === 1 ? 0xe74c3c : 0x3498db;
    const outlineColor = this.isInvincible ? 0xffffff : 0x000000;

    // Draw body
    this.graphics.fillStyle(color, this.isInvincible ? 0.5 : 1);
    this.graphics.fillRoundedRect(
      x - halfWidth,
      y - halfHeight,
      PLAYER_BODY.width,
      PLAYER_BODY.height,
      8
    );

    // Draw outline
    this.graphics.lineStyle(2, outlineColor, 1);
    this.graphics.strokeRoundedRect(
      x - halfWidth,
      y - halfHeight,
      PLAYER_BODY.width,
      PLAYER_BODY.height,
      8
    );

    // Draw facing indicator (small triangle)
    const indicatorX = x + this.facingDirection * (halfWidth - 5);
    const indicatorY = y;

    this.graphics.fillStyle(0xffffff, 0.8);
    this.graphics.beginPath();
    this.graphics.moveTo(indicatorX, indicatorY - 10);
    this.graphics.lineTo(indicatorX + this.facingDirection * 10, indicatorY);
    this.graphics.lineTo(indicatorX, indicatorY + 10);
    this.graphics.closePath();
    this.graphics.fillPath();
  }

  /**
   * Handles horizontal movement input
   * @param {number} direction - -1 (left), 0 (none), 1 (right)
   */
  move(direction) {
    if (this.isInHitstun) return;

    if (direction !== 0) {
      // Update facing direction
      this.facingDirection = direction;

      // Apply movement force
      this.physics.applyForce(this.body, {
        x: PLAYER_MOVEMENT.moveForce * direction,
        y: 0,
      });
    }

    // Clamp velocity
    this.physics.clampVelocity(this.body, PLAYER_MOVEMENT.maxVelocityX);
  }

  /**
   * Attempts to jump
   * @returns {boolean} Whether jump was successful
   */
  jump() {
    if (this.isInHitstun) return false;

    // Check ground state for jump reset
    if (this.isGrounded) {
      this.jumpsRemaining = PLAYER_MOVEMENT.maxJumps;
    }

    if (this.jumpsRemaining <= 0) {
      console.log(`Player ${this.playerNumber}: No jumps remaining`);
      return false;
    }

    // Use velocity-based jump for consistent, reliable jumping
    // Set vertical velocity directly (negative = upward)
    const jumpVelocity = -12; // Adjust this value to change jump height
    this.physics.setVelocity(this.body, {
      x: this.body.velocity.x, // Preserve horizontal velocity
      y: jumpVelocity,
    });

    this.jumpsRemaining--;
    this.isGrounded = false;

    console.log(`Player ${this.playerNumber}: Jumped! (${this.jumpsRemaining} remaining, isGrounded was: ${this.isGrounded})`);

    return true;
  }

  /**
   * Takes damage from an attack
   * @param {number} amount - Damage amount
   */
  takeDamage(amount) {
    if (this.isInvincible) return;

    this.health = Math.max(0, this.health - amount);
    this.damageTaken += amount;

    logDebug(`Player ${this.playerNumber}: Took ${amount} damage (HP: ${this.health})`);

    // Apply invincibility frames
    this.setInvincible(COMBAT.invincibilityDuration);

    // Check for KO
    if (this.health <= 0) {
      this.onKO();
    }
  }

  /**
   * Applies knockback force
   * @param {Object} force - Force vector { x, y }
   */
  applyKnockback(force) {
    this.physics.applyForce(this.body, force);

    // Enter hitstun
    this.isInHitstun = true;
    this.scene.time.delayedCall(COMBAT_PHYSICS?.hitstunDuration || 300, () => {
      this.isInHitstun = false;
    });
  }

  /**
   * Sets temporary invincibility
   * @param {number} duration - Duration in milliseconds
   */
  setInvincible(duration) {
    this.isInvincible = true;

    this.scene.time.delayedCall(duration, () => {
      this.isInvincible = false;
    });
  }

  /**
   * Uses energy
   * @param {number} amount - Amount to use
   * @returns {boolean} Whether energy was successfully used
   */
  useEnergy(amount) {
    if (this.energy < amount) return false;

    this.energy -= amount;
    this.lastEnergyUse = this.scene.time.now;
    return true;
  }

  /**
   * Regenerates energy over time
   * @param {number} delta - Delta time in ms
   */
  regenerateEnergy(delta) {
    const now = this.scene.time.now;

    // Don't regen if recently used energy
    if (now - this.lastEnergyUse < PLAYER_STATS.energyRegenDelay) {
      return;
    }

    this.energy = Math.min(
      PLAYER_STATS.maxEnergy,
      this.energy + PLAYER_STATS.energyRegenRate * (delta / 16.67) // Normalize to 60fps
    );
  }

  /**
   * Called when player is knocked out
   */
  onKO() {
    logInfo(`Player ${this.playerNumber}: KO'd!`);
    // Event will be handled by game scene
    this.scene.events.emit('playerKO', this.playerNumber);
  }

  /**
   * Resets player to spawn state
   * @param {number} x - Spawn X
   * @param {number} y - Spawn Y
   */
  reset(x, y) {
    this.health = PLAYER_STATS.maxHealth;
    this.energy = PLAYER_STATS.maxEnergy;
    this.damageTaken = 0;
    this.jumpsRemaining = PLAYER_MOVEMENT.maxJumps;
    this.isInvincible = false;
    this.isInHitstun = false;

    // Reset position and velocity
    this.scene.matter.body.setPosition(this.body, { x, y });
    this.physics.setVelocity(this.body, { x: 0, y: 0 });
  }

  /**
   * Updates player state each frame
   * @param {number} time - Current time
   * @param {number} delta - Delta time
   */
  update(time, delta) {
    // Check ground state
    this.isGrounded = this.physics.isOnGround(this.body);

    if (this.isGrounded) {
      this.jumpsRemaining = PLAYER_MOVEMENT.maxJumps;
    }

    // Regenerate energy
    this.regenerateEnergy(delta);

    // Update visuals
    this.updateVisuals();
  }

  /**
   * Gets current position
   * @returns {Object} Position { x, y }
   */
  getPosition() {
    return {
      x: this.body.position.x,
      y: this.body.position.y,
    };
  }

  /**
   * Gets current velocity
   * @returns {Object} Velocity { x, y }
   */
  getVelocity() {
    return {
      x: this.body.velocity.x,
      y: this.body.velocity.y,
    };
  }

  /**
   * Cleans up player resources
   */
  destroy() {
    this.graphics.destroy();
    this.physics.removeBody(this.body);

    logInfo(`Player ${this.playerNumber}: Destroyed`);
  }
}
