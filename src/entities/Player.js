import { PLAYER_STATS, COMBAT, PLAYER_STATES, FLIGHT } from '../constants/gameBalance.js';
import { PLAYER_BODY, PLAYER_MOVEMENT, COMBAT_PHYSICS, FLIGHT_PHYSICS } from '../constants/physics.js';
import { logDebug, logInfo } from '../utils/debug.js';

/**
 * Player Entity
 * Represents a playable fighter with physics, combat, flight, and rendering
 * Uses a state machine to manage behavior modes
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

    // Core stats
    this.health = PLAYER_STATS.maxHealth;
    this.energy = PLAYER_STATS.maxEnergy;
    this.damageTaken = 0; // Cumulative damage for knockback scaling
    this.facingDirection = playerNumber === 1 ? 1 : -1; // 1 = right, -1 = left

    // State machine - this is the source of truth for player behavior
    this.state = PLAYER_STATES.AIRBORNE; // Start airborne, will transition to grounded on landing
    this.previousState = null; // For debugging state transitions

    // Movement state
    this.jumpsRemaining = PLAYER_MOVEMENT.maxJumps;
    this.isInvincible = false;

    // Timing
    this.lastEnergyUse = 0;

    // Create physics body
    this.body = this.physics.createPlayerBody(x, y, `player_${playerNumber}`);

    // Store base physics values for restoration
    this.baseAirFriction = FLIGHT_PHYSICS.frictionAirNormal;

    // Create visual representation
    this.graphics = this.createVisuals();

    // Store reference to this entity on the body for collision lookup
    this.body.entity = this;

    logInfo(`Player ${playerNumber}: Created at (${x}, ${y})`);
  }

  // ==================== STATE MACHINE ====================

  /**
   * Gets the current player state
   * @returns {string} Current state from PLAYER_STATES
   */
  getState() {
    return this.state;
  }

  /**
   * Transitions to a new state with validation
   * @param {string} newState - The state to transition to
   * @returns {boolean} Whether the transition was successful
   */
  setState(newState) {
    // Validate state exists
    if (!Object.values(PLAYER_STATES).includes(newState)) {
      console.error(`Player ${this.playerNumber}: Invalid state "${newState}"`);
      return false;
    }

    // Don't transition to the same state
    if (this.state === newState) {
      return false;
    }

    // Handle exit logic for current state
    this.onStateExit(this.state);

    // Store previous state for debugging
    this.previousState = this.state;
    this.state = newState;

    // Handle enter logic for new state
    this.onStateEnter(newState);

    logDebug(`Player ${this.playerNumber}: ${this.previousState} → ${newState}`);
    return true;
  }

  /**
   * Called when exiting a state - cleanup logic
   * @param {string} exitingState - The state being exited
   */
  onStateExit(exitingState) {
    switch (exitingState) {
      case PLAYER_STATES.FLYING:
        // Restore normal air friction when exiting flight
        this.setAirFriction(FLIGHT_PHYSICS.frictionAirNormal);
        break;
      case PLAYER_STATES.STUNNED:
        // Nothing special needed
        break;
    }
  }

  /**
   * Called when entering a state - initialization logic
   * @param {string} enteringState - The state being entered
   */
  onStateEnter(enteringState) {
    switch (enteringState) {
      case PLAYER_STATES.GROUNDED:
        // Reset jumps when landing
        this.jumpsRemaining = PLAYER_MOVEMENT.maxJumps;
        // Restore normal air friction (fixes slow movement after flying)
        this.setAirFriction(FLIGHT_PHYSICS.frictionAirNormal);
        break;
      case PLAYER_STATES.FLYING:
        // Increase air friction for flight stability
        this.setAirFriction(FLIGHT_PHYSICS.frictionAirFlying);
        break;
      case PLAYER_STATES.DEAD:
        this.onKO();
        break;
    }
  }

  /**
   * Checks if the player can perform actions (not stunned or dead)
   * @returns {boolean}
   */
  canAct() {
    return this.state !== PLAYER_STATES.STUNNED && this.state !== PLAYER_STATES.DEAD;
  }

  /**
   * Checks if the player is currently flying
   * @returns {boolean}
   */
  isFlying() {
    return this.state === PLAYER_STATES.FLYING;
  }

  // ==================== PHYSICS HELPERS ====================

  /**
   * Sets the air friction on the physics body
   * @param {number} friction - New air friction value
   */
  setAirFriction(friction) {
    if (this.body) {
      this.body.frictionAir = friction;
    }
  }

  /**
   * Gets the current velocity magnitude (speed)
   * @returns {number}
   */
  getSpeed() {
    const vx = this.body.velocity.x;
    const vy = this.body.velocity.y;
    return Math.sqrt(vx * vx + vy * vy);
  }

  // ==================== MOVEMENT ====================

  /**
   * Handles horizontal movement input
   * Movement behavior changes based on current state
   * @param {number} direction - -1 (left), 0 (none), 1 (right)
   */
  move(direction) {
    if (!this.canAct()) return;

    if (direction !== 0) {
      // Update facing direction
      this.facingDirection = direction;

      // Apply movement force - same for ground and air
      this.physics.applyForce(this.body, {
        x: PLAYER_MOVEMENT.moveForce * direction,
        y: 0,
      });
    }

    // Clamp velocity based on state
    const maxVelX = this.isFlying() ? FLIGHT.maxFlightVelocityX : PLAYER_MOVEMENT.maxVelocityX;
    this.physics.clampVelocity(this.body, maxVelX);
  }

  /**
   * Attempts to jump
   * Only works when GROUNDED or AIRBORNE (with remaining jumps)
   * @returns {boolean} Whether jump was successful
   */
  jump() {
    if (!this.canAct()) return false;

    // Can't jump while flying - must exit flight first
    if (this.isFlying()) return false;

    // Check jump availability
    if (this.jumpsRemaining <= 0) {
      return false;
    }

    // Perform jump with velocity-based impulse
    const jumpVelocity = -12;
    this.physics.setVelocity(this.body, {
      x: this.body.velocity.x,
      y: jumpVelocity,
    });

    this.jumpsRemaining--;

    // Transition to airborne if we were grounded
    if (this.state === PLAYER_STATES.GROUNDED) {
      this.setState(PLAYER_STATES.AIRBORNE);
    }

    return true;
  }

  // ==================== FLIGHT SYSTEM ====================

  /**
   * Attempts to enter flight mode
   * Requirements: must be airborne, have enough energy
   * @returns {boolean} Whether flight was entered
   */
  enterFlight() {
    // Can only enter flight from airborne state
    if (this.state !== PLAYER_STATES.AIRBORNE) {
      return false;
    }

    // Check energy requirement
    if (this.energy < FLIGHT.minEnergyToFly) {
      return false;
    }

    return this.setState(PLAYER_STATES.FLYING);
  }

  /**
   * Exits flight mode - returns to airborne
   */
  exitFlight() {
    if (!this.isFlying()) return;
    this.setState(PLAYER_STATES.AIRBORNE);
  }

  /**
   * Applies thrust force during flight
   * Called every frame while flying with directional input
   * @param {number} horizontalInput - -1, 0, or 1
   * @param {number} verticalInput - -1 (up), 0, or 1 (down)
   */
  applyFlightThrust(horizontalInput, verticalInput) {
    if (!this.isFlying()) return;

    // Calculate thrust vector
    let thrustX = horizontalInput * FLIGHT.thrustForce;

    // Vertical thrust - use different force for up vs down
    let thrustY = 0;
    if (verticalInput < 0) {
      // Going up - need stronger thrust to overcome gravity
      thrustY = verticalInput * FLIGHT.verticalThrustUp;
    } else if (verticalInput > 0) {
      // Going down - gravity assists, less thrust needed
      thrustY = verticalInput * FLIGHT.verticalThrustDown;
    }

    // Apply thrust forces
    if (thrustX !== 0 || thrustY !== 0) {
      this.physics.applyForce(this.body, { x: thrustX, y: thrustY });
    }

    // Clamp flight velocity
    this.physics.clampVelocity(
      this.body,
      FLIGHT.maxFlightVelocityX,
      FLIGHT.maxFlightVelocityY
    );
  }

  /**
   * Consumes energy while flying
   * Called every frame during flight
   * @param {number} delta - Delta time in ms
   * @returns {boolean} Whether energy was consumed (false = out of energy)
   */
  consumeFlightEnergy(delta) {
    if (!this.isFlying()) return true;

    const drainAmount = FLIGHT.energyDrainRate * (delta / 16.67); // Normalize to 60fps
    this.energy = Math.max(0, this.energy - drainAmount);
    this.lastEnergyUse = this.scene.time.now;

    // Check if we ran out of energy
    if (this.energy <= 0) {
      this.exitFlight();
      return false;
    }

    return true;
  }

  /**
   * Updates flight-related gravity scaling
   * Called every frame during flight
   * Creates a floaty feel with slow descent
   */
  updateFlightGravity() {
    if (this.isFlying()) {
      // Apply reduced gravity effect by counteracting a portion of gravity
      // This is done via force, not by modifying world gravity
      // Uses the constant from FLIGHT config for easy tuning
      this.physics.applyForce(this.body, { x: 0, y: -FLIGHT.gravityCounterForce });
    }
  }

  // ==================== COMBAT ====================

  /**
   * Takes damage from an attack
   * @param {number} amount - Damage amount
   */
  takeDamage(amount) {
    if (this.isInvincible) return;
    if (this.state === PLAYER_STATES.DEAD) return;

    this.health = Math.max(0, this.health - amount);
    this.damageTaken += amount;

    logDebug(`Player ${this.playerNumber}: Took ${amount} damage (HP: ${this.health})`);

    // Apply invincibility frames
    this.setInvincible(COMBAT.invincibilityDuration);

    // Check for KO
    if (this.health <= 0) {
      this.setState(PLAYER_STATES.DEAD);
    }
  }

  /**
   * Applies knockback force
   * Forces exit from flight if knockback is strong enough
   * @param {Object} force - Force vector { x, y }
   */
  applyKnockback(force) {
    // Apply the force
    this.physics.applyForce(this.body, force);

    // Calculate knockback magnitude
    const magnitude = Math.sqrt(force.x * force.x + force.y * force.y);

    // Strong knockback forces exit from flight
    if (this.isFlying() && magnitude > FLIGHT.knockbackExitThreshold * 0.001) {
      this.exitFlight();
    }

    // Enter stunned state
    this.setState(PLAYER_STATES.STUNNED);

    // Exit stun after hitstun duration
    this.scene.time.delayedCall(COMBAT_PHYSICS?.hitstunDuration || 300, () => {
      // Only exit stun if we're still stunned (not dead, etc)
      if (this.state === PLAYER_STATES.STUNNED) {
        // Transition based on current situation
        if (this.physics.isOnGround(this.body)) {
          this.setState(PLAYER_STATES.GROUNDED);
        } else {
          this.setState(PLAYER_STATES.AIRBORNE);
        }
      }
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

  // ==================== ENERGY ====================

  /**
   * Uses energy for an action
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
   * Rate varies based on state (slower in air/flight)
   * @param {number} delta - Delta time in ms
   */
  regenerateEnergy(delta) {
    // Don't regen while flying (energy is being consumed)
    if (this.isFlying()) return;

    const now = this.scene.time.now;

    // Don't regen if recently used energy
    if (now - this.lastEnergyUse < PLAYER_STATS.energyRegenDelay) {
      return;
    }

    // Determine regen rate based on state
    const regenRate = this.state === PLAYER_STATES.GROUNDED
      ? PLAYER_STATS.energyRegenRate
      : PLAYER_STATS.energyRegenRateAir;

    this.energy = Math.min(
      PLAYER_STATS.maxEnergy,
      this.energy + regenRate * (delta / 16.67) // Normalize to 60fps
    );
  }

  // ==================== LIFECYCLE ====================

  /**
   * Called when player is knocked out
   */
  onKO() {
    logInfo(`Player ${this.playerNumber}: KO'd!`);
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
    this.state = PLAYER_STATES.AIRBORNE;

    // Reset physics
    this.setAirFriction(FLIGHT_PHYSICS.frictionAirNormal);
    this.scene.matter.body.setPosition(this.body, { x, y });
    this.physics.setVelocity(this.body, { x: 0, y: 0 });
  }

  /**
   * Updates player state each frame
   * Handles state transitions based on physics conditions
   * @param {number} time - Current time
   * @param {number} delta - Delta time
   */
  update(time, delta) {
    // Skip update if dead
    if (this.state === PLAYER_STATES.DEAD) {
      this.updateVisuals();
      return;
    }

    // Check ground contact for state transitions
    const isOnGround = this.physics.isOnGround(this.body);

    // State transition: Landing
    if (isOnGround && (this.state === PLAYER_STATES.AIRBORNE || this.state === PLAYER_STATES.FLYING)) {
      this.setState(PLAYER_STATES.GROUNDED);
    }
    // State transition: Falling off ledge / starting to fall
    else if (!isOnGround && this.state === PLAYER_STATES.GROUNDED) {
      this.setState(PLAYER_STATES.AIRBORNE);
    }

    // Clamp fall velocity to prevent physics issues
    if (this.body.velocity.y > PLAYER_MOVEMENT.maxFallVelocity) {
      this.physics.setVelocityY(this.body, PLAYER_MOVEMENT.maxFallVelocity);
    }

    // Update flight gravity compensation
    this.updateFlightGravity();

    // Regenerate energy
    this.regenerateEnergy(delta);

    // Update visuals
    this.updateVisuals();
  }

  // ==================== VISUALS ====================

  /**
   * Creates visual representation of the player
   * @returns {Phaser.GameObjects.Graphics}
   */
  createVisuals() {
    this.graphics = this.scene.add.graphics();
    this.updateVisuals();
    return this.graphics;
  }

  /**
   * Updates the visual representation
   * Appearance changes based on state
   */
  updateVisuals() {
    this.graphics.clear();

    const x = this.body.position.x;
    const y = this.body.position.y;
    const halfWidth = PLAYER_BODY.width / 2;
    const halfHeight = PLAYER_BODY.height / 2;

    // Base color based on player number
    let color = this.playerNumber === 1 ? 0xe74c3c : 0x3498db;
    let outlineColor = 0x000000;
    let alpha = 1;

    // Modify appearance based on state
    if (this.isFlying()) {
      // Flying: Add golden glow effect
      outlineColor = 0xf1c40f; // Golden outline
      // Draw aura glow behind player
      this.graphics.fillStyle(0xf1c40f, 0.2);
      this.graphics.fillCircle(x, y, PLAYER_BODY.width * 0.8);
    }

    if (this.isInvincible) {
      outlineColor = 0xffffff;
      alpha = 0.5;
    }

    if (this.state === PLAYER_STATES.STUNNED) {
      // Stunned: Flash red
      color = 0xff6b6b;
    }

    // Draw body
    this.graphics.fillStyle(color, alpha);
    this.graphics.fillRoundedRect(
      x - halfWidth,
      y - halfHeight,
      PLAYER_BODY.width,
      PLAYER_BODY.height,
      8
    );

    // Draw outline
    this.graphics.lineStyle(this.isFlying() ? 3 : 2, outlineColor, 1);
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

    // Draw flight indicator when flying
    if (this.isFlying()) {
      // Small flames/thrusters at bottom
      this.graphics.fillStyle(0xf39c12, 0.8);
      const flameY = y + halfHeight + 5;
      const flameSize = 8 + Math.sin(this.scene.time.now / 50) * 3; // Animated
      this.graphics.fillCircle(x - 10, flameY, flameSize);
      this.graphics.fillCircle(x + 10, flameY, flameSize);
    }
  }

  // ==================== GETTERS ====================

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

  // ==================== CLEANUP ====================

  /**
   * Cleans up player resources
   */
  destroy() {
    this.graphics.destroy();
    this.physics.removeBody(this.body);

    logInfo(`Player ${this.playerNumber}: Destroyed`);
  }
}
