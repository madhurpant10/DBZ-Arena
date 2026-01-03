import Phaser from 'phaser';
import gameConfig from './config/gameConfig.js';

/**
 * Application entry point
 * Initializes the Phaser game instance
 */
const game = new Phaser.Game(gameConfig);

// Expose game instance for debugging in development
if (import.meta.env.DEV) {
  window.__PHASER_GAME__ = game;
}

export default game;
