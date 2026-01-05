import Phaser from 'phaser';
import { logInfo } from '../utils/debug.js';
import {
  COLORS,
  FONTS,
  LAYOUT,
  TEXT_STYLES,
  createMenuBackground,
  createCornerAccents,
} from '../constants/uiStyles.js';

/**
 * ModeSelectScene - Premium game mode selection screen
 * Horizontal card layout with refined selection feedback
 */
export default class ModeSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ModeSelectScene' });

    // Mode definitions
    this.modes = [
      {
        key: 'local1v1',
        name: 'LOCAL 1V1',
        description: 'Two players,\none keyboard',
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

    // Reset state
    this.selectedIndex = 0;
    this.modeCards = [];
    this.canNavigate = true;

    this.createBackground();
    this.createHeader();
    this.createModeCards();
    this.createFooter();
    this.setupKeyboardInput();

    // Entry animation
    this.playEntryAnimation();
  }

  /**
   * Creates premium dark background with diagonal pattern
   */
  createBackground() {
    createMenuBackground(this);
    createCornerAccents(this);
  }

  /**
   * Creates header with two-tone title
   */
  createHeader() {
    const { width, height } = this.cameras.main;
    const centerX = width / 2;
    const titleY = height * 0.18;

    // Create "SELECT" text (white)
    const selectText = this.add.text(0, 0, 'SELECT', {
      fontSize: '72px',
      fontFamily: FONTS.title.fontFamily,
      color: '#ffffff',
    });

    // Create "MODE" text (gold)
    const modeText = this.add.text(0, 0, 'MODE', {
      fontSize: '72px',
      fontFamily: FONTS.title.fontFamily,
      color: COLORS.textGold,
    });

    // Calculate centering
    const spacing = 20;
    const totalWidth = selectText.width + spacing + modeText.width;
    const startX = -totalWidth / 2;

    selectText.setPosition(startX, 0);
    selectText.setOrigin(0, 0.5);

    modeText.setPosition(startX + selectText.width + spacing, 0);
    modeText.setOrigin(0, 0.5);

    // Container for animation
    this.titleContainer = this.add.container(centerX, titleY);
    this.titleContainer.add([selectText, modeText]);

    // Accent line below "MODE"
    const lineY = titleY + 45;
    const modeStartX = centerX + startX + selectText.width + spacing;
    const modeEndX = modeStartX + modeText.width;

    const accentLine = this.add.graphics();
    accentLine.lineStyle(3, COLORS.gold, 0.8);
    accentLine.lineBetween(modeStartX, lineY, modeEndX, lineY);
    this.accentLine = accentLine;
  }

  /**
   * Creates mode selection cards
   */
  createModeCards() {
    const { width, height } = this.cameras.main;
    const cardWidth = 260;
    const cardHeight = 260;
    const spacing = 40;
    const totalWidth = this.modes.length * cardWidth + (this.modes.length - 1) * spacing;
    const startX = (width - totalWidth) / 2 + cardWidth / 2;
    const y = height * 0.52;

    this.modeCards = this.modes.map((mode, index) => {
      const x = startX + index * (cardWidth + spacing);
      return this.createModeCard(x, y, cardWidth, cardHeight, mode, index);
    });

    this.updateModeSelection(false); // No animation on initial setup
  }

  /**
   * Creates a single premium mode card
   */
  createModeCard(x, y, cardWidth, cardHeight, mode, index) {
    const container = this.add.container(x, y);
    container.setAlpha(0); // Start invisible for entry animation

    // Glow effect (behind everything, only for selected)
    const glow = this.add.graphics();
    glow.setAlpha(0);
    container.add(glow);

    // Card background with gradient effect
    const bgGradient = this.add.graphics();
    if (mode.available) {
      // Subtle gradient from dark to slightly lighter
      bgGradient.fillStyle(0x161b22, 1);
      bgGradient.fillRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 6);
      // Top highlight
      bgGradient.fillStyle(0x1c2128, 1);
      bgGradient.fillRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight / 3, { tl: 6, tr: 6, bl: 0, br: 0 });
    } else {
      // Darker for disabled
      bgGradient.fillStyle(0x0d1117, 1);
      bgGradient.fillRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 6);
    }
    container.add(bgGradient);

    // Border
    const border = this.add.graphics();
    border.lineStyle(1.5, mode.available ? COLORS.borderMuted : 0x21262d, 1);
    border.strokeRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 6);
    container.add(border);

    // Mode name
    const nameText = this.add.text(0, -50, mode.name, {
      fontSize: '32px',
      fontFamily: FONTS.title.fontFamily,
      color: mode.available ? '#ffffff' : '#484f58',
    });
    nameText.setOrigin(0.5);
    container.add(nameText);

    // Description
    const descText = this.add.text(0, 10, mode.description, {
      fontSize: '15px',
      fontFamily: FONTS.helper.fontFamily,
      color: mode.available ? '#8b949e' : '#484f58',
      align: 'center',
      lineSpacing: 4,
    });
    descText.setOrigin(0.5);
    container.add(descText);

    // Coming soon badge for unavailable modes
    let badge = null;
    if (!mode.available) {
      const badgeBg = this.add.graphics();
      badgeBg.lineStyle(1, COLORS.borderMuted, 0.6);
      badgeBg.strokeRoundedRect(-55, 55, 110, 24, 3);
      container.add(badgeBg);

      badge = this.add.text(0, 67, 'COMING SOON', {
        fontSize: '10px',
        fontFamily: FONTS.mono.fontFamily,
        color: '#6e7681',
        letterSpacing: 2,
      });
      badge.setOrigin(0.5);
      container.add(badge);
    }

    // Checkmark indicator (only shown when selected and available)
    const checkCircle = this.add.graphics();
    checkCircle.setAlpha(0);
    container.add(checkCircle);

    return {
      container,
      glow,
      bgGradient,
      border,
      nameText,
      descText,
      badge,
      checkCircle,
      mode,
      cardWidth,
      cardHeight,
      x,
      y,
    };
  }

  /**
   * Creates footer with navigation hints
   */
  createFooter() {
    const { width, height } = this.cameras.main;
    const y = height * LAYOUT.hintY;

    // Create styled hint groups
    const hintContainer = this.add.container(width / 2, y);

    const hints = [
      { key: '[ ← → ]', action: 'SELECT' },
      { key: '[ ENTER ]', action: 'CONFIRM' },
      { key: '[ ESC ]', action: 'BACK' },
    ];

    let totalWidth = 0;
    const spacing = 50;
    const elements = [];

    hints.forEach((hint, i) => {
      const keyText = this.add.text(0, 0, hint.key, {
        fontSize: '13px',
        fontFamily: FONTS.mono.fontFamily,
        color: '#6e7681',
      });

      const actionText = this.add.text(keyText.width + 8, 0, hint.action, {
        fontSize: '13px',
        fontFamily: FONTS.mono.fontFamily,
        color: COLORS.textMuted,
      });

      elements.push({ keyText, actionText, width: keyText.width + 8 + actionText.width });
      totalWidth += keyText.width + 8 + actionText.width + (i < hints.length - 1 ? spacing : 0);
    });

    // Position elements
    let currentX = -totalWidth / 2;
    elements.forEach((el, i) => {
      el.keyText.setPosition(currentX, 0);
      el.actionText.setPosition(currentX + el.keyText.width + 8, 0);
      hintContainer.add([el.keyText, el.actionText]);
      currentX += el.width + spacing;
    });

    this.navHint = hintContainer;
    this.navHint.setAlpha(0); // Start invisible
  }

  /**
   * Plays entry animation
   */
  playEntryAnimation() {
    const { height } = this.cameras.main;

    // Title slides down
    this.titleContainer.setY(height * 0.18 - 30);
    this.titleContainer.setAlpha(0);

    this.tweens.add({
      targets: this.titleContainer,
      y: height * 0.18,
      alpha: 1,
      duration: 400,
      ease: 'Power2.easeOut',
    });

    // Accent line fades in
    this.accentLine.setAlpha(0);
    this.tweens.add({
      targets: this.accentLine,
      alpha: 1,
      duration: 300,
      delay: 200,
    });

    // Cards stagger in from bottom
    this.modeCards.forEach((card, index) => {
      card.container.setY(card.y + 40);
      this.tweens.add({
        targets: card.container,
        y: card.y,
        alpha: 1,
        duration: 350,
        delay: 150 + index * 80,
        ease: 'Power2.easeOut',
        onComplete: () => {
          if (index === this.modeCards.length - 1) {
            this.updateModeSelection(true);
          }
        },
      });
    });

    // Nav hint fades in last
    this.tweens.add({
      targets: this.navHint,
      alpha: 1,
      duration: 300,
      delay: 500,
    });
  }

  /**
   * Sets up keyboard input
   */
  setupKeyboardInput() {
    const navigationDelay = 150;

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

    this.updateModeSelection(true);
  }

  /**
   * Updates visual state of mode cards
   */
  updateModeSelection(animate = true) {
    this.modeCards.forEach((card, index) => {
      const isSelected = index === this.selectedIndex;
      const mode = card.mode;
      const hw = card.cardWidth / 2;
      const hh = card.cardHeight / 2;

      // Update border
      card.border.clear();
      if (isSelected && mode.available) {
        card.border.lineStyle(2, COLORS.borderGold, 1);
      } else if (isSelected && !mode.available) {
        card.border.lineStyle(1.5, 0x484f58, 1);
      } else {
        card.border.lineStyle(1.5, mode.available ? COLORS.borderMuted : 0x21262d, 1);
      }
      card.border.strokeRoundedRect(-hw, -hh, card.cardWidth, card.cardHeight, 6);

      // Update glow effect
      card.glow.clear();
      if (isSelected && mode.available) {
        card.glow.fillStyle(COLORS.gold, 0.08);
        card.glow.fillRoundedRect(-hw - 4, -hh - 4, card.cardWidth + 8, card.cardHeight + 8, 8);
      }

      // Animate glow
      const glowAlpha = isSelected && mode.available ? 1 : 0;
      if (animate) {
        this.tweens.add({
          targets: card.glow,
          alpha: glowAlpha,
          duration: 150,
        });
      } else {
        card.glow.setAlpha(glowAlpha);
      }

      // Scale animation - subtle elevation
      const targetScale = isSelected ? 1.04 : 1;
      if (animate) {
        this.tweens.add({
          targets: card.container,
          scaleX: targetScale,
          scaleY: targetScale,
          duration: 180,
          ease: 'Cubic.easeOut',
        });
      } else {
        card.container.setScale(targetScale);
      }

      // Update name color
      if (isSelected && mode.available) {
        card.nameText.setColor(COLORS.textGold);
      } else {
        card.nameText.setColor(mode.available ? '#ffffff' : '#484f58');
      }

      // Update checkmark indicator
      card.checkCircle.clear();
      if (isSelected && mode.available) {
        // Draw circle with checkmark at bottom center of card
        const circleY = hh + 15;
        card.checkCircle.fillStyle(COLORS.gold, 1);
        card.checkCircle.fillCircle(0, circleY, 14);

        // Checkmark (using lines)
        card.checkCircle.lineStyle(2.5, 0x0d1117, 1);
        card.checkCircle.lineBetween(-5, circleY, -1, circleY + 4);
        card.checkCircle.lineBetween(-1, circleY + 4, 6, circleY - 4);

        if (animate) {
          card.checkCircle.setAlpha(0);
          this.tweens.add({
            targets: card.checkCircle,
            alpha: 1,
            duration: 150,
          });
        } else {
          card.checkCircle.setAlpha(1);
        }
      } else {
        card.checkCircle.setAlpha(0);
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

    // Confirmation flash effect
    const card = this.modeCards[this.selectedIndex];
    this.tweens.add({
      targets: card.container,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 100,
      yoyo: true,
      onComplete: () => {
        this.transitionToNextScene(selectedMode);
      },
    });
  }

  /**
   * Transitions to next scene with fade
   */
  transitionToNextScene(mode) {
    this.cameras.main.fadeOut(200, 13, 17, 23);

    this.cameras.main.once('camerafadeoutcomplete', () => {
      switch (mode.key) {
        case 'local1v1':
          this.scene.start('CharacterSelectScene', { mode: 'local1v1' });
          break;
        default:
          logInfo(`ModeSelectScene: Unknown mode "${mode.key}"`);
      }
    });
  }

  /**
   * Shows message when unavailable mode is selected
   */
  showUnavailableMessage() {
    const { width, height } = this.cameras.main;

    const message = this.add.text(width / 2, height * 0.78, 'MODE NOT YET AVAILABLE', {
      fontSize: '14px',
      fontFamily: FONTS.mono.fontFamily,
      color: COLORS.textGold,
      letterSpacing: 2,
    });
    message.setOrigin(0.5);
    message.setAlpha(0);

    this.tweens.add({
      targets: message,
      alpha: 1,
      duration: 150,
      yoyo: true,
      hold: 1000,
      onComplete: () => message.destroy(),
    });
  }

  /**
   * Returns to main menu with transition
   */
  goBack() {
    this.cameras.main.fadeOut(200, 13, 17, 23);

    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('MainMenuScene');
    });
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
