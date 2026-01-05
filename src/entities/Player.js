import { PLAYER_STATS, COMBAT, PLAYER_STATES, FLIGHT, KI_SYSTEM, TRANSFORMATION_BONUSES } from '../constants/gameBalance.js';
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
    this.stamina = this.stats.maxStamina; // Renamed from energy - used for attacks, flight
    this.ki = 0; // New Ki/Power Gauge - builds through combat, used for transformations
    this.damageTaken = 0; // Cumulative damage for knockback scaling
    this.facingDirection = playerNumber === 1 ? 1 : -1; // 1 = right, -1 = left

    // State machine - this is the source of truth for player behavior
    this.state = PLAYER_STATES.AIRBORNE; // Start airborne, will transition to grounded on landing
    this.previousState = null; // For debugging state transitions
    this.stateBeforeCharging = null; // Track state before charging started

    // Movement state
    this.jumpsRemaining = PLAYER_MOVEMENT.maxJumps;
    this.isInvincible = false;
    this.isCharging = false; // Whether player is currently charging Ki
    this.chargeStartTime = 0; // Timestamp when current charge began (for ramp calculation)

    // Transformation state
    this.canTransform = false; // Set to true when Ki reaches 100%
    this.hasPartialPower = false; // Set to true when Ki reaches 50%
    this.transformationReadyTime = 0; // Timestamp when canTransform became true
    this.isTransformed = false; // Currently in powered-up state
    this.transformationEndTime = 0; // When the transformation expires

    // Timing
    this.lastStaminaUse = 0; // Renamed from lastEnergyUse

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
      maxStamina: char.maxEnergy, // Character config still uses maxEnergy for backwards compat

      // Movement (base * multiplier)
      moveForce: PLAYER_MOVEMENT.moveForce * char.moveSpeedMultiplier,
      maxVelocityX: PLAYER_MOVEMENT.maxVelocityX * char.maxVelocityMultiplier,
      jumpVelocity: -12 * char.jumpPowerMultiplier, // Base jump velocity * multiplier

      // Flight (base * multiplier)
      flightStaminaDrain: FLIGHT.staminaDrainRate * char.flightEnergyDrainMultiplier,
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

      // Stamina (base * multiplier) - renamed from energy
      staminaRegenRate: PLAYER_STATS.staminaRegenRate * char.energyRegenMultiplier,
      staminaRegenRateAir: PLAYER_STATS.staminaRegenRateAir * char.energyRegenMultiplier,
      staminaRegenDelay: PLAYER_STATS.staminaRegenDelay * char.energyRegenDelayMultiplier,
      attackStaminaCost: COMBAT.basicAttackStaminaCost * char.attackEnergyCostMultiplier,

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

    // Apply charging movement penalty (30% speed while charging - makes it risky)
    const chargingSpeedMultiplier = this.isCharging ? KI_SYSTEM.chargeMovementPenalty : 1.0;
    const maxSpeed = this.stats.maxVelocityX * chargingSpeedMultiplier;

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
    // Also apply charging penalty to flight speed
    let maxVelX = this.isFlying() ? this.stats.flightMaxVelocityX : this.stats.maxVelocityX;
    maxVelX *= chargingSpeedMultiplier;
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
   * Requirements: must be airborne, have enough stamina
   * @returns {boolean} Whether flight was entered
   */
  enterFlight() {
    // Can only enter flight from airborne state
    if (this.state !== PLAYER_STATES.AIRBORNE) {
      return false;
    }

    // Check stamina requirement
    if (this.stamina < FLIGHT.minStaminaToFly) {
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

    // Apply charging penalty to flight thrust (30% power while charging)
    const chargingMultiplier = this.isCharging ? KI_SYSTEM.chargeMovementPenalty : 1.0;

    // Calculate thrust vector using character-specific values
    let thrustX = horizontalInput * this.stats.flightThrustForce * chargingMultiplier;

    // Vertical thrust - use different force for up vs down
    let thrustY = 0;
    if (verticalInput < 0) {
      // Going up - need stronger thrust to overcome gravity
      thrustY = verticalInput * this.stats.flightThrustUp * chargingMultiplier;
    } else if (verticalInput > 0) {
      // Going down - gravity assists, less thrust needed
      thrustY = verticalInput * this.stats.flightThrustDown * chargingMultiplier;
    }

    // Apply thrust forces
    if (thrustX !== 0 || thrustY !== 0) {
      this.physics.applyForce(this.body, { x: thrustX, y: thrustY });
    }

    // Clamp flight velocity using character-specific limits (also reduced while charging)
    this.physics.clampVelocity(
      this.body,
      this.stats.flightMaxVelocityX * chargingMultiplier,
      this.stats.flightMaxVelocityY * chargingMultiplier
    );
  }

  /**
   * Consumes stamina while flying
   * Called every frame during flight
   * Uses character-specific drain rate
   * @param {number} delta - Delta time in ms
   * @returns {boolean} Whether stamina was consumed (false = out of stamina)
   */
  consumeFlightStamina(delta) {
    if (!this.isFlying()) return true;

    // Use character-specific drain rate
    const drainAmount = this.stats.flightStaminaDrain * (delta / 16.67); // Normalize to 60fps
    this.stamina = Math.max(0, this.stamina - drainAmount);
    this.lastStaminaUse = this.scene.time.now;

    // Check if we ran out of stamina
    if (this.stamina <= 0) {
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
   * Applies transformation defense bonus if transformed
   * @param {number} amount - Damage amount
   */
  takeDamage(amount) {
    if (this.isInvincible) return;
    if (this.state === PLAYER_STATES.DEAD) return;

    // Apply defense bonus if transformed (reduces incoming damage)
    let actualDamage = amount;
    if (this.isTransformed) {
      actualDamage = amount * TRANSFORMATION_BONUSES.defenseMultiplier;
    }

    this.health = Math.max(0, this.health - actualDamage);
    this.damageTaken += actualDamage;

    logDebug(`Player ${this.playerNumber}: Took ${actualDamage.toFixed(1)} damage (HP: ${this.health})${this.isTransformed ? ' [TRANSFORMED]' : ''}`);

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

  // ==================== STAMINA ====================

  /**
   * Uses stamina for an action
   * @param {number} amount - Amount to use
   * @returns {boolean} Whether stamina was successfully used
   */
  useStamina(amount) {
    if (this.stamina < amount) return false;

    this.stamina -= amount;
    this.lastStaminaUse = this.scene.time.now;
    return true;
  }

  /**
   * Regenerates stamina over time
   * Rate varies based on state (slower in air but still regenerates)
   * Uses character-specific regeneration rates (includes transformation bonuses)
   * @param {number} delta - Delta time in ms
   */
  regenerateStamina(delta) {
    // Don't regen while flying (stamina is being consumed)
    if (this.isFlying()) return;
    // Stamina DOES regen while charging Ki - charging only slows movement, not recovery

    // Get current stats (includes transformation bonuses if active)
    const stats = this.getStats();
    const now = this.scene.time.now;

    // Don't regen if recently used stamina (using character-specific delay)
    if (now - this.lastStaminaUse < stats.staminaRegenDelay) {
      return;
    }

    // Determine regen rate based on state using character-specific values
    // Stamina regens in ALL non-flying states, just slower when airborne
    // Transformation bonus applies here (30% faster regen when transformed)
    const regenRate = this.state === PLAYER_STATES.GROUNDED
      ? stats.staminaRegenRate
      : stats.staminaRegenRateAir;

    this.stamina = Math.min(
      stats.maxStamina,
      this.stamina + regenRate * (delta / 16.67) // Normalize to 60fps
    );
  }

  // ==================== KI / POWER GAUGE ====================

  /**
   * Adds Ki from combat actions
   * @param {number} amount - Amount of Ki to gain
   */
  gainKi(amount) {
    this.ki = Math.min(KI_SYSTEM.maxKi, this.ki + amount);
    this.updateTransformationState();
  }

  /**
   * Updates transformation availability based on Ki level
   */
  updateTransformationState() {
    const kiPercent = (this.ki / KI_SYSTEM.maxKi) * 100;
    this.hasPartialPower = kiPercent >= KI_SYSTEM.partialPowerThreshold;

    const wasTransformReady = this.canTransform;
    this.canTransform = kiPercent >= KI_SYSTEM.transformationThreshold;

    // Track when transformation first becomes available
    if (this.canTransform && !wasTransformReady) {
      this.transformationReadyTime = this.scene.time.now;
    }
  }

  /**
   * Checks if transformation timeout has expired and resets Ki if so
   * Called every frame in update()
   */
  checkTransformationTimeout() {
    // Don't timeout if already transformed
    if (this.isTransformed) return;
    if (!this.canTransform) return;

    const now = this.scene.time.now;
    const elapsed = now - this.transformationReadyTime;

    if (elapsed >= KI_SYSTEM.transformationTimeout) {
      // Timeout expired - reset Ki and transformation state
      this.ki = 0;
      this.canTransform = false;
      this.hasPartialPower = false;
      this.transformationReadyTime = 0;
      logDebug(`Player ${this.playerNumber}: Transformation timed out - Ki reset`);
    }
  }

  /**
   * Activates transformation when Ki is at 100%
   * Consumes Ki and grants stat bonuses for a duration
   * @returns {boolean} Whether transformation was successful
   */
  activateTransformation() {
    if (!this.canTransform) return false;
    if (this.isTransformed) return false; // Already transformed

    // Activate transformation
    this.isTransformed = true;
    this.transformationEndTime = this.scene.time.now + KI_SYSTEM.transformationDuration;

    // Consume Ki
    this.ki = 0;
    this.canTransform = false;
    this.hasPartialPower = false;
    this.transformationReadyTime = 0;

    // Heal the bonus health amount (reward for transforming)
    const healthBonus = TRANSFORMATION_BONUSES.maxHealthBonus;
    this.health = Math.min(this.health + healthBonus, this.getStats().maxHealth);

    // Boost stamina to new max
    const staminaBonus = TRANSFORMATION_BONUSES.maxStaminaBonus;
    this.stamina = Math.min(this.stamina + staminaBonus, this.getStats().maxStamina);

    logInfo(`Player ${this.playerNumber}: TRANSFORMED! Duration: ${KI_SYSTEM.transformationDuration / 1000}s`);
    return true;
  }

  /**
   * Ends the transformation, returning to base stats
   */
  endTransformation() {
    if (!this.isTransformed) return;

    // Store transformed max values before ending transformation
    const transformedMaxHealth = this.getStats().maxHealth;
    const transformedMaxStamina = this.getStats().maxStamina;

    this.isTransformed = false;
    this.transformationEndTime = 0;

    // Scale health/stamina proportionally to maintain the same percentage
    // This prevents the bar from appearing to "jump up" when transformation ends
    const healthRatio = this.health / transformedMaxHealth;
    const staminaRatio = this.stamina / transformedMaxStamina;

    this.health = Math.min(healthRatio * this.stats.maxHealth, this.stats.maxHealth);
    this.stamina = Math.min(staminaRatio * this.stats.maxStamina, this.stats.maxStamina);

    logInfo(`Player ${this.playerNumber}: Transformation ended`);
  }

  /**
   * Checks if transformation duration has expired
   * Called every frame in update()
   */
  checkTransformationExpiry() {
    if (!this.isTransformed) return;

    const now = this.scene.time.now;
    if (now >= this.transformationEndTime) {
      this.endTransformation();
    }
  }

  /**
   * Called when player lands a hit on opponent
   * Gains Ki as a reward for aggression
   */
  onHitLanded() {
    this.gainKi(KI_SYSTEM.kiGainOnHit);
  }

  /**
   * Called when player's projectile hits opponent
   */
  onProjectileHit() {
    this.gainKi(KI_SYSTEM.kiGainOnProjectileHit);
  }

  /**
   * Starts charging Ki
   * Can charge while grounded, airborne, or flying (not while stunned/dead)
   */
  startCharging() {
    // Can't charge while stunned or dead
    if (!this.canAct()) return false;
    if (this.ki >= KI_SYSTEM.maxKi) return false; // Already at max

    this.isCharging = true;
    this.chargeStartTime = this.scene.time.now; // Track when charge began for ramp
    this.stateBeforeCharging = this.state;
    return true;
  }

  /**
   * Stops charging Ki
   * Resets the charge ramp - next charge starts from slow baseline
   */
  stopCharging() {
    this.isCharging = false;
    this.chargeStartTime = 0; // Reset ramp on release
    this.stateBeforeCharging = null;
  }

  /**
   * Calculates the current charge rate based on how long charging has been held
   * Uses smooth ramp from base rate to max rate over chargeRampTime
   * @returns {number} Current charge rate
   */
  getChargeRate() {
    const now = this.scene.time.now;
    const holdDuration = now - this.chargeStartTime;

    // Calculate ramp progress (0 to 1) with smooth easing
    const rampProgress = Math.min(1, holdDuration / KI_SYSTEM.chargeRampTime);

    // Use ease-in curve (quadratic) - starts slow, speeds up gradually
    // This punishes tap-spamming as short presses stay in the slow zone
    const easedProgress = rampProgress * rampProgress;

    // Interpolate between base and max rate
    const baseRate = KI_SYSTEM.chargeRateBase;
    const maxRate = KI_SYSTEM.chargeRateMax;
    return baseRate + (maxRate - baseRate) * easedProgress;
  }

  /**
   * Updates Ki charging - called every frame while charging
   * Uses ramping charge rate that rewards sustained holding
   * @param {number} delta - Delta time in ms
   */
  updateCharging(delta) {
    if (!this.isCharging) return;

    // Get current charge rate based on hold duration (ramps up over time)
    const currentRate = this.getChargeRate();
    const chargeAmount = currentRate * (delta / 16.67); // Normalize to 60fps
    this.gainKi(chargeAmount);

    // Stop charging if at max
    if (this.ki >= KI_SYSTEM.maxKi) {
      this.stopCharging();
    }
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
    this.stamina = this.stats.maxStamina;
    this.ki = 0; // Reset Ki gauge on respawn
    this.damageTaken = 0;
    this.jumpsRemaining = PLAYER_MOVEMENT.maxJumps;
    this.isInvincible = false;
    this.isCharging = false;
    this.chargeStartTime = 0;
    this.canTransform = false;
    this.hasPartialPower = false;
    this.transformationReadyTime = 0;
    this.isTransformed = false; // End any active transformation
    this.transformationEndTime = 0;
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

    // Regenerate stamina (not Ki - Ki must be earned)
    this.regenerateStamina(delta);

    // Update Ki charging if active
    this.updateCharging(delta);

    // Check if transformation timeout has expired (use it or lose it)
    this.checkTransformationTimeout();

    // Check if transformation duration has expired
    this.checkTransformationExpiry();

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
    if (this.isCharging) {
      // Charging Ki: Pulsing golden aura
      const pulseSize = PLAYER_BODY.width * (0.9 + Math.sin(this.scene.time.now / 100) * 0.2);
      this.graphics.fillStyle(0xf1c40f, 0.3);
      this.graphics.fillCircle(x, y, pulseSize);
      outlineColor = 0xf1c40f; // Golden outline while charging
    }

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

    // Transformation ready glow (pulsing to indicate "press to transform")
    if (this.canTransform && !this.isTransformed) {
      // Bright pulsing aura when transformation is available
      const transAura = PLAYER_BODY.width * (1.0 + Math.sin(this.scene.time.now / 150) * 0.15);
      this.graphics.fillStyle(0xf1c40f, 0.15);
      this.graphics.fillCircle(x, y, transAura);
    }

    // Active transformation - intense glowing aura
    if (this.isTransformed) {
      // Larger, more intense aura
      const transformAura = PLAYER_BODY.width * (1.2 + Math.sin(this.scene.time.now / 80) * 0.1);
      this.graphics.fillStyle(0xffff00, 0.25); // Bright yellow
      this.graphics.fillCircle(x, y, transformAura);

      // Inner intense glow
      this.graphics.fillStyle(0xffffff, 0.15);
      this.graphics.fillCircle(x, y, PLAYER_BODY.width * 0.7);

      // Override outline to bright gold
      outlineColor = 0xffd700;
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
   * Gets the computed stats with transformation bonuses applied if transformed
   * @returns {Object} Stats object (with transformation bonuses if active)
   */
  getStats() {
    // If not transformed, return base stats
    if (!this.isTransformed) {
      return this.stats;
    }

    // Apply transformation bonuses to relevant stats
    const tb = TRANSFORMATION_BONUSES;
    return {
      ...this.stats,
      // Boosted stats during transformation
      maxHealth: this.stats.maxHealth + tb.maxHealthBonus,
      maxStamina: this.stats.maxStamina + tb.maxStaminaBonus,
      attackDamage: this.stats.attackDamage * tb.damageMultiplier,
      maxVelocityX: this.stats.maxVelocityX * tb.speedMultiplier,
      moveForce: this.stats.moveForce * tb.speedMultiplier,
      flightStaminaDrain: this.stats.flightStaminaDrain * tb.flightDrainMultiplier,
      staminaRegenRate: this.stats.staminaRegenRate * tb.staminaRegenMultiplier,
      staminaRegenRateAir: this.stats.staminaRegenRateAir * tb.staminaRegenMultiplier,
      flightMaxVelocityX: this.stats.flightMaxVelocityX * tb.speedMultiplier,
      flightMaxVelocityY: this.stats.flightMaxVelocityY * tb.speedMultiplier,
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
