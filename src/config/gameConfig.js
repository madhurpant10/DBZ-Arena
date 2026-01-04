import Phaser from 'phaser';
import BootScene from '../scenes/BootScene.js';
import MainMenuScene from '../scenes/MainMenuScene.js';
import ModeSelectScene from '../scenes/ModeSelectScene.js';
import CharacterSelectScene from '../scenes/CharacterSelectScene.js';
import GameScene from '../scenes/GameScene.js';

/**
 * Core Phaser game configuration
 * Uses Matter.js physics for realistic force-based gameplay
 */
const gameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 1280,
  height: 720,
  backgroundColor: '#2d3436',

  physics: {
    default: 'matter',
    matter: {
      gravity: { y: 1.0 }, // Reduced from 1.5 for more floaty feel
      debug: false, // Controlled via debug toggle in-game
      // Enable sleeping for performance (bodies at rest don't compute)
      enableSleeping: false,
    },
  },

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    min: {
      width: 800,
      height: 450,
    },
    max: {
      width: 1920,
      height: 1080,
    },
  },

  scene: [BootScene, MainMenuScene, ModeSelectScene, CharacterSelectScene, GameScene],

  // Render settings
  render: {
    pixelArt: false,
    antialias: true,
  },

  // Input configuration
  input: {
    keyboard: true,
    mouse: false,
    touch: false,
    gamepad: false,
  },
};

export default gameConfig;
