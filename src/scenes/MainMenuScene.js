import Phaser from 'phaser';
import { MENU_CONTROLS } from '../constants/controls.js';
import {
  COLORS,
  LAYOUT,
  TEXT_STYLES,
  createMenuBackground,
  createCornerAccents,
  createTitleAccentLine,
  createNavigationHints,
} from '../constants/uiStyles.js';
import { logInfo } from '../utils/debug.js';

/**
 * MainMenuScene - Premium dark-themed main menu
 * Keyboard-first navigation with polished visual design
 */
export default class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });

    this.menuItems = [
      { label: 'START GAME', action: 'start' },
      { label: 'CONTROLS', action: 'controls' },
      { label: 'SETTINGS', action: 'settings' },
    ];
    this.selectedIndex = 0;
    this.menuTexts = [];
    this.canNavigate = true;
  }

  create() {
    logInfo('MainMenuScene: Creating menu');

    // Reset state on scene restart
    this.selectedIndex = 0;
    this.menuTexts = [];
    this.canNavigate = true;

    // Build UI layers
    this.createBackground();
    this.createTitle();
    this.createMenuItems();
    this.createNavigationHint();

    // Setup input
    this.setupKeyboardInput();

    // Entry animation
    this.playEntryAnimation();
  }

  /**
   * Creates dark background with diagonal pattern
   */
  createBackground() {
    createMenuBackground(this);
    createCornerAccents(this);
  }

  /**
   * Creates the two-tone title: "DBZ" (gold) + "ARENA" (white)
   * Properly centered by measuring both text widths
   */
  createTitle() {
    const { width, height } = this.cameras.main;
    const centerX = width / 2;
    const titleY = height * LAYOUT.titleY;

    // Create texts first to measure their widths
    const dbzText = this.add.text(0, 0, 'DBZ', {
      ...TEXT_STYLES.titlePrimary,
      fontStyle: 'bold',
    });

    const arenaText = this.add.text(0, 0, 'ARENA', {
      ...TEXT_STYLES.titleSecondary,
    });

    // Calculate total width and position for true centering
    const spacing = 12; // Gap between DBZ and ARENA
    const totalWidth = dbzText.width + spacing + arenaText.width;
    const startX = -totalWidth / 2;

    // Position DBZ at the start
    dbzText.setPosition(startX, 0);
    dbzText.setOrigin(0, 0.5);

    // Position ARENA after DBZ with spacing
    arenaText.setPosition(startX + dbzText.width + spacing, 0);
    arenaText.setOrigin(0, 0.5);

    // Container for title elements (for animation)
    this.titleContainer = this.add.container(centerX, titleY);
    this.titleContainer.add([dbzText, arenaText]);

    // Accent line below title - centered on screen
    const lineY = titleY + 55;
    this.titleLine = createTitleAccentLine(this, lineY);

    // Store for animations
    this.titleElements = { dbzText, arenaText };
  }

  /**
   * Creates vertical menu items
   */
  createMenuItems() {
    const { width, height } = this.cameras.main;
    const startY = height * LAYOUT.menuStartY;
    const spacing = height * LAYOUT.menuSpacing;

    this.menuTexts = this.menuItems.map((item, index) => {
      const y = startY + index * spacing;

      const text = this.add.text(width / 2, y, item.label, {
        ...TEXT_STYLES.menuUnselected,
      });
      text.setOrigin(0.5);
      text.setAlpha(0); // Start invisible for entry animation

      return text;
    });

    // Initial selection update (after entry animation)
    this.time.delayedCall(300, () => {
      this.updateMenuSelection();
    });
  }

  /**
   * Creates navigation hints at bottom
   */
  createNavigationHint() {
    this.navHint = createNavigationHints(this, { showBack: false });
    this.navHint.setAlpha(0); // Start invisible
  }

  /**
   * Plays entry animation for UI elements
   */
  playEntryAnimation() {
    const { height } = this.cameras.main;

    // Title slides down
    this.titleContainer.setY(height * LAYOUT.titleY - 50);
    this.titleContainer.setAlpha(0);

    this.tweens.add({
      targets: this.titleContainer,
      y: height * LAYOUT.titleY,
      alpha: 1,
      duration: 400,
      ease: 'Power2.easeOut',
    });

    // Menu items fade in with stagger
    this.menuTexts.forEach((text, index) => {
      this.tweens.add({
        targets: text,
        alpha: 1,
        y: text.y,
        duration: 300,
        delay: 200 + index * 80,
        ease: 'Power2.easeOut',
      });
    });

    // Navigation hint fades in last
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

    this.input.keyboard.on('keydown-ESC', () => {
      // ESC on main menu does nothing (no back)
    });
  }

  /**
   * Navigate menu
   * @param {number} direction - -1 up, 1 down
   */
  navigateMenu(direction) {
    const oldIndex = this.selectedIndex;
    this.selectedIndex += direction;

    // Wrap around
    if (this.selectedIndex < 0) {
      this.selectedIndex = this.menuItems.length - 1;
    } else if (this.selectedIndex >= this.menuItems.length) {
      this.selectedIndex = 0;
    }

    if (oldIndex !== this.selectedIndex) {
      this.updateMenuSelection(oldIndex);
    }
  }

  /**
   * Updates visual state of menu items with smooth transitions
   * @param {number} previousIndex - Previously selected index
   */
  updateMenuSelection(previousIndex = -1) {
    this.menuTexts.forEach((text, index) => {
      const isSelected = index === this.selectedIndex;
      const wasSelected = index === previousIndex;

      if (isSelected) {
        // Animate to selected state
        this.tweens.add({
          targets: text,
          scaleX: 1.1,
          scaleY: 1.1,
          duration: LAYOUT.transitionDuration,
          ease: 'Back.easeOut',
        });

        text.setStyle({
          ...TEXT_STYLES.menuSelected,
        });
        text.setText(this.menuItems[index].label);
      } else {
        // Animate to unselected state
        if (wasSelected) {
          this.tweens.add({
            targets: text,
            scaleX: 1,
            scaleY: 1,
            duration: LAYOUT.transitionDuration,
            ease: 'Power2.easeOut',
          });
        }

        text.setStyle({
          ...TEXT_STYLES.menuUnselected,
        });
        text.setText(this.menuItems[index].label);
        text.setScale(1);
      }
    });
  }

  /**
   * Handles menu item selection
   */
  selectMenuItem() {
    const selected = this.menuItems[this.selectedIndex];
    logInfo(`MainMenuScene: Selected "${selected.label}"`);

    // Flash effect on selection
    this.flashSelection();

    switch (selected.action) {
      case 'start':
        this.transitionToScene('ModeSelectScene');
        break;

      case 'controls':
        this.showControlsOverlay();
        break;

      case 'settings':
        this.showSettingsOverlay();
        break;
    }
  }

  /**
   * Flash effect when selecting an item
   */
  flashSelection() {
    const text = this.menuTexts[this.selectedIndex];
    const originalColor = TEXT_STYLES.menuSelected.color;

    text.setStyle({ ...TEXT_STYLES.menuSelected, color: '#ffffff' });

    this.time.delayedCall(100, () => {
      text.setStyle({ ...TEXT_STYLES.menuSelected, color: originalColor });
    });
  }

  /**
   * Smooth transition to another scene
   * @param {string} sceneKey - Scene to transition to
   */
  transitionToScene(sceneKey) {
    // Fade out animation
    this.cameras.main.fadeOut(200, 13, 17, 23); // Fade to bgDark color

    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(sceneKey);
    });
  }

  /**
   * Displays controls overlay with clean layout
   */
  showControlsOverlay() {
    const { width, height } = this.cameras.main;
    const elements = []; // Track all elements for cleanup

    // Semi-transparent overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.95);
    overlay.fillRect(0, 0, width, height);
    elements.push(overlay);

    // Border frame
    const frameX = width * 0.12;
    const frameY = height * 0.08;
    const frameW = width * 0.76;
    const frameH = height * 0.84;

    overlay.lineStyle(1, COLORS.borderGold, 0.4);
    overlay.strokeRect(frameX, frameY, frameW, frameH);

    // Title - centered at top
    const title = this.add.text(width / 2, frameY + 50, 'CONTROLS', {
      fontSize: '48px',
      fontFamily: TEXT_STYLES.overlayTitle.fontFamily,
      color: COLORS.textGold,
      letterSpacing: 6,
    });
    title.setOrigin(0.5);
    elements.push(title);

    // Content area starts below title
    const contentStartY = frameY + 120;
    const leftCol = width * 0.22;
    const centerCol = width * 0.5;
    const rightCol = width * 0.78;

    // Player headers
    const p1Header = this.add.text(leftCol, contentStartY, 'PLAYER 1', {
      fontSize: '20px',
      fontFamily: TEXT_STYLES.overlayContent.fontFamily,
      color: '#ffffff',
    });
    p1Header.setOrigin(0.5);
    elements.push(p1Header);

    const actionHeader = this.add.text(centerCol, contentStartY, 'ACTION', {
      fontSize: '20px',
      fontFamily: TEXT_STYLES.overlayContent.fontFamily,
      color: COLORS.textGold,
    });
    actionHeader.setOrigin(0.5);
    elements.push(actionHeader);

    const p2Header = this.add.text(rightCol, contentStartY, 'PLAYER 2', {
      fontSize: '20px',
      fontFamily: TEXT_STYLES.overlayContent.fontFamily,
      color: '#ffffff',
    });
    p2Header.setOrigin(0.5);
    elements.push(p2Header);

    // Separator line under headers
    const sepLine = this.add.graphics();
    sepLine.lineStyle(1, COLORS.borderGold, 0.3);
    sepLine.lineBetween(frameX + 40, contentStartY + 25, frameX + frameW - 40, contentStartY + 25);
    elements.push(sepLine);

    // Control rows
    const controls = [
      { p1: 'A / D', action: 'Move', p2: '← / →' },
      { p1: 'W', action: 'Jump / Fly', p2: '↑' },
      { p1: 'S', action: 'Descend', p2: '↓' },
      { p1: 'F', action: 'Attack', p2: 'L' },
      { p1: 'G', action: 'Charge Ki', p2: 'K' },
    ];

    const rowStartY = contentStartY + 55;
    const rowSpacing = 35;

    controls.forEach((ctrl, i) => {
      const y = rowStartY + i * rowSpacing;

      const p1Text = this.add.text(leftCol, y, ctrl.p1, {
        fontSize: '18px',
        fontFamily: TEXT_STYLES.overlayContent.fontFamily,
        color: '#cccccc',
      });
      p1Text.setOrigin(0.5);
      elements.push(p1Text);

      const actionText = this.add.text(centerCol, y, ctrl.action, {
        fontSize: '18px',
        fontFamily: TEXT_STYLES.overlayContent.fontFamily,
        color: '#999999',
      });
      actionText.setOrigin(0.5);
      elements.push(actionText);

      const p2Text = this.add.text(rightCol, y, ctrl.p2, {
        fontSize: '18px',
        fontFamily: TEXT_STYLES.overlayContent.fontFamily,
        color: '#cccccc',
      });
      p2Text.setOrigin(0.5);
      elements.push(p2Text);
    });

    // Flight section
    const flightY = rowStartY + controls.length * rowSpacing + 40;

    const flightTitle = this.add.text(width / 2, flightY, 'FLIGHT', {
      fontSize: '20px',
      fontFamily: TEXT_STYLES.overlayContent.fontFamily,
      color: COLORS.textGold,
    });
    flightTitle.setOrigin(0.5);
    elements.push(flightTitle);

    const flightLine = this.add.graphics();
    flightLine.lineStyle(1, COLORS.borderGold, 0.2);
    flightLine.lineBetween(width * 0.35, flightY + 18, width * 0.65, flightY + 18);
    elements.push(flightLine);

    const flightDesc1 = this.add.text(width / 2, flightY + 40, 'Use all jumps, then hold UP to fly', {
      fontSize: '16px',
      fontFamily: TEXT_STYLES.overlayContent.fontFamily,
      color: '#999999',
    });
    flightDesc1.setOrigin(0.5);
    elements.push(flightDesc1);

    const flightDesc2 = this.add.text(width / 2, flightY + 65, 'Release UP to fall naturally', {
      fontSize: '16px',
      fontFamily: TEXT_STYLES.overlayContent.fontFamily,
      color: '#999999',
    });
    flightDesc2.setOrigin(0.5);
    elements.push(flightDesc2);

    // System section
    const sysY = flightY + 110;

    const sysTitle = this.add.text(width / 2, sysY, 'SYSTEM', {
      fontSize: '20px',
      fontFamily: TEXT_STYLES.overlayContent.fontFamily,
      color: COLORS.textGold,
    });
    sysTitle.setOrigin(0.5);
    elements.push(sysTitle);

    const sysLine = this.add.graphics();
    sysLine.lineStyle(1, COLORS.borderGold, 0.2);
    sysLine.lineBetween(width * 0.35, sysY + 18, width * 0.65, sysY + 18);
    elements.push(sysLine);

    const sysControls = [
      { key: 'ESC', action: 'Pause' },
      { key: '`', action: 'Debug Info' },
    ];

    sysControls.forEach((ctrl, i) => {
      const y = sysY + 45 + i * 30;

      const keyText = this.add.text(width * 0.4, y, ctrl.key, {
        fontSize: '16px',
        fontFamily: TEXT_STYLES.overlayContent.fontFamily,
        color: '#cccccc',
      });
      keyText.setOrigin(0.5);
      elements.push(keyText);

      const actionText = this.add.text(width * 0.6, y, ctrl.action, {
        fontSize: '16px',
        fontFamily: TEXT_STYLES.overlayContent.fontFamily,
        color: '#999999',
      });
      actionText.setOrigin(0.5);
      elements.push(actionText);
    });

    // Fade in all elements
    elements.forEach(el => el.setAlpha(0));

    this.tweens.add({
      targets: elements,
      alpha: { value: 1, duration: 200 },
    });

    // Close handler
    const closeOverlay = () => {
      this.tweens.add({
        targets: elements,
        alpha: 0,
        duration: 150,
        onComplete: () => {
          elements.forEach(el => el.destroy());
        },
      });
      this.input.keyboard.off('keydown-ESC', closeOverlay);
      this.input.keyboard.off('keydown-ENTER', closeOverlay);
    };

    this.input.keyboard.once('keydown-ESC', closeOverlay);
    this.input.keyboard.once('keydown-ENTER', closeOverlay);
  }

  /**
   * Displays settings overlay with clean layout
   */
  showSettingsOverlay() {
    const { width, height } = this.cameras.main;
    const elements = [];

    // Semi-transparent overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.95);
    overlay.fillRect(0, 0, width, height);
    elements.push(overlay);

    // Border frame
    const frameX = width * 0.22;
    const frameY = height * 0.2;
    const frameW = width * 0.56;
    const frameH = height * 0.6;

    overlay.lineStyle(1, COLORS.borderGold, 0.4);
    overlay.strokeRect(frameX, frameY, frameW, frameH);

    // Title
    const title = this.add.text(width / 2, frameY + 50, 'SETTINGS', {
      fontSize: '48px',
      fontFamily: TEXT_STYLES.overlayTitle.fontFamily,
      color: COLORS.textGold,
      letterSpacing: 6,
    });
    title.setOrigin(0.5);
    elements.push(title);

    // Coming soon message
    const comingSoon = this.add.text(width / 2, height / 2 - 20, 'COMING SOON', {
      fontSize: '24px',
      fontFamily: TEXT_STYLES.overlayContent.fontFamily,
      color: '#ffffff',
    });
    comingSoon.setOrigin(0.5);
    elements.push(comingSoon);

    // Planned features
    const plannedTitle = this.add.text(width / 2, height / 2 + 30, 'Planned Options:', {
      fontSize: '16px',
      fontFamily: TEXT_STYLES.overlayContent.fontFamily,
      color: COLORS.textGold,
    });
    plannedTitle.setOrigin(0.5);
    elements.push(plannedTitle);

    const features = ['Audio Volume', 'Screen Shake', 'Control Rebinding'];
    features.forEach((feature, i) => {
      const featureText = this.add.text(width / 2, height / 2 + 65 + i * 28, `• ${feature}`, {
        fontSize: '15px',
        fontFamily: TEXT_STYLES.overlayContent.fontFamily,
        color: '#888888',
      });
      featureText.setOrigin(0.5);
      elements.push(featureText);
    });

    // Close hint
    const closeHint = this.add.text(width / 2, frameY + frameH - 35, '[ ENTER / ESC ] CLOSE', {
      ...TEXT_STYLES.hint,
    });
    closeHint.setOrigin(0.5);
    elements.push(closeHint);

    // Fade in
    elements.forEach(el => el.setAlpha(0));

    this.tweens.add({
      targets: elements,
      alpha: { value: 1, duration: 200 },
    });

    // Close handler
    const closeOverlay = () => {
      this.tweens.add({
        targets: elements,
        alpha: 0,
        duration: 150,
        onComplete: () => {
          elements.forEach(el => el.destroy());
        },
      });
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
