import Phaser from 'phaser';
import InputSystem from '../systems/InputSystem.js';
import PhysicsSystem from '../systems/PhysicsSystem.js';
import CombatSystem from '../systems/CombatSystem.js';
import Player from '../entities/Player.js';
import Projectile from '../entities/Projectile.js';
import { ARENA, UI, PLAYER_STATS, PLAYER_STATES } from '../constants/gameBalance.js';
import { DEBUG_CONTROLS } from '../constants/controls.js';
import { debug, logInfo } from '../utils/debug.js';
import { getDefaultCharacter } from '../characters/index.js';

/**
 * GameScene - Main gameplay scene
 * Orchestrates game systems and entities
 */
export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });

    // Systems
    this.inputSystem = null;
    this.physicsSystem = null;
    this.combatSystem = null;

    // Entities
    this.players = [];

    // UI elements
    this.hudElements = {};

    // Debug display elements
    this.debugTexts = null;

    // Game state
    this.isPaused = false;
    this.gameMode = 'local1v1';

    // Character selections
    this.player1Character = null;
    this.player2Character = null;
  }

  /**
   * Receives data from previous scene
   * @param {Object} data - Scene data
   */
  init(data) {
    // Reset all state (constructor only runs once)
    this.inputSystem = null;
    this.physicsSystem = null;
    this.combatSystem = null;
    this.players = [];
    this.hudElements = {};
    this.isPaused = false;
    this.isGameOver = false;
    this.pauseOverlay = null;
    this.pauseText = null;
    this.pauseHint = null;
    this.debugTexts = null;

    this.gameMode = data.mode || 'local1v1';

    // Get character selections (fallback to defaults if not provided)
    this.player1Character = data.player1Character || getDefaultCharacter();
    this.player2Character = data.player2Character || getDefaultCharacter();

    logInfo(`GameScene: Initializing with mode "${this.gameMode}"`);
    logInfo(`GameScene: P1=${this.player1Character.name}, P2=${this.player2Character.name}`);
  }

  /**
   * Creates game objects and systems
   */
  create() {
    console.log('GameScene.create() starting...');

    try {
      // Initialize systems
      console.log('1. Initializing systems...');
      this.initializeSystems();
      console.log('   Systems initialized OK');

      // Create arena
      console.log('2. Creating arena...');
      this.createArena();
      console.log('   Arena created OK');

      // Create players
      console.log('3. Creating players...');
      this.createPlayers();
      console.log('   Players created OK');

      // Create HUD
      console.log('4. Creating HUD...');
      this.createHUD();
      console.log('   HUD created OK');

      // Setup debug controls
      console.log('5. Setting up debug controls...');
      this.setupDebugControls();
      console.log('   Debug controls OK');

      // Setup pause
      console.log('6. Setting up pause controls...');
      this.setupPauseControls();
      console.log('   Pause controls OK');

      // Initialize debug
      console.log('7. Initializing debug...');
      debug.init(this);
      console.log('   Debug OK');

      // Setup camera
      console.log('8. Setting up camera...');
      this.setupCamera();
      console.log('   Camera OK');

      // Create debug display
      console.log('9. Creating debug display...');
      this.createDebugDisplay();
      console.log('   Debug display OK');

      logInfo('GameScene: Created');
      console.log('GameScene.create() completed successfully!');
    } catch (error) {
      console.error('GameScene.create() FAILED:', error);
      console.error('Stack trace:', error.stack);
    }
  }

  /**
   * Initializes game systems
   */
  initializeSystems() {
    // Physics system first
    this.physicsSystem = new PhysicsSystem(this);
    this.physicsSystem.setupWorld();

    // Input system
    this.inputSystem = new InputSystem(this);

    // Combat system (depends on physics)
    this.combatSystem = new CombatSystem(this, this.physicsSystem);

    logInfo('GameScene: Systems initialized');
  }

  /**
   * Creates the arena environment
   */
  createArena() {
    // Create ground
    this.physicsSystem.createGround();

    // Arena background
    this.createArenaBackground();

    logInfo('GameScene: Arena created');
  }

  /**
   * Creates arena background visuals
   */
  createArenaBackground() {
    const { width, height } = this.cameras.main;
    const groundHeight = ARENA.groundHeight;

    const bg = this.add.graphics();

    // Sky gradient
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x2d3436, 0x2d3436, 1);
    bg.fillRect(0, 0, width, height - groundHeight);

    // Set depth to be behind everything
    bg.setDepth(-100);
  }

  /**
   * Sets up camera to follow players during flight
   * Camera smoothly follows the midpoint between both players
   */
  setupCamera() {
    const camera = this.cameras.main;
    const { width, height } = camera;

    // Set camera bounds to be slightly larger than arena for flight
    // This allows the camera to pan up when players fly
    const extraHeight = 400; // Extra space above for flight
    camera.setBounds(0, -extraHeight, width, height + extraHeight);

    // Disable default follow, we'll manually update camera position
    // to keep both players in view
  }

  /**
   * Updates camera position to keep both players visible
   * Called every frame in update()
   */
  updateCamera() {
    if (this.players.length < 2) return;

    const p1Pos = this.players[0].getPosition();
    const p2Pos = this.players[1].getPosition();

    // Calculate midpoint between players
    const midX = (p1Pos.x + p2Pos.x) / 2;
    const midY = (p1Pos.y + p2Pos.y) / 2;

    const camera = this.cameras.main;
    const { width, height } = camera;

    // Calculate target Y position (only move camera when players are high up)
    // Camera centers on players when they're above a threshold
    const groundY = height - ARENA.groundHeight;
    const flightThreshold = groundY - 200; // Start following when above this Y

    let targetY = height / 2; // Default center

    // If either player is flying high, adjust camera Y
    const minPlayerY = Math.min(p1Pos.y, p2Pos.y);
    if (minPlayerY < flightThreshold) {
      // Blend between default and following the midpoint
      const followStrength = Math.min(1, (flightThreshold - minPlayerY) / 200);
      targetY = height / 2 + (midY - height / 2) * followStrength * 0.5;
    }

    // Smoothly move camera (lerp)
    const currentY = camera.scrollY + height / 2;
    const lerpSpeed = 0.05;
    const newY = currentY + (targetY - currentY) * lerpSpeed;

    // Clamp to bounds
    const minY = -200; // Don't go too high
    const maxY = height / 2; // Don't go below default
    camera.scrollY = Math.max(minY, Math.min(maxY, newY - height / 2));
  }

  /**
   * Creates debug display for player states (shown when debug mode is on)
   */
  createDebugDisplay() {
    const { width } = this.cameras.main;

    // Create container for debug info
    this.debugTexts = {
      p1: this.add.text(10, 100, '', {
        fontSize: '12px',
        fontFamily: 'Consolas, monospace',
        color: '#00ff00',
        backgroundColor: '#000000',
        padding: { x: 5, y: 5 },
      }),
      p2: this.add.text(width - 200, 100, '', {
        fontSize: '12px',
        fontFamily: 'Consolas, monospace',
        color: '#00ff00',
        backgroundColor: '#000000',
        padding: { x: 5, y: 5 },
      }),
    };

    // Set depth and initial visibility
    this.debugTexts.p1.setDepth(1000);
    this.debugTexts.p2.setDepth(1000);
    this.debugTexts.p1.setScrollFactor(0); // Fixed to camera
    this.debugTexts.p2.setScrollFactor(0);
    this.debugTexts.p1.setVisible(false);
    this.debugTexts.p2.setVisible(false);
  }

  /**
   * Updates debug display with current player info
   */
  updateDebugDisplay() {
    // Only show when debug mode is enabled
    const isDebugOn = debug.isEnabled();

    this.debugTexts.p1.setVisible(isDebugOn);
    this.debugTexts.p2.setVisible(isDebugOn);

    if (!isDebugOn) return;

    // Update player debug info
    this.players.forEach((player, index) => {
      const pos = player.getPosition();
      const vel = player.getVelocity();
      const state = player.getState();
      const energy = Math.round(player.energy);
      const health = Math.round(player.health);

      const airFriction = player.body ? player.body.frictionAir : 'N/A';
      const stats = player.getStats();
      const info = [
        `P${player.playerNumber} Debug:`,
        `State: ${state}`,
        `Pos: (${Math.round(pos.x)}, ${Math.round(pos.y)})`,
        `Vel: (${vel.x.toFixed(1)}, ${vel.y.toFixed(1)})`,
        `HP: ${health} | Ki: ${energy}`,
        `Flying: ${player.isFlying() ? 'YES' : 'NO'}`,
        `Jumps: ${player.jumpsRemaining}`,
        `AirFric: ${typeof airFriction === 'number' ? airFriction.toFixed(3) : airFriction}`,
        `MoveF: ${stats.moveForce.toFixed(4)} | MaxV: ${stats.maxVelocityX.toFixed(1)}`,
      ].join('\n');

      const debugText = index === 0 ? this.debugTexts.p1 : this.debugTexts.p2;
      debugText.setText(info);
    });
  }

  /**
   * Creates player entities
   */
  createPlayers() {
    // Player 1 with selected character
    const p1 = new Player(
      this,
      this.physicsSystem,
      1,
      ARENA.spawnPoints.player1.x,
      ARENA.spawnPoints.player1.y,
      this.player1Character
    );

    // Player 2 with selected character
    const p2 = new Player(
      this,
      this.physicsSystem,
      2,
      ARENA.spawnPoints.player2.x,
      ARENA.spawnPoints.player2.y,
      this.player2Character
    );

    this.players = [p1, p2];

    // Register with systems
    this.players.forEach((player) => {
      this.inputSystem.registerPlayer(player.playerNumber);
      this.combatSystem.registerPlayer(player);
    });

    // Listen for KO events
    this.events.on('playerKO', this.handlePlayerKO, this);

    logInfo('GameScene: Players created');
  }

  /**
   * Creates the HUD display
   */
  createHUD() {
    const { width } = this.cameras.main;

    // Player 1 HUD (left side)
    this.hudElements.p1 = this.createPlayerHUD(1, UI.hudPadding, UI.hudPadding);

    // Player 2 HUD (right side)
    this.hudElements.p2 = this.createPlayerHUD(
      2,
      width - UI.healthBarWidth - UI.hudPadding,
      UI.hudPadding
    );

    // Center text (for announcements)
    this.hudElements.centerText = this.add.text(width / 2, 100, '', {
      fontSize: '48px',
      fontFamily: 'Arial Black, Arial, sans-serif',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    });
    this.hudElements.centerText.setOrigin(0.5);
    this.hudElements.centerText.setDepth(100);

    logInfo('GameScene: HUD created');
  }

  /**
   * Creates HUD elements for a player
   * @param {number} playerNumber - 1 or 2
   * @param {number} x - X position
   * @param {number} y - Y position
   * @returns {Object} HUD element references
   */
  createPlayerHUD(playerNumber, x, y) {
    const character = playerNumber === 1 ? this.player1Character : this.player2Character;
    const colorHex = '#' + character.color.toString(16).padStart(6, '0');
    const container = this.add.container(x, y);

    // Player label with character name
    const label = this.add.text(0, 0, `P${playerNumber} - ${character.name}`, {
      fontSize: '18px',
      fontFamily: 'Arial Black, Arial, sans-serif',
      color: colorHex,
      stroke: '#000000',
      strokeThickness: 2,
    });
    container.add(label);

    // Health bar outer border (dark)
    const healthBarBorder = this.add.graphics();
    healthBarBorder.fillStyle(0x000000, 1);
    healthBarBorder.fillRoundedRect(-2, 28, UI.healthBarWidth + 4, UI.healthBarHeight + 4, 4);
    container.add(healthBarBorder);

    // Health bar background (dark gradient feel)
    const healthBarBg = this.add.graphics();
    healthBarBg.fillStyle(0x1a1a1a, 1);
    healthBarBg.fillRoundedRect(0, 30, UI.healthBarWidth, UI.healthBarHeight, 3);
    // Inner shadow
    healthBarBg.fillStyle(0x333333, 1);
    healthBarBg.fillRoundedRect(0, 30, UI.healthBarWidth, UI.healthBarHeight / 2, { tl: 3, tr: 3, bl: 0, br: 0 });
    container.add(healthBarBg);

    // Health bar fill
    const healthBar = this.add.graphics();
    container.add(healthBar);

    // Health text with shadow
    const healthText = this.add.text(UI.healthBarWidth / 2, 30 + UI.healthBarHeight / 2, '100', {
      fontSize: '14px',
      fontFamily: 'Arial Black, Arial, sans-serif',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    });
    healthText.setOrigin(0.5);
    container.add(healthText);

    // Ki/Energy bar outer border
    const energyBarBorder = this.add.graphics();
    energyBarBorder.fillStyle(0x000000, 1);
    energyBarBorder.fillRoundedRect(-2, 58, UI.energyBarWidth + 4, UI.energyBarHeight + 4, 3);
    container.add(energyBarBorder);

    // Energy bar background
    const energyBarBg = this.add.graphics();
    energyBarBg.fillStyle(0x1a1a1a, 1);
    energyBarBg.fillRoundedRect(0, 60, UI.energyBarWidth, UI.energyBarHeight, 2);
    // Inner highlight
    energyBarBg.fillStyle(0x2a2a2a, 1);
    energyBarBg.fillRoundedRect(0, 60, UI.energyBarWidth, UI.energyBarHeight / 2, { tl: 2, tr: 2, bl: 0, br: 0 });
    container.add(energyBarBg);

    // Energy bar fill
    const energyBar = this.add.graphics();
    container.add(energyBar);

    // Ki label
    const kiLabel = this.add.text(UI.energyBarWidth + 8, 60 + UI.energyBarHeight / 2, 'KI', {
      fontSize: '12px',
      fontFamily: 'Arial Black, Arial, sans-serif',
      color: '#4ecdc4',
      stroke: '#000000',
      strokeThickness: 2,
    });
    kiLabel.setOrigin(0, 0.5);
    container.add(kiLabel);

    container.setDepth(100);

    return {
      container,
      healthBar,
      healthText,
      energyBar,
    };
  }

  /**
   * Updates HUD for a player
   * @param {number} playerNumber - 1 or 2
   */
  updatePlayerHUD(playerNumber) {
    const player = this.players[playerNumber - 1];
    const hud = this.hudElements[`p${playerNumber}`];

    if (!player || !hud) return;

    // Calculate percentages using character-specific max values
    const stats = player.getStats();
    const healthPercent = player.health / stats.maxHealth;
    const energyPercent = player.energy / stats.maxEnergy;

    // Update health bar with gradient effect
    hud.healthBar.clear();
    const healthWidth = Math.max(0, UI.healthBarWidth * healthPercent);

    if (healthWidth > 0) {
      // Health color based on percentage - vibrant colors
      let healthColor, healthColorDark;
      if (healthPercent > 0.5) {
        healthColor = 0x2ecc71; // Bright green
        healthColorDark = 0x27ae60; // Darker green
      } else if (healthPercent > 0.25) {
        healthColor = 0xf39c12; // Orange
        healthColorDark = 0xe67e22; // Darker orange
      } else {
        healthColor = 0xe74c3c; // Red
        healthColorDark = 0xc0392b; // Darker red
      }

      // Main bar fill
      hud.healthBar.fillStyle(healthColor, 1);
      hud.healthBar.fillRoundedRect(0, 30, healthWidth, UI.healthBarHeight, 3);

      // Highlight on top half for 3D effect
      hud.healthBar.fillStyle(0xffffff, 0.2);
      hud.healthBar.fillRoundedRect(0, 30, healthWidth, UI.healthBarHeight / 2, { tl: 3, tr: 3, bl: 0, br: 0 });
    }

    // Update health text
    hud.healthText.setText(Math.ceil(player.health).toString());

    // Update energy/ki bar with cyan/blue glow
    hud.energyBar.clear();
    const energyWidth = Math.max(0, UI.energyBarWidth * energyPercent);

    if (energyWidth > 0) {
      // Ki bar - cyan/teal color with glow effect
      hud.energyBar.fillStyle(0x00bcd4, 1); // Cyan
      hud.energyBar.fillRoundedRect(0, 60, energyWidth, UI.energyBarHeight, 2);

      // Highlight for glow effect
      hud.energyBar.fillStyle(0x4dd0e1, 1); // Lighter cyan
      hud.energyBar.fillRoundedRect(0, 60, energyWidth, UI.energyBarHeight / 2, { tl: 2, tr: 2, bl: 0, br: 0 });

      // Bright center line for energy feel
      hud.energyBar.fillStyle(0xffffff, 0.4);
      hud.energyBar.fillRect(0, 60 + UI.energyBarHeight / 3, energyWidth, 2);
    }
  }

  /**
   * Sets up debug controls
   */
  setupDebugControls() {
    // Toggle debug mode
    this.input.keyboard.on('keydown-BACKQUOTE', () => {
      debug.toggle();
    });

    // Toggle physics debug
    this.input.keyboard.on('keydown-F1', () => {
      debug.togglePhysicsDebug(this);
    });
  }

  /**
   * Sets up pause controls
   */
  setupPauseControls() {
    this.input.keyboard.on('keydown-ESC', () => {
      this.togglePause();
    });
  }

  /**
   * Toggles game pause
   */
  togglePause() {
    this.isPaused = !this.isPaused;

    if (this.isPaused) {
      this.showPauseMenu();
      this.inputSystem.setEnabled(false);
    } else {
      this.hidePauseMenu();
      this.inputSystem.setEnabled(true);
    }
  }

  /**
   * Shows pause menu overlay
   */
  showPauseMenu() {
    const { width, height } = this.cameras.main;

    this.pauseOverlay = this.add.graphics();
    this.pauseOverlay.fillStyle(0x000000, 0.7);
    this.pauseOverlay.fillRect(0, 0, width, height);
    this.pauseOverlay.setDepth(200);

    this.pauseText = this.add.text(width / 2, height / 2 - 50, 'PAUSED', {
      fontSize: '64px',
      fontFamily: 'Arial Black, Arial, sans-serif',
      color: '#ffffff',
    });
    this.pauseText.setOrigin(0.5);
    this.pauseText.setDepth(201);

    this.pauseHint = this.add.text(width / 2, height / 2 + 30, 'Press ESC to resume\nPress Q to quit', {
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif',
      color: '#cccccc',
      align: 'center',
    });
    this.pauseHint.setOrigin(0.5);
    this.pauseHint.setDepth(201);

    // Quit handler
    this.input.keyboard.once('keydown-Q', () => {
      if (this.isPaused) {
        this.cleanup();
        this.scene.start('MainMenuScene');
      }
    });
  }

  /**
   * Hides pause menu
   */
  hidePauseMenu() {
    if (this.pauseOverlay) {
      this.pauseOverlay.destroy();
      this.pauseOverlay = null;
    }
    if (this.pauseText) {
      this.pauseText.destroy();
      this.pauseText = null;
    }
    if (this.pauseHint) {
      this.pauseHint.destroy();
      this.pauseHint = null;
    }
  }

  /**
   * Handles player knockout
   * @param {number} playerNumber - The player who was KO'd
   */
  handlePlayerKO(playerNumber) {
    // Prevent multiple KO handling
    if (this.isGameOver) return;
    this.isGameOver = true;

    const winner = playerNumber === 1 ? 2 : 1;

    logInfo(`GameScene: Player ${winner} wins!`);

    // Show winner announcement
    this.hudElements.centerText.setText(`PLAYER ${winner} WINS!`);

    // Pause input
    this.inputSystem.setEnabled(false);

    // Return to menu after delay
    this.time.delayedCall(3000, () => {
      this.cleanup();
      this.scene.start('MainMenuScene');
    });
  }

  /**
   * Main update loop
   * @param {number} time - Total elapsed time
   * @param {number} delta - Time since last frame
   */
  update(time, delta) {
    // Don't update if paused or game over or systems not ready
    if (this.isPaused || this.isGameOver) return;
    if (!this.inputSystem || !this.combatSystem) return;

    // Update input system
    this.inputSystem.update();

    // Process player input and update
    this.players.forEach((player) => {
      if (player && player.body) {
        this.processPlayerInput(player, delta);
        // Pass down key state to player for flight gravity control
        const input = this.inputSystem.getInput(player.playerNumber);
        const isPressingDown = input ? input.down : false;
        player.update(time, delta, isPressingDown);
      }
    });

    // Update combat system
    this.combatSystem.update(time, delta);

    // Update HUD
    this.updatePlayerHUD(1);
    this.updatePlayerHUD(2);

    // Update camera to follow players during flight
    this.updateCamera();

    // Update debug display
    this.updateDebugDisplay();

    // Clear debug graphics
    debug.clear();
  }

  /**
   * Processes input for a player
   * Handles movement, jumping, flight, and attacks
   *
   * Flight activation: When airborne with no jumps remaining,
   * holding UP/W will automatically enter flight mode.
   * Landing exits flight mode automatically.
   *
   * @param {Player} player - The player to process
   * @param {number} delta - Delta time for frame-rate independent updates
   */
  processPlayerInput(player, delta) {
    const input = this.inputSystem.getInput(player.playerNumber);
    if (!input) return;

    // Get directional inputs
    const horizontal = this.inputSystem.getHorizontalInput(player.playerNumber);
    const vertical = this.inputSystem.getVerticalInput(player.playerNumber);

    // Handle flight - auto-activate when holding UP with no jumps left
    if (player.isFlying()) {
      // Currently flying - apply thrust and consume energy
      player.applyFlightThrust(horizontal, vertical);
      player.consumeFlightEnergy(delta);

      // Exit flight only if NEITHER up nor down is pressed (player wants to fall naturally)
      if (!input.up && !input.down) {
        player.exitFlight();
      }
    } else if (input.up && player.getState() === PLAYER_STATES.AIRBORNE && player.jumpsRemaining <= 0) {
      // Not flying, but holding UP with no jumps left - enter flight
      player.enterFlight();
    }

    // Horizontal movement (works in all states except flying which uses thrust)
    if (!player.isFlying()) {
      player.move(horizontal);
    }

    // Jump (on button press, not hold) - doesn't work while flying
    if (input.jumpPressed && !player.isFlying()) {
      player.jump();
    }

    // Attack
    if (input.attackPressed) {
      this.handlePlayerAttack(player);
    }
  }

  /**
   * Gets the opponent player for a given player
   * @param {Player} player - The player to find opponent for
   * @returns {Player|null} The opponent player or null
   */
  getOpponent(player) {
    const opponentNumber = player.playerNumber === 1 ? 2 : 1;
    return this.players[opponentNumber - 1] || null;
  }

  /**
   * Handles player attack action
   * Projectiles aim toward opponent ONLY if player is facing them
   * Otherwise shoots in facing direction
   * @param {Player} player - The attacking player
   */
  handlePlayerAttack(player) {
    const pos = player.getPosition();
    const opponent = this.getOpponent(player);

    // Get opponent position for targeting (only if facing toward them)
    let targetPos = null;
    if (opponent && opponent.getState() !== 'DEAD') {
      const opponentPos = opponent.getPosition();

      // Check if player is facing toward the opponent
      const directionToOpponent = opponentPos.x - pos.x; // positive = opponent is to the right
      const isFacingOpponent =
        (player.facingDirection > 0 && directionToOpponent > 0) || // facing right, opponent is right
        (player.facingDirection < 0 && directionToOpponent < 0); // facing left, opponent is left

      // Only auto-aim if facing the opponent
      if (isFacingOpponent) {
        targetPos = opponentPos;
      }
    }

    // Create projectile factory with targeting
    const createProjectile = () => {
      return new Projectile(
        this,
        this.physicsSystem,
        player.playerNumber,
        pos.x + player.facingDirection * 40, // Spawn in front of player
        pos.y,
        targetPos, // Target opponent's position (null if not facing them)
        player.facingDirection // Fallback direction if no target
      );
    };

    // Attempt attack through combat system
    this.combatSystem.attemptAttack(player, createProjectile);
  }

  /**
   * Cleans up scene resources
   */
  cleanup() {
    // Destroy players
    this.players.forEach((player) => player.destroy());
    this.players = [];

    // Destroy systems
    if (this.combatSystem) {
      this.combatSystem.destroy();
      this.combatSystem = null;
    }

    if (this.inputSystem) {
      this.inputSystem.destroy();
      this.inputSystem = null;
    }

    if (this.physicsSystem) {
      this.physicsSystem.destroy();
      this.physicsSystem = null;
    }

    // Destroy debug
    debug.destroy();

    // Destroy debug texts
    if (this.debugTexts) {
      this.debugTexts.p1?.destroy();
      this.debugTexts.p2?.destroy();
      this.debugTexts = null;
    }

    // Remove event listeners
    this.events.off('playerKO', this.handlePlayerKO, this);

    logInfo('GameScene: Cleaned up');
  }
}
