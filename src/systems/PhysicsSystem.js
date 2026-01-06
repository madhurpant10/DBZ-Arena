import { WORLD, GROUND, PLAYER_BODY } from '../constants/physics.js';
import { ARENA } from '../constants/gameBalance.js';
import { logInfo, logDebug } from '../utils/debug.js';

/**
 * PhysicsSystem - Centralized physics management
 * Handles Matter.js world configuration, collision categories, and physics utilities
 */
export default class PhysicsSystem {
  /**
   * @param {Phaser.Scene} scene - The scene with Matter physics
   */
  constructor(scene) {
    console.log('PhysicsSystem constructor - scene:', scene);
    console.log('PhysicsSystem constructor - scene.matter:', scene.matter);

    this.scene = scene;
    this.matter = scene.matter;

    if (!this.matter) {
      console.error('PhysicsSystem: scene.matter is undefined! Physics not enabled?');
      throw new Error('Matter physics not available on scene');
    }

    // Collision categories
    this.categories = {
      player: 0x0001,
      projectile: 0x0002,
      ground: 0x0004,
      sensor: 0x0008,
    };

    // Track bodies for cleanup
    this.bodies = new Set();

    logInfo('PhysicsSystem: Initialized');
    console.log('PhysicsSystem: Constructor complete');
  }

  /**
   * Sets up the physics world with proper settings
   */
  setupWorld() {
    console.log('PhysicsSystem.setupWorld() starting...');
    console.log('  this.matter.world:', this.matter.world);

    // Configure gravity
    this.matter.world.setGravity(WORLD.gravity.x, WORLD.gravity.y);
    console.log('  Gravity set');

    // Set world bounds
    this.createWorldBounds();
    console.log('  World bounds created');

    logDebug('PhysicsSystem: World configured');
    console.log('PhysicsSystem.setupWorld() complete');
  }

  /**
   * Creates world boundary walls for the expanded arena
   * Uses soft boundaries with push-back forces instead of hard walls
   */
  createWorldBounds() {
    // Use arena dimensions instead of camera viewport
    const arenaWidth = ARENA.width;
    const arenaHeight = ARENA.height;
    const wallThickness = 50;

    const wallOptions = {
      friction: 0,
      frictionStatic: 0,
      restitution: 0.2, // Slight bounce for softer feel
      collisionFilter: {
        category: this.categories.ground,
        mask: this.categories.player | this.categories.projectile,
      },
    };

    // Left wall (at arena left edge)
    this.createStaticBody(
      -wallThickness / 2,
      arenaHeight / 2,
      wallThickness,
      arenaHeight * 2, // Extra tall to cover vertical movement
      { label: 'wallLeft', ...wallOptions }
    );

    // Right wall (at arena right edge)
    this.createStaticBody(
      arenaWidth + wallThickness / 2,
      arenaHeight / 2,
      wallThickness,
      arenaHeight * 2,
      { label: 'wallRight', ...wallOptions }
    );

    // Ceiling (high above arena)
    this.createStaticBody(
      arenaWidth / 2,
      -200 - wallThickness / 2, // Well above visible area
      arenaWidth,
      wallThickness,
      { label: 'ceiling', ...wallOptions }
    );
  }

  /**
   * Creates the ground platform spanning the full arena width
   * @returns {MatterJS.BodyType} The ground body
   */
  createGround() {
    // Use arena dimensions for ground
    const arenaWidth = ARENA.width;
    const groundHeight = ARENA.groundHeight;
    const groundY = ARENA.groundY + groundHeight / 2;

    const ground = this.matter.add.rectangle(arenaWidth / 2, groundY, arenaWidth, groundHeight, {
      isStatic: true,
      friction: GROUND.friction,
      frictionStatic: GROUND.frictionStatic,
      restitution: GROUND.restitution,
      label: 'ground',
      collisionFilter: {
        category: this.categories.ground,
        mask: this.categories.player | this.categories.projectile,
      },
    });

    // Note: Visual representation is now handled by GameScene.createArenaBackground()
    // for better control over depth and camera-relative positioning

    this.bodies.add(ground);

    logDebug('PhysicsSystem: Ground created');

    return ground;
  }

  /**
   * Creates a static body
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} width - Width
   * @param {number} height - Height
   * @param {Object} options - Additional Matter.js options
   * @returns {MatterJS.BodyType}
   */
  createStaticBody(x, y, width, height, options = {}) {
    const body = this.matter.add.rectangle(x, y, width, height, {
      isStatic: true,
      ...options,
    });

    this.bodies.add(body);
    return body;
  }

  /**
   * Creates a player physics body
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {string} label - Body label for identification
   * @returns {MatterJS.BodyType}
   */
  createPlayerBody(x, y, label) {
    const body = this.matter.add.rectangle(
      x,
      y,
      PLAYER_BODY.width,
      PLAYER_BODY.height,
      {
        friction: PLAYER_BODY.friction,
        frictionStatic: PLAYER_BODY.frictionStatic,
        frictionAir: PLAYER_BODY.frictionAir,
        restitution: PLAYER_BODY.restitution,
        density: PLAYER_BODY.density,
        label: label,
        // Prevent rotation - keep player upright
        inertia: Infinity,
        // Prevent body from sleeping (which can cause movement issues)
        isSleeping: false,
        sleepThreshold: Infinity,
        collisionFilter: {
          category: this.categories.player,
          mask: this.categories.ground | this.categories.projectile | this.categories.player,
        },
      }
    );

    this.bodies.add(body);
    return body;
  }

  /**
   * Applies a force to a body
   * @param {MatterJS.BodyType} body - The body to apply force to
   * @param {Object} force - Force vector { x, y }
   */
  applyForce(body, force) {
    this.matter.body.applyForce(body, body.position, force);
  }

  /**
   * Sets velocity of a body
   * @param {MatterJS.BodyType} body - The body
   * @param {Object} velocity - Velocity vector { x, y }
   */
  setVelocity(body, velocity) {
    this.matter.body.setVelocity(body, velocity);
  }

  /**
   * Sets only horizontal velocity, preserving vertical
   * @param {MatterJS.BodyType} body
   * @param {number} velocityX
   */
  setVelocityX(body, velocityX) {
    this.matter.body.setVelocity(body, { x: velocityX, y: body.velocity.y });
  }

  /**
   * Sets only vertical velocity, preserving horizontal
   * @param {MatterJS.BodyType} body
   * @param {number} velocityY
   */
  setVelocityY(body, velocityY) {
    this.matter.body.setVelocity(body, { x: body.velocity.x, y: velocityY });
  }

  /**
   * Clamps body velocity to maximum values
   * @param {MatterJS.BodyType} body
   * @param {number} maxX - Maximum horizontal velocity
   * @param {number} maxY - Maximum vertical velocity (optional)
   */
  clampVelocity(body, maxX, maxY = null) {
    let vx = body.velocity.x;
    let vy = body.velocity.y;

    // Clamp horizontal
    if (Math.abs(vx) > maxX) {
      vx = Math.sign(vx) * maxX;
    }

    // Clamp vertical if specified
    if (maxY !== null && Math.abs(vy) > maxY) {
      vy = Math.sign(vy) * maxY;
    }

    if (vx !== body.velocity.x || vy !== body.velocity.y) {
      this.matter.body.setVelocity(body, { x: vx, y: vy });
    }
  }

  /**
   * Checks if a body is on the ground
   * Uses velocity check combined with position check for simplicity
   * @param {MatterJS.BodyType} body - The body to check
   * @returns {boolean}
   */
  isOnGround(body) {
    if (!body || !body.bounds) return false;

    // Use arena ground position
    const groundY = ARENA.groundY;

    // Check if player's bottom is near the ground level
    // Add small tolerance for physics jitter
    const playerBottom = body.bounds.max.y;
    const tolerance = 10;

    // Player is grounded if their bottom is at or near ground level
    // and they're not moving significantly upward
    const nearGround = playerBottom >= groundY - tolerance;
    const notMovingUp = body.velocity.y >= -1;

    return nearGround && notMovingUp;
  }

  /**
   * Registers a collision callback
   * @param {string} eventType - 'collisionstart', 'collisionend', 'collisionactive'
   * @param {Function} callback - Callback function (event) => {}
   */
  onCollision(eventType, callback) {
    this.matter.world.on(eventType, callback);
  }

  /**
   * Removes a body from the physics world
   * @param {MatterJS.BodyType} body
   */
  removeBody(body) {
    if (body && this.bodies.has(body)) {
      this.matter.world.remove(body);
      this.bodies.delete(body);
    }
  }

  /**
   * Cleans up the physics system
   */
  destroy() {
    this.bodies.forEach((body) => {
      this.matter.world.remove(body);
    });
    this.bodies.clear();

    logInfo('PhysicsSystem: Destroyed');
  }
}
