/**
 * Debug utilities for development
 * Provides logging, visualization, and debugging tools
 */

/**
 * Debug state management
 */
class DebugManager {
  constructor() {
    this.enabled = false;
    this.physicsDebugEnabled = false;
    this.logLevel = 'info'; // 'none', 'error', 'warn', 'info', 'debug'
    this.graphics = null;
    this.scene = null;
  }

  /**
   * Initialize debug manager with a scene
   * @param {Phaser.Scene} scene - The scene to attach debug rendering to
   */
  init(scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(1000); // Render on top
  }

  /**
   * Toggle debug mode
   */
  toggle() {
    this.enabled = !this.enabled;
    this.log('info', `Debug mode: ${this.enabled ? 'ON' : 'OFF'}`);
    return this.enabled;
  }

  /**
   * Toggle physics debug rendering
   * @param {Phaser.Scene} scene - The scene containing matter physics
   */
  togglePhysicsDebug(scene) {
    this.physicsDebugEnabled = !this.physicsDebugEnabled;

    if (scene && scene.matter && scene.matter.world) {
      scene.matter.world.drawDebug = this.physicsDebugEnabled;

      if (this.physicsDebugEnabled) {
        scene.matter.world.createDebugGraphic();
      } else if (scene.matter.world.debugGraphic) {
        scene.matter.world.debugGraphic.destroy();
        scene.matter.world.debugGraphic = null;
      }
    }

    this.log('info', `Physics debug: ${this.physicsDebugEnabled ? 'ON' : 'OFF'}`);
    return this.physicsDebugEnabled;
  }

  /**
   * Log message with level filtering
   * @param {string} level - Log level
   * @param {string} message - Message to log
   * @param {any} data - Optional data to log
   */
  log(level, message, data = null) {
    if (!this.shouldLog(level)) return;

    const prefix = `[DBZ-${level.toUpperCase()}]`;

    if (data) {
      console[level === 'debug' ? 'log' : level](prefix, message, data);
    } else {
      console[level === 'debug' ? 'log' : level](prefix, message);
    }
  }

  /**
   * Check if should log at given level
   * @param {string} level - Log level to check
   * @returns {boolean}
   */
  shouldLog(level) {
    const levels = ['none', 'error', 'warn', 'info', 'debug'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex <= currentLevelIndex;
  }

  /**
   * Draw a debug rectangle
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} width - Width
   * @param {number} height - Height
   * @param {number} color - Color hex value
   */
  drawRect(x, y, width, height, color = 0xff0000) {
    if (!this.enabled || !this.graphics) return;

    this.graphics.lineStyle(2, color, 1);
    this.graphics.strokeRect(x - width / 2, y - height / 2, width, height);
  }

  /**
   * Draw a debug circle
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} radius - Radius
   * @param {number} color - Color hex value
   */
  drawCircle(x, y, radius, color = 0x00ff00) {
    if (!this.enabled || !this.graphics) return;

    this.graphics.lineStyle(2, color, 1);
    this.graphics.strokeCircle(x, y, radius);
  }

  /**
   * Draw velocity vector
   * @param {number} x - Start X
   * @param {number} y - Start Y
   * @param {Object} velocity - Velocity object with x, y
   * @param {number} scale - Scale factor for visibility
   */
  drawVelocity(x, y, velocity, scale = 10) {
    if (!this.enabled || !this.graphics) return;

    this.graphics.lineStyle(2, 0x00ffff, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(x, y);
    this.graphics.lineTo(x + velocity.x * scale, y + velocity.y * scale);
    this.graphics.strokePath();
  }

  /**
   * Clear debug graphics
   */
  clear() {
    if (this.graphics) {
      this.graphics.clear();
    }
  }

  /**
   * Destroy debug manager
   */
  destroy() {
    if (this.graphics) {
      this.graphics.destroy();
      this.graphics = null;
    }
    this.scene = null;
  }
}

// Export singleton instance
export const debug = new DebugManager();

// Export convenience functions
export const log = (level, message, data) => debug.log(level, message, data);
export const logInfo = (message, data) => debug.log('info', message, data);
export const logWarn = (message, data) => debug.log('warn', message, data);
export const logError = (message, data) => debug.log('error', message, data);
export const logDebug = (message, data) => debug.log('debug', message, data);
