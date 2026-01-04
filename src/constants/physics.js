/**
 * Physics constants for Matter.js
 * All physics-related tunable values are centralized here
 */

/**
 * World physics settings
 */
export const WORLD = {
  gravity: { x: 0, y: 1.0 }, // Reduced from 1.5 for more floaty feel
  bounds: {
    // Arena bounds (will be set based on game dimensions)
    padding: 50,
  },
};

/**
 * Player physics body properties
 */
export const PLAYER_BODY = {
  width: 50,
  height: 80,
  // Matter.js body options
  friction: 0.001, // Low friction for responsive movement
  frictionStatic: 0.05,
  frictionAir: 0.02, // Air resistance
  restitution: 0.0, // No bounce
  density: 0.001, // Mass calculation factor
  // Custom collision categories (bitmask)
  collisionCategory: 0x0001,
  collisionMask: 0xFFFF, // Collides with everything
};

/**
 * Player movement physics
 */
export const PLAYER_MOVEMENT = {
  // Horizontal movement
  moveForce: 0.005, // Force applied per frame when moving
  maxVelocityX: 7, // Maximum horizontal velocity
  // Jumping
  jumpForce: 0.012, // Impulse applied on jump
  maxJumps: 2, // Double jump support
  // Ground detection
  groundSensorHeight: 5,
  groundSensorWidth: 40,
  // Maximum fall velocity (prevents terminal velocity issues)
  maxFallVelocity: 15,
};

/**
 * Flight physics
 * Physics modifications applied when player is in FLYING state
 */
export const FLIGHT_PHYSICS = {
  // Base air friction is multiplied by this during flight for stability
  frictionAirFlying: 0.05, // Higher air drag during flight
  // Normal air friction when not flying
  frictionAirNormal: 0.02,
};

/**
 * Projectile physics body properties
 */
export const PROJECTILE_BODY = {
  radius: 15,
  friction: 0,
  frictionAir: 0,
  restitution: 0,
  density: 0.0001,
  isSensor: false, // Not a sensor - we want physical collision
  // Collision categories
  collisionCategory: 0x0002,
  collisionMask: 0x0001 | 0x0004, // Collides with players AND ground/walls
};

/**
 * Projectile movement
 */
export const PROJECTILE_MOVEMENT = {
  speed: 12, // Velocity magnitude
  lifetime: 2000, // Milliseconds before auto-destroy
};

/**
 * Combat physics
 */
export const COMBAT_PHYSICS = {
  knockbackForce: 0.015, // Base knockback impulse
  knockbackAngle: -45, // Degrees (negative = upward)
  hitstunDuration: 300, // Milliseconds
};

/**
 * Ground/Platform physics
 */
export const GROUND = {
  friction: 0.1, // Low friction for smooth movement
  frictionStatic: 0.2, // Low static friction to prevent sticking
  restitution: 0,
  collisionCategory: 0x0004,
};
