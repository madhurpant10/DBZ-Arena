import Phaser from 'phaser';
import { logInfo } from '../utils/debug.js';

/**
 * BootScene - Initial loading scene
 * Handles any preloading and initial setup before the game starts
 */
export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    logInfo('BootScene: Preloading assets...');

    // Create loading bar
    this.createLoadingBar();

    // Preload any global assets here
    // For now, we're using graphics primitives, so nothing to load
  }

  create() {
    logInfo('BootScene: Boot complete, transitioning to MainMenu');

    // Small delay for visual polish
    this.time.delayedCall(500, () => {
      this.scene.start('MainMenuScene');
    });
  }

  /**
   * Creates a simple loading bar display
   */
  createLoadingBar() {
    const { width, height } = this.cameras.main;
    const centerX = width / 2;
    const centerY = height / 2;

    // Loading text
    const loadingText = this.add.text(centerX, centerY - 50, 'LOADING...', {
      fontSize: '32px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
    });
    loadingText.setOrigin(0.5);

    // Progress bar background
    const progressBarBg = this.add.graphics();
    progressBarBg.fillStyle(0x222222, 1);
    progressBarBg.fillRect(centerX - 150, centerY, 300, 30);

    // Progress bar fill
    const progressBar = this.add.graphics();

    // Listen to loading progress
    this.load.on('progress', (value) => {
      progressBar.clear();
      progressBar.fillStyle(0xf39c12, 1);
      progressBar.fillRect(centerX - 145, centerY + 5, 290 * value, 20);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBarBg.destroy();
      loadingText.destroy();
    });
  }
}
