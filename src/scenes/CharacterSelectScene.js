/**
 * CharacterSelectScene
 *
 * Two-player character selection screen for local 1v1.
 * Both players select on the same screen using keyboard controls.
 *
 * Player 1: A/D to cycle, F to confirm
 * Player 2: Left/Right arrows to cycle, L to confirm
 */

import { characters, getNextCharacter } from '../characters/index.js';

export default class CharacterSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CharacterSelectScene' });
  }

  init(data) {
    // Receive any data from previous scene (e.g., game mode)
    this.gameMode = data?.mode || '1v1';
  }

  create() {
    const { width, height } = this.scale;

    // Player selection state
    this.player1 = {
      selectedIndex: 0,
      confirmed: false,
    };
    this.player2 = {
      selectedIndex: 1, // Start on different character
      confirmed: false,
    };

    // Input cooldown to prevent rapid cycling
    this.inputCooldown = {
      player1: 0,
      player2: 0,
    };
    this.cooldownDuration = 150; // ms between inputs

    // Create UI
    this.createBackground(width, height);
    this.createTitle(width);
    this.createPlayerPanels(width, height);
    this.createBottomBar(width, height);

    // Setup input
    this.setupInput();

    // Initial render
    this.updateDisplay();
  }

  createBackground(width, height) {
    // Deep space gradient background
    const bg = this.add.graphics();

    // Create gradient effect with multiple rectangles
    const gradientSteps = 20;
    for (let i = 0; i < gradientSteps; i++) {
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(
        { r: 10, g: 10, b: 30 },
        { r: 25, g: 25, b: 50 },
        gradientSteps,
        i
      );
      const colorInt = Phaser.Display.Color.GetColor(color.r, color.g, color.b);
      bg.fillStyle(colorInt, 1);
      bg.fillRect(0, (height / gradientSteps) * i, width, height / gradientSteps + 1);
    }

    // Subtle grid pattern overlay
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x2a2a4a, 0.2);
    const gridSize = 40;
    for (let x = 0; x < width; x += gridSize) {
      grid.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y < height; y += gridSize) {
      grid.lineBetween(0, y, width, y);
    }
  }

  createTitle(width) {
    const titleY = 45;

    // Main title with shadow effect
    this.add.text(width / 2 + 3, titleY + 3, 'SELECT YOUR FIGHTER', {
      fontSize: '42px',
      fontFamily: 'Arial Black, Impact, sans-serif',
      color: '#000000',
    }).setOrigin(0.5).setAlpha(0.5);

    this.add.text(width / 2, titleY, 'SELECT YOUR FIGHTER', {
      fontSize: '42px',
      fontFamily: 'Arial Black, Impact, sans-serif',
      color: '#ffffff',
    }).setOrigin(0.5);
  }

  createPlayerPanels(width, height) {
    const panelWidth = 420;
    const panelHeight = 480;
    const panelY = height / 2 + 30;

    // Player 1 Panel (Left)
    this.p1Panel = this.createPanel(
      width / 4 + 20,
      panelY,
      panelWidth,
      panelHeight,
      'PLAYER 1',
      0xff6b35,
      1
    );

    // Player 2 Panel (Right)
    this.p2Panel = this.createPanel(
      (width * 3) / 4 - 20,
      panelY,
      panelWidth,
      panelHeight,
      'PLAYER 2',
      0x4ecdc4,
      2
    );

    // VS emblem in center
    this.createVSEmblem(width, panelY);
  }

  createVSEmblem(width, y) {
    // Circular background
    const vsGraphics = this.add.graphics();

    // Outer ring
    vsGraphics.lineStyle(4, 0x4a5568, 1);
    vsGraphics.strokeCircle(width / 2, y - 40, 45);

    // Inner fill
    vsGraphics.fillStyle(0x1a1a2e, 1);
    vsGraphics.fillCircle(width / 2, y - 40, 40);

    // Inner accent ring
    vsGraphics.lineStyle(2, 0x4a5568, 0.5);
    vsGraphics.strokeCircle(width / 2, y - 40, 35);

    // VS text with shadow
    this.add.text(width / 2 + 2, y - 38, 'VS', {
      fontSize: '36px',
      fontFamily: 'Arial Black, Impact, sans-serif',
      color: '#000000',
    }).setOrigin(0.5).setAlpha(0.5);

    this.add.text(width / 2, y - 40, 'VS', {
      fontSize: '36px',
      fontFamily: 'Arial Black, Impact, sans-serif',
      color: '#ffffff',
    }).setOrigin(0.5);
  }

  createPanel(x, y, width, height, playerLabel, accentColor, playerNum) {
    const panel = {};
    const graphics = this.add.graphics();

    // Panel outer glow
    graphics.lineStyle(1, accentColor, 0.3);
    graphics.strokeRoundedRect(x - width / 2 - 4, y - height / 2 - 4, width + 8, height + 8, 12);

    // Panel background with rounded corners
    graphics.fillStyle(0x0d1b2a, 0.95);
    graphics.fillRoundedRect(x - width / 2, y - height / 2, width, height, 8);

    // Panel border
    graphics.lineStyle(2, accentColor, 1);
    graphics.strokeRoundedRect(x - width / 2, y - height / 2, width, height, 8);

    // Store graphics for later border updates
    panel.graphics = graphics;
    panel.x = x;
    panel.y = y;
    panel.width = width;
    panel.height = height;
    panel.accentColor = accentColor;

    // Player label banner
    const bannerY = y - height / 2 + 25;
    graphics.fillStyle(accentColor, 0.2);
    graphics.fillRect(x - width / 2 + 10, bannerY - 12, width - 20, 24);

    panel.label = this.add.text(x, bannerY, playerLabel, {
      fontSize: '18px',
      fontFamily: 'Arial Black, sans-serif',
      color: Phaser.Display.Color.IntegerToColor(accentColor).rgba,
      letterSpacing: 4,
    }).setOrigin(0.5);

    // Ready indicator ABOVE the panel (not inside)
    panel.readyText = this.createReadyIndicator(x, y - height / 2 - 30, accentColor);

    // Character preview area
    const previewY = y - 80;
    panel.previewContainer = this.createCharacterPreview(x, previewY, accentColor);
    panel.preview = panel.previewContainer.preview;

    // Character name with underline
    const nameY = previewY + 115;
    panel.name = this.add.text(x, nameY, 'CHARACTER', {
      fontSize: '28px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#ffffff',
      letterSpacing: 2,
    }).setOrigin(0.5);

    // Decorative underline
    const underline = this.add.graphics();
    underline.lineStyle(2, accentColor, 0.6);
    underline.lineBetween(x - 80, nameY + 18, x + 80, nameY + 18);
    panel.nameUnderline = underline;

    // Character description
    panel.description = this.add.text(x, nameY + 40, 'Description', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#8899aa',
      fontStyle: 'italic',
    }).setOrigin(0.5);

    // Stats display
    panel.stats = this.createStatsDisplay(x, nameY + 75, width, accentColor);

    // Navigation arrows (styled)
    panel.leftArrow = this.createNavArrow(x - width / 2 + 35, previewY, '◀', accentColor);
    panel.rightArrow = this.createNavArrow(x + width / 2 - 35, previewY, '▶', accentColor);

    return panel;
  }

  createCharacterPreview(x, y, accentColor) {
    const container = {};
    const graphics = this.add.graphics();

    // Outer frame
    graphics.lineStyle(2, accentColor, 0.8);
    graphics.strokeRoundedRect(x - 70, y - 85, 140, 170, 6);

    // Inner dark background
    graphics.fillStyle(0x0a0a1a, 1);
    graphics.fillRoundedRect(x - 65, y - 80, 130, 160, 4);

    // Subtle inner border
    graphics.lineStyle(1, 0x2a2a4a, 0.5);
    graphics.strokeRoundedRect(x - 65, y - 80, 130, 160, 4);

    // Character silhouette/preview
    container.preview = this.add.rectangle(x, y, 90, 130, 0xffffff);
    container.preview.setStrokeStyle(2, 0x333344);

    return container;
  }

  createNavArrow(x, y, symbol, color) {
    // Arrow background circle
    const graphics = this.add.graphics();
    graphics.fillStyle(0x1a2a3a, 0.8);
    graphics.fillCircle(x, y, 22);
    graphics.lineStyle(2, color, 0.6);
    graphics.strokeCircle(x, y, 22);

    const arrow = this.add.text(x, y, symbol, {
      fontSize: '24px',
      color: '#ffffff',
    }).setOrigin(0.5);

    arrow.bgGraphics = graphics;
    return arrow;
  }

  createReadyIndicator(x, y, accentColor) {
    const container = this.add.container(x, y);

    // Background bar with player's accent color
    const bg = this.add.graphics();
    bg.fillStyle(0x00aa00, 0.3);
    bg.fillRoundedRect(-60, -14, 120, 28, 4);
    bg.lineStyle(2, 0x00ff00, 1);
    bg.strokeRoundedRect(-60, -14, 120, 28, 4);
    container.add(bg);

    // Ready text
    const text = this.add.text(0, 0, 'READY', {
      fontSize: '18px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#00ff00',
      letterSpacing: 4,
    }).setOrigin(0.5);
    container.add(text);

    container.setVisible(false);
    return container;
  }

  createStatsDisplay(x, y, panelWidth, accentColor) {
    const stats = {};
    const statData = [
      { key: 'spd', label: 'SPEED' },
      { key: 'pwr', label: 'POWER' },
      { key: 'def', label: 'DEFENSE' },
      { key: 'ki', label: 'KI' },
    ];
    const startY = y;
    const spacing = 28;
    const barWidth = 140;
    const barStartX = x - 10;

    statData.forEach((stat, i) => {
      const rowY = startY + i * spacing;

      // Stat label
      this.add.text(x - 100, rowY, stat.label, {
        fontSize: '12px',
        fontFamily: 'Arial, sans-serif',
        color: '#667788',
        letterSpacing: 1,
      }).setOrigin(0, 0.5);

      // Stat bar container (background)
      const barBg = this.add.graphics();
      barBg.fillStyle(0x1a2a3a, 1);
      barBg.fillRoundedRect(barStartX, rowY - 7, barWidth, 14, 3);
      barBg.lineStyle(1, 0x3a4a5a, 1);
      barBg.strokeRoundedRect(barStartX, rowY - 7, barWidth, 14, 3);

      // Segmented bar (5 segments for 5 levels)
      const segmentWidth = (barWidth - 12) / 5;
      stats[stat.key] = {
        segments: [],
        rowY: rowY,
        barStartX: barStartX,
        segmentWidth: segmentWidth,
      };

      for (let s = 0; s < 5; s++) {
        const segX = barStartX + 6 + s * (segmentWidth + 2);
        const segment = this.add.graphics();
        // Initial empty state
        segment.fillStyle(0x2a3a4a, 0.5);
        segment.fillRoundedRect(segX, rowY - 5, segmentWidth - 2, 10, 2);
        // Store position data with the segment
        segment.segX = segX;
        segment.segY = rowY;
        segment.segWidth = segmentWidth - 2;
        stats[stat.key].segments.push(segment);
      }
    });

    return stats;
  }

  createBottomBar(width, height) {
    const barY = height - 50;

    // Bottom bar background
    const barGraphics = this.add.graphics();
    barGraphics.fillStyle(0x0a0a1a, 0.9);
    barGraphics.fillRect(0, barY - 20, width, 70);
    barGraphics.lineStyle(1, 0x2a3a4a, 0.8);
    barGraphics.lineBetween(0, barY - 20, width, barY - 20);

    // Player 1 controls (left)
    this.createControlHint(width / 4, barY, 'A / D', 'Navigate', 0xff6b35);

    // Player 2 controls (right)
    this.createControlHint((width * 3) / 4, barY, '← / →', 'Navigate', 0x4ecdc4);

    // Center - confirm/start instruction
    this.confirmHint = this.add.text(width / 2, barY, 'F / L to Lock In', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#888899',
    }).setOrigin(0.5);

    // "Both players ready" message (hidden initially) - smaller text to fit
    this.startMessage = this.add.container(width / 2, barY);

    const startBg = this.add.graphics();
    startBg.fillStyle(0x00aa00, 0.2);
    startBg.fillRoundedRect(-100, -16, 200, 32, 6);
    startBg.lineStyle(2, 0x00ff00, 0.8);
    startBg.strokeRoundedRect(-100, -16, 200, 32, 6);
    this.startMessage.add(startBg);

    const startText = this.add.text(0, 0, 'ENTER TO BATTLE', {
      fontSize: '16px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#00ff00',
      letterSpacing: 1,
    }).setOrigin(0.5);
    this.startMessage.add(startText);

    this.startMessage.setVisible(false);

    // ESC hint
    this.add.text(60, barY, 'ESC: Back', {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: '#555566',
    }).setOrigin(0.5);
  }

  createControlHint(x, y, keys, action, color) {
    this.add.text(x, y - 5, keys, {
      fontSize: '16px',
      fontFamily: 'Arial Black, sans-serif',
      color: Phaser.Display.Color.IntegerToColor(color).rgba,
    }).setOrigin(0.5);

    this.add.text(x, y + 15, action, {
      fontSize: '11px',
      fontFamily: 'Arial, sans-serif',
      color: '#667788',
      letterSpacing: 1,
    }).setOrigin(0.5);
  }

  setupInput() {
    // Player 1 controls
    this.p1Keys = {
      left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      confirm: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F),
    };

    // Player 2 controls
    this.p2Keys = {
      left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      confirm: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L),
    };

    // Start game
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

    // Back to menu
    this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
  }

  update(time) {
    this.handleInput(time);
  }

  handleInput(time) {
    // Player 1 input
    if (!this.player1.confirmed && time > this.inputCooldown.player1) {
      if (this.p1Keys.left.isDown) {
        this.cycleCharacter(1, -1);
        this.inputCooldown.player1 = time + this.cooldownDuration;
      } else if (this.p1Keys.right.isDown) {
        this.cycleCharacter(1, 1);
        this.inputCooldown.player1 = time + this.cooldownDuration;
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.p1Keys.confirm)) {
      this.toggleConfirm(1);
    }

    // Player 2 input
    if (!this.player2.confirmed && time > this.inputCooldown.player2) {
      if (this.p2Keys.left.isDown) {
        this.cycleCharacter(2, -1);
        this.inputCooldown.player2 = time + this.cooldownDuration;
      } else if (this.p2Keys.right.isDown) {
        this.cycleCharacter(2, 1);
        this.inputCooldown.player2 = time + this.cooldownDuration;
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.p2Keys.confirm)) {
      this.toggleConfirm(2);
    }

    // Start game when both ready
    if (this.player1.confirmed && this.player2.confirmed) {
      if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
        this.startGame();
      }
    }

    // Back to mode select
    if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.scene.start('ModeSelectScene');
    }
  }

  cycleCharacter(playerNum, direction) {
    const player = playerNum === 1 ? this.player1 : this.player2;
    const currentChar = characters[player.selectedIndex];
    const nextChar = getNextCharacter(currentChar.id, direction);
    player.selectedIndex = characters.findIndex((c) => c.id === nextChar.id);

    this.updateDisplay();
    this.playSelectSound();
  }

  toggleConfirm(playerNum) {
    const player = playerNum === 1 ? this.player1 : this.player2;
    player.confirmed = !player.confirmed;

    this.updateDisplay();
    this.playConfirmSound(player.confirmed);
  }

  updateDisplay() {
    // Update Player 1 panel
    this.updatePanel(this.p1Panel, this.player1, 1);

    // Update Player 2 panel
    this.updatePanel(this.p2Panel, this.player2, 2);

    // Show start message when both ready
    const bothReady = this.player1.confirmed && this.player2.confirmed;
    this.startMessage.setVisible(bothReady);
    this.confirmHint.setVisible(!bothReady);

    if (bothReady) {
      // Pulse animation for start message
      this.tweens.add({
        targets: this.startMessage,
        alpha: { from: 1, to: 0.7 },
        duration: 400,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  updatePanel(panel, playerState, playerNum) {
    const char = characters[playerState.selectedIndex];

    // Update character preview color
    panel.preview.setFillStyle(char.color);

    // Update text
    panel.name.setText(char.name.toUpperCase());
    panel.description.setText(char.description);

    // Update stats bars (segmented style)
    this.updateStatBar(panel.stats.spd, char.displaySpeed);
    this.updateStatBar(panel.stats.pwr, char.displayPower);
    this.updateStatBar(panel.stats.def, char.displayDurability);
    this.updateStatBar(panel.stats.ki, char.displayKi);

    // Show/hide ready state
    panel.readyText.setVisible(playerState.confirmed);

    // Dim arrows when confirmed
    const arrowAlpha = playerState.confirmed ? 0.3 : 1;
    panel.leftArrow.setAlpha(arrowAlpha);
    panel.rightArrow.setAlpha(arrowAlpha);
    if (panel.leftArrow.bgGraphics) {
      panel.leftArrow.bgGraphics.setAlpha(arrowAlpha);
    }
    if (panel.rightArrow.bgGraphics) {
      panel.rightArrow.bgGraphics.setAlpha(arrowAlpha);
    }

    // Update panel border for confirmed state
    this.updatePanelBorder(panel, playerState.confirmed, playerNum);
  }

  updateStatBar(statData, value) {
    // Color gradient from red (1) to green (5)
    const colors = [
      { filled: 0xff4444, empty: 0x3a2020 }, // 1 - Red
      { filled: 0xff8844, empty: 0x3a2a20 }, // 2 - Orange
      { filled: 0xffcc44, empty: 0x3a3520 }, // 3 - Yellow
      { filled: 0x88dd44, empty: 0x2a3520 }, // 4 - Light green
      { filled: 0x44ff88, empty: 0x203a25 }, // 5 - Green
    ];

    statData.segments.forEach((segment, i) => {
      segment.clear();
      const isFilled = i < value;
      const colorSet = colors[i];

      if (isFilled) {
        segment.fillStyle(colorSet.filled, 1);
      } else {
        segment.fillStyle(colorSet.empty, 0.5);
      }

      // Use stored position data
      segment.fillRoundedRect(
        segment.segX,
        segment.segY - 5,
        segment.segWidth,
        10,
        2
      );
    });
  }

  updatePanelBorder(panel, confirmed, playerNum) {
    // Clear and redraw panel border
    panel.graphics.clear();

    const accentColor = confirmed ? 0x00ff00 : panel.accentColor;
    const glowAlpha = confirmed ? 0.6 : 0.3;

    // Outer glow
    panel.graphics.lineStyle(confirmed ? 3 : 1, accentColor, glowAlpha);
    panel.graphics.strokeRoundedRect(
      panel.x - panel.width / 2 - 4,
      panel.y - panel.height / 2 - 4,
      panel.width + 8,
      panel.height + 8,
      12
    );

    // Background
    panel.graphics.fillStyle(0x0d1b2a, 0.95);
    panel.graphics.fillRoundedRect(
      panel.x - panel.width / 2,
      panel.y - panel.height / 2,
      panel.width,
      panel.height,
      8
    );

    // Border
    panel.graphics.lineStyle(confirmed ? 3 : 2, accentColor, 1);
    panel.graphics.strokeRoundedRect(
      panel.x - panel.width / 2,
      panel.y - panel.height / 2,
      panel.width,
      panel.height,
      8
    );

    // Player label banner
    const bannerY = panel.y - panel.height / 2 + 25;
    panel.graphics.fillStyle(accentColor, 0.2);
    panel.graphics.fillRect(
      panel.x - panel.width / 2 + 10,
      bannerY - 12,
      panel.width - 20,
      24
    );
  }

  playSelectSound() {
    // TODO: Add sound effect when audio system is implemented
  }

  playConfirmSound(confirmed) {
    // TODO: Add sound effect when audio system is implemented
  }

  startGame() {
    // Get selected character configs
    const p1Character = characters[this.player1.selectedIndex];
    const p2Character = characters[this.player2.selectedIndex];

    // Transition to game with character data
    this.scene.start('GameScene', {
      mode: this.gameMode,
      player1Character: p1Character,
      player2Character: p2Character,
    });
  }
}
