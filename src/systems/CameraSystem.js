import { ARENA, CAMERA } from '../constants/gameBalance.js';
import { logInfo, logDebug } from '../utils/debug.js';

/**
 * CameraSystem - Dynamic camera that frames both players
 * Features:
 * - Midpoint tracking between players
 * - Distance-based zoom (closer = zoom in, farther = zoom out)
 * - Smooth interpolation for all movements
 * - Arena bounds clamping
 * - Vertical flight handling
 * - Camera shake on impacts
 * - Slow-motion effects
 */
export default class CameraSystem {
  /**
   * @param {Phaser.Scene} scene - The game scene
   */
  constructor(scene) {
    this.scene = scene;
    this.camera = scene.cameras.main;

    // Current camera state
    this.currentZoom = CAMERA.zoomDefault;
    this.targetZoom = CAMERA.zoomDefault;
    this.currentX = ARENA.width / 2;
    this.currentY = ARENA.groundY - CAMERA.viewportHeight / 2;
    this.targetX = this.currentX;
    this.targetY = this.currentY;

    // Player references (set via setPlayers)
    this.players = [];

    // Camera shake state
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.shakeElapsed = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;

    // Slow-motion state
    this.slowMotionActive = false;
    this.slowMotionDuration = 0;
    this.slowMotionElapsed = 0;
    this.slowMotionScale = 1.0;
    this.originalTimeScale = 1.0;

    // Initialize camera
    this.setupCamera();

    logInfo('CameraSystem: Initialized');
  }

  /**
   * Sets up initial camera configuration
   */
  setupCamera() {
    // Set camera bounds to match arena with padding
    const boundsX = -CAMERA.boundsPadding.horizontal;
    const boundsY = -CAMERA.boundsPadding.vertical - 400; // Extra space above for flight
    const boundsWidth = ARENA.width + CAMERA.boundsPadding.horizontal * 2;
    const boundsHeight = ARENA.height + CAMERA.boundsPadding.vertical * 2 + 400;

    this.camera.setBounds(boundsX, boundsY, boundsWidth, boundsHeight);

    // Set initial zoom
    this.camera.setZoom(this.currentZoom);

    // Center camera on arena center initially
    this.camera.centerOn(this.currentX, this.currentY);

    logDebug('CameraSystem: Camera bounds set');
  }

  /**
   * Sets the players to track
   * @param {Player[]} players - Array of player entities
   */
  setPlayers(players) {
    this.players = players;
  }

  /**
   * Main update loop - call every frame
   * @param {number} delta - Time since last frame in ms
   */
  update(delta) {
    if (this.players.length < 2) return;

    // Update slow-motion effect
    this.updateSlowMotion(delta);

    // Get player positions
    const p1Pos = this.players[0].getPosition();
    const p2Pos = this.players[1].getPosition();

    // Calculate camera targets
    this.calculateTargetPosition(p1Pos, p2Pos);
    this.calculateTargetZoom(p1Pos, p2Pos);

    // Smoothly interpolate to targets
    this.interpolateCamera(delta);

    // Update camera shake
    this.updateShake(delta);

    // Apply to Phaser camera (with shake offset)
    this.applyCamera();
  }

  /**
   * Calculates target camera position (midpoint between players)
   */
  calculateTargetPosition(p1Pos, p2Pos) {
    // Midpoint between players
    let midX = (p1Pos.x + p2Pos.x) / 2;
    let midY = (p1Pos.y + p2Pos.y) / 2;

    // Apply vertical bias (show more sky during flight)
    const groundY = ARENA.groundY;
    const avgY = (p1Pos.y + p2Pos.y) / 2;
    if (avgY < groundY - 200) {
      // Players are flying - shift camera up slightly
      midY -= (groundY - avgY) * CAMERA.verticalBias;
    }

    // Clamp to arena bounds (accounting for viewport size at current zoom)
    const viewWidth = CAMERA.viewportWidth / this.currentZoom;
    const viewHeight = CAMERA.viewportHeight / this.currentZoom;
    const halfViewWidth = viewWidth / 2;
    const halfViewHeight = viewHeight / 2;

    // Horizontal clamping
    const minX = halfViewWidth - CAMERA.boundsPadding.horizontal;
    const maxX = ARENA.width - halfViewWidth + CAMERA.boundsPadding.horizontal;

    // Handle edge case where viewport is larger than or equal to arena
    // In this case, center the camera on the arena
    if (minX >= maxX) {
      midX = ARENA.width / 2;
    } else {
      midX = Math.max(minX, Math.min(maxX, midX));
    }

    // Vertical clamping (allow going up for flight, but not too far down)
    const minY = -200 + halfViewHeight; // Allow seeing sky
    const maxY = ARENA.groundY + 50; // Don't show too much below ground

    // Handle edge case for vertical clamping
    if (minY >= maxY) {
      midY = (ARENA.groundY - 200) / 2; // Center between sky and ground
    } else {
      midY = Math.max(minY, Math.min(maxY, midY));
    }

    this.targetX = midX;
    this.targetY = midY;
  }

  /**
   * Calculates target zoom based on player distance
   */
  calculateTargetZoom(p1Pos, p2Pos) {
    // Calculate distance between players
    const dx = Math.abs(p2Pos.x - p1Pos.x);
    const dy = Math.abs(p2Pos.y - p1Pos.y);

    // Use the larger dimension to determine zoom
    const distance = Math.max(dx, dy);

    // Add padding to ensure players aren't at screen edges
    const paddedDistance = distance + CAMERA.zoomPadding * 2;

    // Calculate zoom needed to fit both players
    // The visible area at zoom Z is: viewportSize / Z
    // We need: visibleSize >= paddedDistance
    // So: viewportSize / Z >= paddedDistance
    // Therefore: Z <= viewportSize / paddedDistance

    // Use the smaller viewport dimension for zoom calculation
    const referenceSize = Math.min(CAMERA.viewportWidth, CAMERA.viewportHeight);
    let desiredZoom = referenceSize / paddedDistance;

    // Clamp zoom to limits
    desiredZoom = Math.max(CAMERA.zoomMin, Math.min(CAMERA.zoomMax, desiredZoom));

    this.targetZoom = desiredZoom;
  }

  /**
   * Smoothly interpolates camera values toward targets
   */
  interpolateCamera(delta) {
    // Normalize delta to 60fps equivalent
    const normalizedDelta = delta / 16.67;

    // Interpolate position
    const posLerp = 1 - Math.pow(1 - CAMERA.positionSmoothing, normalizedDelta);
    this.currentX += (this.targetX - this.currentX) * posLerp;
    this.currentY += (this.targetY - this.currentY) * posLerp;

    // Interpolate zoom
    const zoomLerp = 1 - Math.pow(1 - CAMERA.zoomSmoothing, normalizedDelta);
    this.currentZoom += (this.targetZoom - this.currentZoom) * zoomLerp;
  }

  /**
   * Applies current camera state to Phaser camera
   */
  applyCamera() {
    this.camera.setZoom(this.currentZoom);
    // Apply shake offset to camera position
    this.camera.centerOn(
      this.currentX + this.shakeOffsetX,
      this.currentY + this.shakeOffsetY
    );
  }

  /**
   * Forces camera to immediately snap to target (no interpolation)
   * Useful for scene transitions
   */
  snapToTarget() {
    if (this.players.length < 2) return;

    const p1Pos = this.players[0].getPosition();
    const p2Pos = this.players[1].getPosition();

    this.calculateTargetPosition(p1Pos, p2Pos);
    this.calculateTargetZoom(p1Pos, p2Pos);

    this.currentX = this.targetX;
    this.currentY = this.targetY;
    this.currentZoom = this.targetZoom;

    this.applyCamera();
  }

  /**
   * Gets current camera state for debugging
   */
  getDebugInfo() {
    return {
      position: { x: Math.round(this.currentX), y: Math.round(this.currentY) },
      target: { x: Math.round(this.targetX), y: Math.round(this.targetY) },
      zoom: this.currentZoom.toFixed(2),
      targetZoom: this.targetZoom.toFixed(2),
    };
  }

  // ==================== CAMERA SHAKE ====================

  /**
   * Triggers camera shake effect
   * @param {number} intensity - Shake intensity in pixels (default: 8)
   * @param {number} duration - Duration in milliseconds (default: 200)
   */
  shake(intensity = 8, duration = 200) {
    // Don't override stronger shakes
    if (this.shakeIntensity > intensity && this.shakeElapsed < this.shakeDuration) {
      return;
    }

    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
    this.shakeElapsed = 0;

    logDebug(`CameraSystem: Shake triggered (intensity: ${intensity}, duration: ${duration}ms)`);
  }

  /**
   * Updates camera shake effect
   * @param {number} delta - Time since last frame in ms
   */
  updateShake(delta) {
    if (this.shakeElapsed >= this.shakeDuration) {
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
      this.shakeIntensity = 0;
      return;
    }

    this.shakeElapsed += delta;

    // Calculate shake decay (stronger at start, fades out)
    const progress = this.shakeElapsed / this.shakeDuration;
    const decay = 1 - progress;

    // Scale intensity by zoom level (lower zoom = need more shake to be visible)
    // At zoom 0.5, we need 2x intensity; at zoom 1.0, normal intensity
    const zoomScale = 1 / this.currentZoom;
    const currentIntensity = this.shakeIntensity * decay * zoomScale;

    // Random shake offset using sine waves at different frequencies
    // Higher frequency multiplier for more aggressive shake
    const time = this.scene.time.now * 0.015;
    this.shakeOffsetX = Math.sin(time * 17) * currentIntensity;
    this.shakeOffsetY = Math.cos(time * 23) * currentIntensity * 0.7; // Less vertical
  }

  /**
   * Preset shake for when a player takes damage
   * Light shake for regular hits
   */
  shakeOnHit() {
    this.shake(10, 120);
  }

  /**
   * Preset shake for heavy impacts (knockback, powerful hits)
   */
  shakeOnHeavyHit() {
    this.shake(18, 200);
  }

  /**
   * Preset shake for KO - dramatic effect
   */
  shakeOnKO() {
    this.shake(30, 350);
  }

  // ==================== SLOW MOTION ====================

  /**
   * Triggers slow-motion effect
   * @param {number} scale - Time scale (0.1 = 10% speed, default: 0.3)
   * @param {number} duration - Duration in real milliseconds (default: 500)
   */
  slowMotion(scale = 0.3, duration = 500) {
    if (this.slowMotionActive) return;

    this.slowMotionActive = true;
    this.slowMotionScale = scale;
    this.slowMotionDuration = duration;
    this.slowMotionElapsed = 0;
    this.originalTimeScale = this.scene.time.timeScale;

    // Apply slow motion to the scene
    this.scene.time.timeScale = scale;
    this.scene.matter.world.engine.timing.timeScale = scale;

    logDebug(`CameraSystem: Slow-motion started (scale: ${scale}, duration: ${duration}ms)`);
  }

  /**
   * Updates slow-motion effect
   * @param {number} delta - Time since last frame in ms (real time, not scaled)
   */
  updateSlowMotion(delta) {
    if (!this.slowMotionActive) return;

    // Use real delta time (not affected by timeScale)
    const realDelta = delta / this.scene.time.timeScale;
    this.slowMotionElapsed += realDelta;

    if (this.slowMotionElapsed >= this.slowMotionDuration) {
      // End slow motion
      this.slowMotionActive = false;
      this.scene.time.timeScale = this.originalTimeScale;
      this.scene.matter.world.engine.timing.timeScale = this.originalTimeScale;

      logDebug('CameraSystem: Slow-motion ended');
    }
  }

  /**
   * Triggers dramatic slow-mo for KO moments
   */
  slowMotionKO() {
    this.slowMotion(0.2, 600);
  }

  /**
   * Checks if slow motion is currently active
   * @returns {boolean}
   */
  isSlowMotionActive() {
    return this.slowMotionActive;
  }

  /**
   * Cleans up camera system
   */
  destroy() {
    // Restore time scale if slow motion was active
    if (this.slowMotionActive) {
      this.scene.time.timeScale = this.originalTimeScale;
      this.scene.matter.world.engine.timing.timeScale = this.originalTimeScale;
    }

    this.players = [];
    logInfo('CameraSystem: Destroyed');
  }
}
