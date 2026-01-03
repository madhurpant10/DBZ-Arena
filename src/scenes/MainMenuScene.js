import Phaser from 'phaser';
import { MENU_CONTROLS } from '../constants/controls.js';
import { logInfo } from '../utils/debug.js';

/**
 * MainMenuScene - Primary menu screen
 * Handles main menu navigation and mode selection
 */
export default class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });

    this.menuItems = ['Start Game', 'Controls'];
    this.selectedIndex = 0;
    this.menuTexts = [];
    this.keys = null;
    this.canNavigate = true;
  }

  create() {
    logInfo('MainMenuScene: Creating menu');

    // Reset state (constructor only runs once)
    this.selectedIndex = 0;
    this.menuTexts = [];
    this.keys = null;
    this.canNavigate = true;

    this.createBackground();
    this.createTitle();
    this.createMenuItems();
    this.createNavigationHint();

    this.setupKeyboardInput();
  }

  /**
   * Creates background elements
   */
  createBackground() {
    const { width, height } = this.cameras.main;

    // Dark gradient background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a12, 0x0a0a12, 0x141428, 0x141428, 1);
    bg.fillRect(0, 0, width, height);

    // Subtle animated energy lines
    this.createEnergyLines(bg, width, height);

    // Corner accents
    this.createCornerAccents(width, height);
  }

  /**
   * Creates subtle energy line decorations
   */
  createEnergyLines(bg, width, height) {
    // Horizontal accent lines
    bg.lineStyle(1, 0xf39c12, 0.15);
    bg.lineBetween(0, height * 0.3, width, height * 0.3);
    bg.lineBetween(0, height * 0.7, width, height * 0.7);

    // Diagonal accent
    bg.lineStyle(2, 0xf39c12, 0.08);
    bg.lineBetween(0, height, width * 0.3, 0);
    bg.lineBetween(width, 0, width * 0.7, height);
  }

  /**
   * Creates corner accent decorations
   */
  createCornerAccents(width, height) {
    const cornerSize = 60;
    const cornerThickness = 3;
    const cornerColor = 0xf39c12;
    const cornerAlpha = 0.4;

    const corners = this.add.graphics();
    corners.lineStyle(cornerThickness, cornerColor, cornerAlpha);

    // Top-left corner
    corners.lineBetween(0, cornerSize, 0, 0);
    corners.lineBetween(0, 0, cornerSize, 0);

    // Top-right corner
    corners.lineBetween(width - cornerSize, 0, width, 0);
    corners.lineBetween(width, 0, width, cornerSize);

    // Bottom-left corner
    corners.lineBetween(0, height - cornerSize, 0, height);
    corners.lineBetween(0, height, cornerSize, height);

    // Bottom-right corner
    corners.lineBetween(width - cornerSize, height, width, height);
    corners.lineBetween(width, height - cornerSize, width, height);
  }

  /**
   * Creates title text
   */
  createTitle() {
    const { width } = this.cameras.main;

    // Main title with glow effect simulation
    const titleShadow = this.add.text(width / 2 + 3, 143, 'DBZ ARENA', {
      fontSize: '80px',
      fontFamily: 'Impact, Haettenschweiler, sans-serif',
      color: '#000000',
    });
    titleShadow.setOrigin(0.5);
    titleShadow.setAlpha(0.5);

    // Main title
    const title = this.add.text(width / 2, 140, 'DBZ ARENA', {
      fontSize: '80px',
      fontFamily: 'Impact, Haettenschweiler, sans-serif',
      color: '#f39c12',
      stroke: '#8B4513',
      strokeThickness: 4,
    });
    title.setOrigin(0.5);

    // Add subtle pulsing animation to title
    this.tweens.add({
      targets: title,
      scaleX: 1.02,
      scaleY: 1.02,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Decorative line under title
    const lineY = 190;
    const lineWidth = 200;
    const titleLine = this.add.graphics();
    titleLine.lineStyle(2, 0xf39c12, 0.6);
    titleLine.lineBetween(width / 2 - lineWidth / 2, lineY, width / 2 + lineWidth / 2, lineY);

    // Small diamond accent in center of line
    titleLine.fillStyle(0xf39c12, 0.8);
    titleLine.fillRect(width / 2 - 4, lineY - 4, 8, 8);
  }

  /**
   * Creates menu item texts
   */
  createMenuItems() {
    const { width, height } = this.cameras.main;
    const startY = height / 2 + 20;
    const spacing = 70;

    this.menuTexts = this.menuItems.map((item, index) => {
      const text = this.add.text(width / 2, startY + index * spacing, item.toUpperCase(), {
        fontSize: '32px',
        fontFamily: 'Impact, Haettenschweiler, sans-serif',
        color: '#666666',
        letterSpacing: 4,
      });
      text.setOrigin(0.5);
      return text;
    });

    this.updateMenuSelection();
  }

  /**
   * Creates navigation hint at bottom
   */
  createNavigationHint() {
    const { width, height } = this.cameras.main;

    const hint = this.add.text(
      width / 2,
      height - 50,
      '[ ↑ ↓ ]  NAVIGATE     [ ENTER ]  SELECT',
      {
        fontSize: '14px',
        fontFamily: 'Consolas, monospace',
        color: '#444444',
        letterSpacing: 2,
      }
    );
    hint.setOrigin(0.5);
  }

  /**
   * Sets up keyboard input handling
   */
  setupKeyboardInput() {
    this.keys = this.input.keyboard.addKeys({
      up: MENU_CONTROLS.up,
      down: MENU_CONTROLS.down,
      confirm: MENU_CONTROLS.confirm,
      back: MENU_CONTROLS.back,
    });

    // Navigation cooldown to prevent rapid scrolling
    const navigationDelay = 200;

    this.input.keyboard.on('keydown-UP', () => {
      if (!this.canNavigate) return;
      this.navigateMenu(-1);
      this.setNavigationCooldown(navigationDelay);
    });

    this.input.keyboard.on('keydown-DOWN', () => {
      if (!this.canNavigate) return;
      this.navigateMenu(1);
      this.setNavigationCooldown(navigationDelay);
    });

    this.input.keyboard.on('keydown-ENTER', () => {
      this.selectMenuItem();
    });
  }

  /**
   * Navigate menu up or down
   * @param {number} direction - -1 for up, 1 for down
   */
  navigateMenu(direction) {
    this.selectedIndex += direction;

    // Wrap around
    if (this.selectedIndex < 0) {
      this.selectedIndex = this.menuItems.length - 1;
    } else if (this.selectedIndex >= this.menuItems.length) {
      this.selectedIndex = 0;
    }

    this.updateMenuSelection();
  }

  /**
   * Updates visual state of menu items
   */
  updateMenuSelection() {
    this.menuTexts.forEach((text, index) => {
      if (index === this.selectedIndex) {
        text.setStyle({
          color: '#f39c12',
          fontSize: '36px',
        });
        text.setText(`▸  ${this.menuItems[index].toUpperCase()}  ◂`);

        // Add selection animation
        this.tweens.add({
          targets: text,
          scaleX: 1.05,
          scaleY: 1.05,
          duration: 150,
          ease: 'Back.easeOut',
        });
      } else {
        text.setStyle({
          color: '#555555',
          fontSize: '32px',
        });
        text.setText(this.menuItems[index].toUpperCase());
        text.setScale(1);
      }
    });
  }

  /**
   * Handles menu item selection
   */
  selectMenuItem() {
    const selected = this.menuItems[this.selectedIndex];
    logInfo(`MainMenuScene: Selected "${selected}"`);

    switch (selected) {
      case 'Start Game':
        this.scene.start('ModeSelectScene');
        break;

      case 'Controls':
        this.showControlsOverlay();
        break;

      default:
        logInfo(`MainMenuScene: Unknown menu item "${selected}"`);
    }
  }

  /**
   * Displays controls overlay
   */
  showControlsOverlay() {
    const { width, height } = this.cameras.main;

    // Overlay background
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.92);
    overlay.fillRect(0, 0, width, height);

    // Border frame
    overlay.lineStyle(2, 0xf39c12, 0.5);
    overlay.strokeRect(width * 0.15, height * 0.1, width * 0.7, height * 0.8);

    // Title
    const overlayTitle = this.add.text(width / 2, height * 0.18, 'CONTROLS', {
      fontSize: '36px',
      fontFamily: 'Impact, Haettenschweiler, sans-serif',
      color: '#f39c12',
      letterSpacing: 6,
    });
    overlayTitle.setOrigin(0.5);

    // Controls content
    const controlsContent = [
      '',
      'PLAYER 1                    PLAYER 2',
      '─────────                   ─────────',
      'A / D        Move           ← / →',
      'W            Jump           ↑',
      'F            Attack         L',
      '',
      '',
      'SYSTEM',
      '─────────',
      'ESC          Pause',
      '`            Debug Info',
      'F1           Physics Debug',
    ];

    const controlsText = this.add.text(width / 2, height / 2, controlsContent.join('\n'), {
      fontSize: '18px',
      fontFamily: 'Consolas, Monaco, monospace',
      color: '#cccccc',
      align: 'center',
      lineSpacing: 10,
    });
    controlsText.setOrigin(0.5);

    // Close hint
    const closeHint = this.add.text(width / 2, height * 0.85, '[ ENTER / ESC ]  CLOSE', {
      fontSize: '14px',
      fontFamily: 'Consolas, monospace',
      color: '#666666',
      letterSpacing: 2,
    });
    closeHint.setOrigin(0.5);

    // Close overlay on key press
    const closeOverlay = () => {
      overlay.destroy();
      overlayTitle.destroy();
      controlsText.destroy();
      closeHint.destroy();
      this.input.keyboard.off('keydown-ESC', closeOverlay);
      this.input.keyboard.off('keydown-ENTER', closeOverlay);
    };

    this.input.keyboard.once('keydown-ESC', closeOverlay);
    this.input.keyboard.once('keydown-ENTER', closeOverlay);
  }

  /**
   * Sets navigation cooldown
   * @param {number} delay - Milliseconds
   */
  setNavigationCooldown(delay) {
    this.canNavigate = false;
    this.time.delayedCall(delay, () => {
      this.canNavigate = true;
    });
  }
}
