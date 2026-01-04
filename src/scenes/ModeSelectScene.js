import Phaser from 'phaser';
import { logInfo } from '../utils/debug.js';

/**
 * ModeSelectScene - Game mode selection screen
 * Allows players to choose between different game modes
 */
export default class ModeSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ModeSelectScene' });

    // Mode definitions - easily extensible
    this.modes = [
      {
        key: 'local1v1',
        name: 'LOCAL 1V1',
        description: 'Two players, one keyboard',
        available: true,
      },
      {
        key: 'training',
        name: 'TRAINING',
        description: 'Practice your moves',
        available: false,
      },
      {
        key: 'arcade',
        name: 'ARCADE',
        description: 'Fight through challengers',
        available: false,
      },
    ];

    this.selectedIndex = 0;
    this.modeCards = [];
    this.canNavigate = true;
  }

  create() {
    logInfo('ModeSelectScene: Creating mode selection');

    // Reset state (constructor only runs once)
    this.selectedIndex = 0;
    this.modeCards = [];
    this.canNavigate = true;

    this.createBackground();
    this.createHeader();
    this.createModeCards();
    this.createFooter();

    this.setupKeyboardInput();
  }

  /**
   * Creates background
   */
  createBackground() {
    const { width, height } = this.cameras.main;

    // Dark gradient background matching main menu
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a12, 0x0a0a12, 0x141428, 0x141428, 1);
    bg.fillRect(0, 0, width, height);

    // Subtle diagonal lines
    bg.lineStyle(2, 0xf39c12, 0.05);
    bg.lineBetween(0, height, width * 0.4, 0);
    bg.lineBetween(width, 0, width * 0.6, height);

    // Corner accents
    this.createCornerAccents(bg, width, height);
  }

  /**
   * Creates corner accent decorations
   */
  createCornerAccents(bg, width, height) {
    const cornerSize = 40;
    bg.lineStyle(2, 0xf39c12, 0.3);

    // Top-left
    bg.lineBetween(0, cornerSize, 0, 0);
    bg.lineBetween(0, 0, cornerSize, 0);

    // Top-right
    bg.lineBetween(width - cornerSize, 0, width, 0);
    bg.lineBetween(width, 0, width, cornerSize);

    // Bottom-left
    bg.lineBetween(0, height - cornerSize, 0, height);
    bg.lineBetween(0, height, cornerSize, height);

    // Bottom-right
    bg.lineBetween(width - cornerSize, height, width, height);
    bg.lineBetween(width, height - cornerSize, width, height);
  }

  /**
   * Creates header section
   */
  createHeader() {
    const { width } = this.cameras.main;

    // Title shadow
    const titleShadow = this.add.text(width / 2 + 2, 72, 'SELECT MODE', {
      fontSize: '42px',
      fontFamily: 'Impact, Haettenschweiler, sans-serif',
      color: '#000000',
    });
    titleShadow.setOrigin(0.5);
    titleShadow.setAlpha(0.5);

    // Title
    const title = this.add.text(width / 2, 70, 'SELECT MODE', {
      fontSize: '42px',
      fontFamily: 'Impact, Haettenschweiler, sans-serif',
      color: '#f39c12',
      letterSpacing: 4,
    });
    title.setOrigin(0.5);

    // Decorative line
    const line = this.add.graphics();
    line.lineStyle(2, 0xf39c12, 0.4);
    line.lineBetween(width / 2 - 120, 100, width / 2 + 120, 100);
  }

  /**
   * Creates mode selection cards
   */
  createModeCards() {
    const { width, height } = this.cameras.main;
    const cardWidth = 280;
    const cardHeight = 160;
    const spacing = 30;
    const totalWidth = this.modes.length * cardWidth + (this.modes.length - 1) * spacing;
    const startX = (width - totalWidth) / 2 + cardWidth / 2;
    const y = height / 2 + 10;

    this.modeCards = this.modes.map((mode, index) => {
      const x = startX + index * (cardWidth + spacing);
      return this.createModeCard(x, y, cardWidth, cardHeight, mode, index);
    });

    this.updateModeSelection();
  }

  /**
   * Creates a single mode card
   */
  createModeCard(x, y, cardWidth, cardHeight, mode, index) {
    const container = this.add.container(x, y);

    // Card background
    const bg = this.add.graphics();
    bg.fillStyle(mode.available ? 0x1a1a28 : 0x0f0f18, 1);
    bg.fillRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 8);
    container.add(bg);

    // Border
    const border = this.add.graphics();
    border.lineStyle(2, 0x333344, 1);
    border.strokeRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 8);
    container.add(border);

    // Mode name
    const nameText = this.add.text(0, -35, mode.name, {
      fontSize: '26px',
      fontFamily: 'Impact, Haettenschweiler, sans-serif',
      color: mode.available ? '#ffffff' : '#444444',
      letterSpacing: 2,
    });
    nameText.setOrigin(0.5);
    container.add(nameText);

    // Description
    const descText = this.add.text(0, 5, mode.description, {
      fontSize: '14px',
      fontFamily: 'Consolas, monospace',
      color: mode.available ? '#888888' : '#333333',
    });
    descText.setOrigin(0.5);
    container.add(descText);

    // Coming soon badge for unavailable modes
    if (!mode.available) {
      const badge = this.add.text(0, 45, 'COMING SOON', {
        fontSize: '11px',
        fontFamily: 'Consolas, monospace',
        color: '#f39c12',
        letterSpacing: 2,
      });
      badge.setOrigin(0.5);
      badge.setAlpha(0.7);
      container.add(badge);
    }

    return {
      container,
      bg,
      border,
      nameText,
      descText,
      mode,
      cardWidth,
      cardHeight,
    };
  }

  /**
   * Creates footer with navigation hints
   */
  createFooter() {
    const { width, height } = this.cameras.main;

    const hint = this.add.text(
      width / 2,
      height - 50,
      '[ ← → ]  SELECT     [ ENTER ]  CONFIRM     [ ESC ]  BACK',
      {
        fontSize: '14px',
        fontFamily: 'Consolas, monospace',
        color: '#444444',
        letterSpacing: 1,
      }
    );
    hint.setOrigin(0.5);
  }

  /**
   * Sets up keyboard input
   */
  setupKeyboardInput() {
    const navigationDelay = 200;

    this.input.keyboard.on('keydown-LEFT', () => {
      if (!this.canNavigate) return;
      this.navigateModes(-1);
      this.setNavigationCooldown(navigationDelay);
    });

    this.input.keyboard.on('keydown-RIGHT', () => {
      if (!this.canNavigate) return;
      this.navigateModes(1);
      this.setNavigationCooldown(navigationDelay);
    });

    this.input.keyboard.on('keydown-ENTER', () => {
      this.selectMode();
    });

    this.input.keyboard.on('keydown-ESC', () => {
      this.goBack();
    });
  }

  /**
   * Navigate modes left or right
   */
  navigateModes(direction) {
    this.selectedIndex += direction;

    // Wrap around
    if (this.selectedIndex < 0) {
      this.selectedIndex = this.modes.length - 1;
    } else if (this.selectedIndex >= this.modes.length) {
      this.selectedIndex = 0;
    }

    this.updateModeSelection();
  }

  /**
   * Updates visual state of mode cards
   */
  updateModeSelection() {
    this.modeCards.forEach((card, index) => {
      const isSelected = index === this.selectedIndex;
      const mode = card.mode;
      const hw = card.cardWidth / 2;
      const hh = card.cardHeight / 2;

      // Update border
      card.border.clear();
      if (isSelected) {
        card.border.lineStyle(2, mode.available ? 0xf39c12 : 0x555555, 1);
      } else {
        card.border.lineStyle(2, 0x333344, 1);
      }
      card.border.strokeRoundedRect(-hw, -hh, card.cardWidth, card.cardHeight, 8);

      // Scale animation
      const targetScale = isSelected ? 1.08 : 1;
      this.tweens.add({
        targets: card.container,
        scaleX: targetScale,
        scaleY: targetScale,
        duration: 120,
        ease: 'Back.easeOut',
      });

      // Update name color on selection
      if (isSelected && mode.available) {
        card.nameText.setColor('#f39c12');
      } else {
        card.nameText.setColor(mode.available ? '#ffffff' : '#444444');
      }
    });
  }

  /**
   * Handles mode selection
   */
  selectMode() {
    const selectedMode = this.modes[this.selectedIndex];

    if (!selectedMode.available) {
      logInfo(`ModeSelectScene: Mode "${selectedMode.name}" not available`);
      this.showUnavailableMessage();
      return;
    }

    logInfo(`ModeSelectScene: Starting "${selectedMode.name}"`);

    switch (selectedMode.key) {
      case 'local1v1':
        this.scene.start('CharacterSelectScene', { mode: 'local1v1' });
        break;

      default:
        logInfo(`ModeSelectScene: Unknown mode "${selectedMode.key}"`);
    }
  }

  /**
   * Shows message when unavailable mode is selected
   */
  showUnavailableMessage() {
    const { width, height } = this.cameras.main;

    const message = this.add.text(width / 2, height - 100, 'MODE NOT YET AVAILABLE', {
      fontSize: '16px',
      fontFamily: 'Consolas, monospace',
      color: '#f39c12',
      letterSpacing: 2,
    });
    message.setOrigin(0.5);
    message.setAlpha(0);

    this.tweens.add({
      targets: message,
      alpha: 1,
      duration: 200,
      yoyo: true,
      hold: 1200,
      onComplete: () => message.destroy(),
    });
  }

  /**
   * Returns to main menu
   */
  goBack() {
    this.scene.start('MainMenuScene');
  }

  /**
   * Sets navigation cooldown
   */
  setNavigationCooldown(delay) {
    this.canNavigate = false;
    this.time.delayedCall(delay, () => {
      this.canNavigate = true;
    });
  }
}
