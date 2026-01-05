import { PLAYER_STATS, COMBAT, PLAYER_STATES, FLIGHT } from '../constants/gameBalance.js';
import { PLAYER_BODY, PLAYER_MOVEMENT, COMBAT_PHYSICS, FLIGHT_PHYSICS } from '../constants/physics.js';
import { logDebug, logInfo } from '../utils/debug.js';
import { getDefaultCharacter } from '../characters/index.js';

/**
 * Player Entity
 * Represents a playable fighter with physics, combat, flight, and rendering
 * Uses a state machine to manage behavior modes
 *
 * ARCHITECTURE NOTE:
 * Player is now data-driven via characterConfig. All stats are read from
 * the character config passed at construction time. This allows different
 * characters to have different gameplay feel without any if/else logic.
 */
export default class Player {
  /**
   * @param {Phaser.Scene} scene - The game scene
   * @param {PhysicsSystem} physicsSystem - The physics system
   * @param {number} playerNumber - 1 or 2
   * @param {number} x - Spawn X position
   * @param {number} y - Spawn Y position
   * @param {Object} characterConfig - Character configuration object
   */
  constructor(scene, physicsSystem, playerNumber, x, y, characterConfig) {
    this.scene = scene;
    this.physics = physicsSystem;
    this.playerNumber = playerNumber;

    // Store character config - this drives all stats (fallback to default if not provided)
    this.character = characterConfig || getDefaultCharacter();

    // Calculate actual stats from base + character multipliers
    this.stats = this.calculateStats();

    // Core stats - initialized from character config
    this.health = this.stats.maxHealth;
    this.energy = this.stats.maxEnergy;
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

    logInfo(`Player ${playerNumber}: Created as ${characterConfig.name} at (${x}, ${y})`);
  }

  /**
   * Calculates actual stats from base values and character multipliers
   * This is called once at construction
   * @returns {Object} Computed stats object
   */
  calculateStats() {
    const char = this.character;

    return {
      // Core stats (absolute values from character)
      maxHealth: char.maxHealth,
      maxEnergy: char.maxEnergy,

      // Movement (base * multiplier)
      moveForce: PLAYER_MOVEMENT.moveForce * char.moveSpeedMultiplier,
      maxVelocityX: PLAYER_MOVEMENT.maxVelocityX * char.maxVelocityMultiplier,
      jumpVelocity: -12 * char.jumpPowerMultiplier, // Base jump velocity * multiplier

      // Flight (base * multiplier)
      flightEnergyDrain: FLIGHT.energyDrainRate * char.flightEnergyDrainMultiplier,
      flightThrustForce: FLIGHT.thrustForce * char.flightThrustMultiplier,
      flightThrustUp: FLIGHT.verticalThrustUp * char.flightThrustMultiplier,
      flightThrustDown: FLIGHT.verticalThrustDown * char.flightThrustMultiplier,
      flightMaxVelocityX: FLIGHT.maxFlightVelocityX * char.flightMaxVelocityMultiplier,
      flightMaxVelocityY: FLIGHT.maxFlightVelocityY * char.flightMaxVelocityMultiplier,
      flightGravityCounter: FLIGHT.gravityCounterForce * char.flightGravityCounterMultiplier,

      // Combat (base * multiplier)
      attackDamage: COMBAT.basicAttackDamage * char.attackDamageMultiplier,
      knockbackResistance: char.knockbackResistanceMultiplier, // Applied to incoming knockback
      attackCooldown: COMBAT.basicAttackCooldown * char.attackCooldownMultiplier,

      // Energy (base * multiplier)
      energyRegenRate: PLAYER_STATS.energyRegenRate * char.energyRegenMultiplier,
      energyRegenRateAir: PLAYER_STATS.energyRegenRateAir * char.energyRegenMultiplier,
      energyRegenDelay: PLAYER_STATS.energyRegenDelay * char.energyRegenDelayMultiplier,
      attackEnergyCost: COMBAT.basicAttackEnergyCost * char.attackEnergyCostMultiplier,

      // Projectile stats (stored for use by CombatSystem)
      projectileSpeedMultiplier: char.projectileSpeedMultiplier,
      projectileLifetimeMultiplier: char.projectileLifetimeMultiplier,
      projectileSizeMultiplier: char.projectileSizeMultiplier,
    };
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
        // Reset body friction to prevent ground sticking
        this.body.friction = PLAYER_BODY.friction;
        this.body.frictionStatic = PLAYER_BODY.frictionStatic;
        break;
      case PLAYER_STATES.AIRBORNE:
        // Ensure normal air friction when entering airborne
        // This catches edge cases like FLYING->STUNNED->AIRBORNE where friction might not reset
        this.setAirFriction(FLIGHT_PHYSICS.frictionAirNormal);
        // Reset body friction
        this.body.friction = PLAYER_BODY.friction;
        this.body.frictionStatic = PLAYER_BODY.frictionStatic;
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
   * Uses character-specific movement stats
   * @param {number} direction - -1 (left), 0 (none), 1 (right)
   */
  move(direction) {
    if (!this.canAct()) return;

    const currentVelocityX = this.body.velocity.x;
    const maxSpeed = this.stats.maxVelocityX;

    // Movement constants - tuned for responsive but smooth feel
    // These use lerp (linear interpolation) which is standard in game dev
    const groundAcceleration = 0.15; // How fast to reach max speed (0-1, lower = smoother)
    const groundDeceleration = 0.12; // How fast to stop when no input (0-1, lower = more slide)
    const airAcceleration = 0.08; // Slower acceleration in air for floaty feel
    const airDeceleration = 0.05; // Less air control when stopping

    // Choose acceleration based on whether grounded or airborne
    const isGrounded = this.state === PLAYER_STATES.GROUNDED;
    const accel = isGrounded ? groundAcceleration : airAcceleration;
    const decel = isGrounded ? groundDeceleration : airDeceleration;

    if (direction !== 0) {
      // Update facing direction
      this.facingDirection = direction;

      // Target velocity based on input direction
      const targetVelocityX = maxSpeed * direction;

      // Lerp towards target velocity (smooth acceleration)
      const newVelocityX = currentVelocityX + (targetVelocityX - currentVelocityX) * accel;
      this.physics.setVelocityX(this.body, newVelocityX);
    } else {
      // No input - lerp towards zero (smooth deceleration)
      if (Math.abs(currentVelocityX) > 0.1) {
        const newVelocityX = currentVelocityX * (1 - decel);
        this.physics.setVelocityX(this.body, newVelocityX);
      } else {
        this.physics.setVelocityX(this.body, 0);
      }
    }

    // Clamp velocity based on state using character-specific values
    const maxVelX = this.isFlying() ? this.stats.flightMaxVelocityX : this.stats.maxVelocityX;
    this.physics.clampVelocity(this.body, maxVelX);
  }

  /**
   * Attempts to jump
   * Only works when GROUNDED or AIRBORNE (with remaining jumps)
   * Uses character-specific jump power
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

    // Perform jump with character-specific velocity
    this.physics.setVelocity(this.body, {
      x: this.body.velocity.x,
      y: this.stats.jumpVelocity,
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
   * Uses character-specific thrust values
   * @param {number} horizontalInput - -1, 0, or 1
   * @param {number} verticalInput - -1 (up), 0, or 1 (down)
   */
  applyFlightThrust(horizontalInput, verticalInput) {
    if (!this.isFlying()) return;

    // Calculate thrust vector using character-specific values
    let thrustX = horizontalInput * this.stats.flightThrustForce;

    // Vertical thrust - use different force for up vs down
    let thrustY = 0;
    if (verticalInput < 0) {
      // Going up - need stronger thrust to overcome gravity
      thrustY = verticalInput * this.stats.flightThrustUp;
    } else if (verticalInput > 0) {
      // Going down - gravity assists, less thrust needed
      thrustY = verticalInput * this.stats.flightThrustDown;
    }

    // Apply thrust forces
    if (thrustX !== 0 || thrustY !== 0) {
      this.physics.applyForce(this.body, { x: thrustX, y: thrustY });
    }

    // Clamp flight velocity using character-specific limits
    this.physics.clampVelocity(
      this.body,
      this.stats.flightMaxVelocityX,
      this.stats.flightMaxVelocityY
    );
  }

  /**
   * Consumes energy while flying
   * Called every frame during flight
   * Uses character-specific drain rate
   * @param {number} delta - Delta time in ms
   * @returns {boolean} Whether energy was consumed (false = out of energy)
   */
  consumeFlightEnergy(delta) {
    if (!this.isFlying()) return true;

    // Use character-specific drain rate
    const drainAmount = this.stats.flightEnergyDrain * (delta / 16.67); // Normalize to 60fps
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
   * Uses character-specific gravity counter
   * @param {boolean} isPressingDown - Whether player is pressing down key
   */
  updateFlightGravity(isPressingDown = false) {
    if (this.isFlying() && !isPressingDown) {
      // Apply reduced gravity effect using character-specific value
      // Only when NOT pressing down - allows controlled descent
      this.physics.applyForce(this.body, { x: 0, y: -this.stats.flightGravityCounter });
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
   * Uses character-specific knockback resistance
   * @param {Object} force - Force vector { x, y }
   */
  applyKnockback(force) {
    // Apply knockback resistance - reduce force based on character
    const resistedForce = {
      x: force.x / this.stats.knockbackResistance,
      y: force.y / this.stats.knockbackResistance,
    };

    // Apply the resisted force
    this.physics.applyForce(this.body, resistedForce);

    // Calculate knockback magnitude
    const magnitude = Math.sqrt(resistedForce.x * resistedForce.x + resistedForce.y * resistedForce.y);

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
   * Rate varies based on state (slower in air but still regenerates)
   * Uses character-specific regeneration rates
   * @param {number} delta - Delta time in ms
   */
  regenerateEnergy(delta) {
    // Don't regen while flying (energy is being consumed)
    if (this.isFlying()) return;

    const now = this.scene.time.now;

    // Don't regen if recently used energy (using character-specific delay)
    if (now - this.lastEnergyUse < this.stats.energyRegenDelay) {
      return;
    }

    // Determine regen rate based on state using character-specific values
    // Energy regens in ALL non-flying states, just slower when airborne
    const regenRate = this.state === PLAYER_STATES.GROUNDED
      ? this.stats.energyRegenRate
      : this.stats.energyRegenRateAir;

    this.energy = Math.min(
      this.stats.maxEnergy,
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
   * Uses character-specific max values
   * @param {number} x - Spawn X
   * @param {number} y - Spawn Y
   */
  reset(x, y) {
    this.health = this.stats.maxHealth;
    this.energy = this.stats.maxEnergy;
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
   * @param {boolean} isPressingDown - Whether player is pressing down key
   */
  update(time, delta, isPressingDown = false) {
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

    // Update flight gravity compensation (disabled when pressing down for controlled descent)
    this.updateFlightGravity(isPressingDown);

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
   * Uses character-specific colors
   */
  updateVisuals() {
    this.graphics.clear();

    const x = this.body.position.x;
    const y = this.body.position.y;
    const halfWidth = PLAYER_BODY.width / 2;
    const halfHeight = PLAYER_BODY.height / 2;

    // Use character-specific color
    let color = this.character.color;
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
      // Small flames/thrusters at bottom using character accent color
      this.graphics.fillStyle(this.character.accentColor, 0.8);
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

  /**
   * Gets the character configuration
   * @returns {Object} Character config
   */
  getCharacter() {
    return this.character;
  }

  /**
   * Gets the computed stats
   * @returns {Object} Stats object
   */
  getStats() {
    return this.stats;
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
