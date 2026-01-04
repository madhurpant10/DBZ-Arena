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
    this.createInstructions(width, height);

    // Setup input
    this.setupInput();

    // Initial render
    this.updateDisplay();
  }

  createBackground(width, height) {
    // Dark gradient background
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // Decorative elements
    this.add.rectangle(width / 2, height / 2, width - 40, height - 40, 0x16213e)
      .setStrokeStyle(2, 0x0f3460);
  }

  createTitle(width) {
    this.add.text(width / 2, 50, 'SELECT YOUR FIGHTER', {
      fontSize: '48px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#e94560',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);
  }

  createPlayerPanels(width, height) {
    const panelWidth = 400;
    const panelHeight = 450;
    const panelY = height / 2 + 20;

    // Player 1 Panel (Left)
    this.p1Panel = this.createPanel(
      width / 4,
      panelY,
      panelWidth,
      panelHeight,
      'PLAYER 1',
      0xff6b35
    );

    // Player 2 Panel (Right)
    this.p2Panel = this.createPanel(
      (width * 3) / 4,
      panelY,
      panelWidth,
      panelHeight,
      'PLAYER 2',
      0x4ecdc4
    );

    // VS text in center
    this.add.text(width / 2, panelY, 'VS', {
      fontSize: '64px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5);
  }

  createPanel(x, y, width, height, playerLabel, accentColor) {
    const panel = {};

    // Panel background
    panel.bg = this.add.rectangle(x, y, width, height, 0x0f3460)
      .setStrokeStyle(3, accentColor);

    // Player label
    panel.label = this.add.text(x, y - height / 2 + 30, playerLabel, {
      fontSize: '28px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Character preview box
    panel.previewBg = this.add.rectangle(x, y - 60, 150, 150, 0x1a1a2e)
      .setStrokeStyle(2, 0x333355);
    panel.preview = this.add.rectangle(x, y - 60, 100, 140, 0xffffff);

    // Character name
    panel.name = this.add.text(x, y + 40, 'CHARACTER', {
      fontSize: '32px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Character description
    panel.description = this.add.text(x, y + 80, 'Description', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#aaaaaa',
      wordWrap: { width: width - 40 },
      align: 'center',
    }).setOrigin(0.5);

    // Stats display
    panel.stats = this.createStatsDisplay(x, y + 130);

    // Navigation arrows
    panel.leftArrow = this.add.text(x - width / 2 + 30, y - 60, '◀', {
      fontSize: '40px',
      color: '#ffffff',
    }).setOrigin(0.5);

    panel.rightArrow = this.add.text(x + width / 2 - 30, y - 60, '▶', {
      fontSize: '40px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Ready indicator
    panel.readyText = this.add.text(x, y + height / 2 - 40, 'READY!', {
      fontSize: '36px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#00ff00',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setVisible(false);

    // Control hint
    panel.controls = this.add.text(x, y + height / 2 - 40, '', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#888888',
    }).setOrigin(0.5);

    return panel;
  }

  createStatsDisplay(x, y) {
    const stats = {};
    const labels = ['SPD', 'PWR', 'DEF', 'KI'];
    const startY = y;
    const spacing = 22;

    labels.forEach((label, i) => {
      const rowY = startY + i * spacing;

      // Label
      this.add.text(x - 80, rowY, label, {
        fontSize: '14px',
        fontFamily: 'Arial, sans-serif',
        color: '#888888',
      }).setOrigin(0, 0.5);

      // Stat bar background
      this.add.rectangle(x + 20, rowY, 100, 12, 0x333355).setOrigin(0.5);

      // Stat bar fill (will be updated)
      stats[label.toLowerCase()] = this.add.rectangle(
        x - 30, rowY, 0, 10, 0xe94560
      ).setOrigin(0, 0.5);
    });

    return stats;
  }

  createInstructions(width, height) {
    const instructionY = height - 40;

    this.add.text(width / 4, instructionY, 'A/D: Select  |  F: Confirm', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#ff6b35',
    }).setOrigin(0.5);

    this.add.text((width * 3) / 4, instructionY, '←/→: Select  |  L: Confirm', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#4ecdc4',
    }).setOrigin(0.5);

    // "Both players ready" message (hidden initially)
    this.startMessage = this.add.text(width / 2, height - 80, 'Press ENTER to start!', {
      fontSize: '24px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#00ff00',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setVisible(false);
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

    if (bothReady) {
      // Pulse animation for start message
      this.tweens.add({
        targets: this.startMessage,
        alpha: { from: 1, to: 0.5 },
        duration: 500,
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

    // Update stats bars
    const maxStatWidth = 100;
    panel.stats.spd.width = (char.displaySpeed / 5) * maxStatWidth;
    panel.stats.pwr.width = (char.displayPower / 5) * maxStatWidth;
    panel.stats.def.width = (char.displayDurability / 5) * maxStatWidth;
    panel.stats.ki.width = (char.displayKi / 5) * maxStatWidth;

    // Color stats based on value
    this.colorStatBar(panel.stats.spd, char.displaySpeed);
    this.colorStatBar(panel.stats.pwr, char.displayPower);
    this.colorStatBar(panel.stats.def, char.displayDurability);
    this.colorStatBar(panel.stats.ki, char.displayKi);

    // Show/hide ready state
    panel.readyText.setVisible(playerState.confirmed);
    panel.controls.setVisible(!playerState.confirmed);

    // Update control hints
    if (playerNum === 1) {
      panel.controls.setText('Press F to confirm');
    } else {
      panel.controls.setText('Press L to confirm');
    }

    // Dim arrows when confirmed
    const arrowAlpha = playerState.confirmed ? 0.3 : 1;
    panel.leftArrow.setAlpha(arrowAlpha);
    panel.rightArrow.setAlpha(arrowAlpha);

    // Border glow when confirmed
    if (playerState.confirmed) {
      panel.bg.setStrokeStyle(4, 0x00ff00);
    } else {
      panel.bg.setStrokeStyle(3, playerNum === 1 ? 0xff6b35 : 0x4ecdc4);
    }
  }

  colorStatBar(bar, value) {
    // Color based on stat value (1-5)
    if (value >= 5) {
      bar.setFillStyle(0x00ff00); // Green - Excellent
    } else if (value >= 4) {
      bar.setFillStyle(0x88ff00); // Yellow-green - Good
    } else if (value >= 3) {
      bar.setFillStyle(0xffff00); // Yellow - Average
    } else if (value >= 2) {
      bar.setFillStyle(0xff8800); // Orange - Below average
    } else {
      bar.setFillStyle(0xff0000); // Red - Low
    }
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
