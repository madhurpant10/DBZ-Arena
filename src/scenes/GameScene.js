import Phaser from 'phaser';
import InputSystem from '../systems/InputSystem.js';
import PhysicsSystem from '../systems/PhysicsSystem.js';
import CombatSystem from '../systems/CombatSystem.js';
import CameraSystem from '../systems/CameraSystem.js';
import Player from '../entities/Player.js';
import Projectile from '../entities/Projectile.js';
import { ARENA, UI, PLAYER_STATS, PLAYER_STATES, KI_SYSTEM, CAMERA } from '../constants/gameBalance.js';
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
    this.cameraSystem = null;

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
    this.cameraSystem = null;
    this.uiCamera = null;
    this.players = [];
    this.hudElements = {};
    this.isPaused = false;
    this.isGameOver = false;
    this.pauseOverlay = null;
    this.pauseText = null;
    this.pauseHint = null;
    this.debugTexts = null;
    this.arenaBackground = null;
    this.backgroundLayers = [];

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
   * Creates arena background visuals for the expanded arena
   * Features parallax layers for depth perception
   */
  createArenaBackground() {
    const arenaWidth = ARENA.width;
    const groundY = ARENA.groundY;
    const groundHeight = ARENA.groundHeight;

    // Store all background layers for camera ignore
    this.backgroundLayers = [];

    // === LAYER 1: Far background (stars/sky) - slowest parallax ===
    // With scroll factor 0.1, we need 10x the coverage to prevent gaps at edges
    // Camera can view ~2560 pixels wide at zoom 0.5, so parallax layer needs massive coverage
    const farBg = this.add.graphics();
    farBg.fillGradientStyle(0x050510, 0x050510, 0x0a0a1a, 0x0a0a1a, 1);
    farBg.fillRect(-2000, -1000, arenaWidth + 4000, groundY + 2000);

    // Add distant stars
    for (let i = 0; i < 80; i++) {
      const starX = Math.random() * (arenaWidth + 3000) - 1500;
      const starY = Math.random() * (groundY + 500) - 800;
      const starSize = Math.random() * 2 + 0.5;
      const starAlpha = Math.random() * 0.5 + 0.2;
      farBg.fillStyle(0xffffff, starAlpha);
      farBg.fillCircle(starX, starY, starSize);
    }

    farBg.setDepth(-150);
    farBg.setScrollFactor(0.1, 0.1); // Moves very slowly - distant
    this.backgroundLayers.push(farBg);

    // === LAYER 2: Mid background (distant mountains) - medium parallax ===
    // With scroll factor 0.3, need ~3x coverage for edge cases
    const midBg = this.add.graphics();

    // Distant mountain range (darker, further back)
    midBg.fillStyle(0x1a1a2e, 0.8);
    this.drawMountainRange(midBg, -1000, groundY, arenaWidth + 2000, 300, 8, 0.6);

    midBg.setDepth(-130);
    midBg.setScrollFactor(0.3, 0.4); // Moves slower than foreground
    this.backgroundLayers.push(midBg);

    // === LAYER 3: Near mountains - faster parallax ===
    // With scroll factor 0.5, need ~2x coverage for edge cases
    const nearMountains = this.add.graphics();

    // Closer mountain range (slightly lighter)
    nearMountains.fillStyle(0x2d2d44, 0.9);
    this.drawMountainRange(nearMountains, -800, groundY, arenaWidth + 1600, 200, 12, 0.4);

    nearMountains.setDepth(-120);
    nearMountains.setScrollFactor(0.5, 0.6);
    this.backgroundLayers.push(nearMountains);

    // === LAYER 4: Foreground elements (ground, arena floor) - full scroll ===
    // Full scroll factor means this matches camera movement, but still need extra padding for zoom
    const foreground = this.add.graphics();

    // Ground area - darker ground color (extended for zoom out)
    foreground.fillStyle(0x2d3436, 1);
    foreground.fillRect(-500, groundY, arenaWidth + 1000, groundHeight + 500);

    // Ground line (top of ground) with glow effect
    foreground.lineStyle(4, 0x4a5568, 1);
    foreground.lineBetween(-500, groundY, arenaWidth + 500, groundY);
    foreground.lineStyle(2, 0x718096, 0.6);
    foreground.lineBetween(-500, groundY - 1, arenaWidth + 500, groundY - 1);

    // Add some depth lines for visual interest
    foreground.lineStyle(1, 0x3d4d56, 0.3);
    for (let y = groundY + 20; y < groundY + groundHeight; y += 20) {
      foreground.lineBetween(-500, y, arenaWidth + 500, y);
    }

    // Add subtle ground texture dots
    for (let i = 0; i < 100; i++) {
      const dotX = Math.random() * arenaWidth;
      const dotY = groundY + Math.random() * 80 + 10;
      foreground.fillStyle(0x4a5568, 0.3);
      foreground.fillCircle(dotX, dotY, Math.random() * 3 + 1);
    }

    foreground.setDepth(-100);
    foreground.setScrollFactor(1, 1); // Moves with camera
    this.backgroundLayers.push(foreground);

    // === Atmospheric effects layer (floating particles) ===
    const atmosphere = this.add.graphics();

    // Add floating dust/energy particles
    for (let i = 0; i < 30; i++) {
      const particleX = Math.random() * arenaWidth;
      const particleY = Math.random() * groundY;
      const particleSize = Math.random() * 4 + 1;
      const particleAlpha = Math.random() * 0.15 + 0.05;

      // Mix of colors for energy feel
      const colors = [0x4a90d9, 0x9b59b6, 0xf39c12, 0x2ecc71];
      const color = colors[Math.floor(Math.random() * colors.length)];

      atmosphere.fillStyle(color, particleAlpha);
      atmosphere.fillCircle(particleX, particleY, particleSize);
    }

    atmosphere.setDepth(-110);
    atmosphere.setScrollFactor(0.7, 0.7);
    this.backgroundLayers.push(atmosphere);

    // Store main reference for backward compatibility
    this.arenaBackground = foreground;
  }

  /**
   * Draws a procedural mountain range
   * @param {Phaser.GameObjects.Graphics} graphics - Graphics object to draw on
   * @param {number} startX - Starting X position
   * @param {number} baseY - Base Y position (ground level)
   * @param {number} width - Width of the mountain range
   * @param {number} maxHeight - Maximum peak height
   * @param {number} peaks - Number of peaks
   * @param {number} jaggedness - How jagged the mountains are (0-1)
   */
  drawMountainRange(graphics, startX, baseY, width, maxHeight, peaks, jaggedness) {
    graphics.beginPath();
    graphics.moveTo(startX, baseY);

    const segmentWidth = width / (peaks * 4);
    let x = startX;

    for (let i = 0; i < peaks; i++) {
      // Rising slope
      const peakHeight = maxHeight * (0.5 + Math.random() * 0.5);
      const peakX = x + segmentWidth * 2;

      // Add some jagged points on the way up
      const midX1 = x + segmentWidth * 0.7;
      const midY1 = baseY - peakHeight * (0.3 + Math.random() * jaggedness * 0.3);
      graphics.lineTo(midX1, midY1);

      const midX2 = x + segmentWidth * 1.3;
      const midY2 = baseY - peakHeight * (0.6 + Math.random() * jaggedness * 0.2);
      graphics.lineTo(midX2, midY2);

      // Peak
      graphics.lineTo(peakX, baseY - peakHeight);

      // Falling slope with jagged points
      const midX3 = peakX + segmentWidth * 0.7;
      const midY3 = baseY - peakHeight * (0.5 + Math.random() * jaggedness * 0.3);
      graphics.lineTo(midX3, midY3);

      const midX4 = peakX + segmentWidth * 1.5;
      const midY4 = baseY - peakHeight * (0.2 + Math.random() * jaggedness * 0.2);
      graphics.lineTo(midX4, midY4);

      x = peakX + segmentWidth * 2;
    }

    graphics.lineTo(startX + width, baseY);
    graphics.closePath();
    graphics.fillPath();
  }

  /**
   * Sets up the dynamic camera system
   * Uses CameraSystem for midpoint tracking and distance-based zoom
   */
  setupCamera() {
    // Initialize the camera system
    this.cameraSystem = new CameraSystem(this);

    // Set players for tracking (will be set again after players are created)
    if (this.players.length >= 2) {
      this.cameraSystem.setPlayers(this.players);
      this.cameraSystem.snapToTarget();
    }

    logInfo('GameScene: Camera system initialized');
  }

  /**
   * Updates camera position and zoom to keep both players visible
   * Called every frame in update()
   */
  updateCamera(delta) {
    if (!this.cameraSystem) return;

    // Ensure camera system has player references
    if (this.players.length >= 2 && this.cameraSystem.players.length === 0) {
      this.cameraSystem.setPlayers(this.players);
      this.cameraSystem.snapToTarget();
    }

    this.cameraSystem.update(delta);
  }

  /**
   * Creates debug display for player states (shown when debug mode is on)
   */
  createDebugDisplay() {
    const width = CAMERA.viewportWidth;

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
    this.debugTexts.p1.setScrollFactor(0);
    this.debugTexts.p2.setScrollFactor(0);
    this.debugTexts.p1.setVisible(false);
    this.debugTexts.p2.setVisible(false);

    // Main camera ignores debug texts (UI camera will render them)
    this.cameras.main.ignore([this.debugTexts.p1, this.debugTexts.p2]);
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
      const stamina = Math.round(player.stamina);
      const ki = Math.round(player.ki);
      const health = Math.round(player.health);

      const stats = player.getStats();
      const transformTime = player.isTransformed
        ? Math.ceil((player.transformationEndTime - this.time.now) / 1000)
        : 0;

      // Add camera info for P1 debug
      let cameraInfo = '';
      if (index === 0 && this.cameraSystem) {
        const camDebug = this.cameraSystem.getDebugInfo();
        cameraInfo = `\n--- Camera ---\nPos: (${camDebug.position.x}, ${camDebug.position.y})\nZoom: ${camDebug.zoom}`;
      }

      const info = [
        `P${player.playerNumber} Debug:`,
        `State: ${state}`,
        `Pos: (${Math.round(pos.x)}, ${Math.round(pos.y)})`,
        `Vel: (${vel.x.toFixed(1)}, ${vel.y.toFixed(1)})`,
        `HP: ${health} | Stam: ${stamina} | Ki: ${ki}`,
        `Flying: ${player.isFlying() ? 'YES' : 'NO'}`,
        `Charging: ${player.isCharging ? 'YES' : 'NO'}`,
        `CanTrans: ${player.canTransform ? 'YES' : 'NO'}`,
        `Transformed: ${player.isTransformed ? `YES (${transformTime}s)` : 'NO'}`,
        `AtkDmg: ${stats.attackDamage.toFixed(1)}`,
        cameraInfo,
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
   * Uses a separate UI camera that doesn't zoom to keep HUD at consistent size
   */
  createHUD() {
    const { width, height } = this.cameras.main;

    // Create a dedicated UI camera that ignores zoom
    // This camera only renders UI elements (depth >= 100)
    this.uiCamera = this.cameras.add(0, 0, width, height);
    this.uiCamera.setScroll(0, 0);
    this.uiCamera.setZoom(1); // Always 1:1 zoom for UI

    // Main camera should ignore UI elements
    this.cameras.main.ignore([]);

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
    this.hudElements.centerText.setScrollFactor(0);

    // Make main camera ignore HUD elements, UI camera renders them
    this.setupCameraLayers();

    logInfo('GameScene: HUD created');
  }

  /**
   * Sets up camera layer separation
   * Main camera renders game world, UI camera renders HUD
   */
  setupCameraLayers() {
    // Collect all HUD elements to ignore from main camera
    const hudObjects = [];

    if (this.hudElements.p1) {
      hudObjects.push(this.hudElements.p1.container);
    }
    if (this.hudElements.p2) {
      hudObjects.push(this.hudElements.p2.container);
    }
    if (this.hudElements.centerText) {
      hudObjects.push(this.hudElements.centerText);
    }
    if (this.debugTexts) {
      if (this.debugTexts.p1) hudObjects.push(this.debugTexts.p1);
      if (this.debugTexts.p2) hudObjects.push(this.debugTexts.p2);
    }

    // Main camera ignores HUD
    this.cameras.main.ignore(hudObjects);

    // UI camera only sees HUD (ignore everything else by setting to only render high depth)
    // We'll handle this by making the UI camera ignore world objects

    // Ignore all parallax background layers
    if (this.backgroundLayers && this.backgroundLayers.length > 0) {
      this.backgroundLayers.forEach(layer => {
        this.uiCamera.ignore(layer);
      });
    } else if (this.arenaBackground) {
      // Fallback for backward compatibility
      this.uiCamera.ignore(this.arenaBackground);
    }

    // Ignore players
    this.players.forEach(player => {
      if (player.graphics) {
        this.uiCamera.ignore(player.graphics);
      }
    });
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

    // Stamina bar outer border
    const staminaBarBorder = this.add.graphics();
    staminaBarBorder.fillStyle(0x000000, 1);
    staminaBarBorder.fillRoundedRect(-2, 58, UI.staminaBarWidth + 4, UI.staminaBarHeight + 4, 3);
    container.add(staminaBarBorder);

    // Stamina bar background
    const staminaBarBg = this.add.graphics();
    staminaBarBg.fillStyle(0x1a1a1a, 1);
    staminaBarBg.fillRoundedRect(0, 60, UI.staminaBarWidth, UI.staminaBarHeight, 2);
    // Inner highlight
    staminaBarBg.fillStyle(0x2a2a2a, 1);
    staminaBarBg.fillRoundedRect(0, 60, UI.staminaBarWidth, UI.staminaBarHeight / 2, { tl: 2, tr: 2, bl: 0, br: 0 });
    container.add(staminaBarBg);

    // Stamina bar fill
    const staminaBar = this.add.graphics();
    container.add(staminaBar);

    // Stamina label
    const staminaLabel = this.add.text(UI.staminaBarWidth + 8, 60 + UI.staminaBarHeight / 2, 'ST', {
      fontSize: '10px',
      fontFamily: 'Arial Black, Arial, sans-serif',
      color: '#00bcd4',
      stroke: '#000000',
      strokeThickness: 2,
    });
    staminaLabel.setOrigin(0, 0.5);
    container.add(staminaLabel);

    // Ki bar outer border (below stamina bar)
    const kiBarBorder = this.add.graphics();
    kiBarBorder.fillStyle(0x000000, 1);
    kiBarBorder.fillRoundedRect(-2, 76, UI.kiBarWidth + 4, UI.kiBarHeight + 4, 3);
    container.add(kiBarBorder);

    // Ki bar background
    const kiBarBg = this.add.graphics();
    kiBarBg.fillStyle(0x1a1a1a, 1);
    kiBarBg.fillRoundedRect(0, 78, UI.kiBarWidth, UI.kiBarHeight, 2);
    // Inner highlight
    kiBarBg.fillStyle(0x2a2a2a, 1);
    kiBarBg.fillRoundedRect(0, 78, UI.kiBarWidth, UI.kiBarHeight / 2, { tl: 2, tr: 2, bl: 0, br: 0 });
    container.add(kiBarBg);

    // Ki bar fill
    const kiBar = this.add.graphics();
    container.add(kiBar);

    // Ki label
    const kiLabel = this.add.text(UI.kiBarWidth + 8, 78 + UI.kiBarHeight / 2, 'KI', {
      fontSize: '10px',
      fontFamily: 'Arial Black, Arial, sans-serif',
      color: '#f1c40f',
      stroke: '#000000',
      strokeThickness: 2,
    });
    kiLabel.setOrigin(0, 0.5);
    container.add(kiLabel);

    container.setDepth(100);
    container.setScrollFactor(0); // Fixed to screen, not affected by camera movement

    return {
      container,
      healthBar,
      healthText,
      staminaBar,
      kiBar,
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
    const staminaPercent = player.stamina / stats.maxStamina;
    const kiPercent = player.ki / KI_SYSTEM.maxKi;

    // Update health bar with gradient effect
    hud.healthBar.clear();
    const healthWidth = Math.max(0, UI.healthBarWidth * healthPercent);

    if (healthWidth > 0) {
      // Health color based on percentage - vibrant colors
      let healthColor;
      if (healthPercent > 0.5) {
        healthColor = 0x2ecc71; // Bright green
      } else if (healthPercent > 0.25) {
        healthColor = 0xf39c12; // Orange
      } else {
        healthColor = 0xe74c3c; // Red
      }

      // Main bar fill
      hud.healthBar.fillStyle(healthColor, 1);
      hud.healthBar.fillRoundedRect(0, 30, healthWidth, UI.healthBarHeight, 3);

      // Highlight on top half for 3D effect
      hud.healthBar.fillStyle(0xffffff, 0.2);
      hud.healthBar.fillRoundedRect(0, 30, healthWidth, UI.healthBarHeight / 2, { tl: 3, tr: 3, bl: 0, br: 0 });
    }

    // Update health text (show 1 decimal place for precise damage tracking)
    hud.healthText.setText(player.health.toFixed(1));

    // Update stamina bar with cyan/blue color
    hud.staminaBar.clear();
    const staminaWidth = Math.max(0, UI.staminaBarWidth * staminaPercent);

    if (staminaWidth > 0) {
      // Stamina bar - cyan/teal color with glow effect
      hud.staminaBar.fillStyle(0x00bcd4, 1); // Cyan
      hud.staminaBar.fillRoundedRect(0, 60, staminaWidth, UI.staminaBarHeight, 2);

      // Highlight for glow effect
      hud.staminaBar.fillStyle(0x4dd0e1, 1); // Lighter cyan
      hud.staminaBar.fillRoundedRect(0, 60, staminaWidth, UI.staminaBarHeight / 2, { tl: 2, tr: 2, bl: 0, br: 0 });

      // Bright center line for energy feel
      hud.staminaBar.fillStyle(0xffffff, 0.4);
      hud.staminaBar.fillRect(0, 60 + UI.staminaBarHeight / 3, staminaWidth, 2);
    }

    // Update Ki bar with golden/yellow color (power gauge)
    hud.kiBar.clear();
    const kiWidth = Math.max(0, UI.kiBarWidth * kiPercent);

    if (kiWidth > 0) {
      // Ki bar - golden yellow, glows brighter as it fills
      const kiColor = player.canTransform ? 0xf1c40f : 0xd4ac0d; // Brighter when full
      hud.kiBar.fillStyle(kiColor, 1);
      hud.kiBar.fillRoundedRect(0, 78, kiWidth, UI.kiBarHeight, 2);

      // Highlight for glow effect
      hud.kiBar.fillStyle(0xf5d442, 1); // Lighter gold
      hud.kiBar.fillRoundedRect(0, 78, kiWidth, UI.kiBarHeight / 2, { tl: 2, tr: 2, bl: 0, br: 0 });

      // Draw threshold markers
      // 50% marker (partial power)
      const halfPoint = UI.kiBarWidth * 0.5;
      hud.kiBar.fillStyle(0xffffff, 0.5);
      hud.kiBar.fillRect(halfPoint - 1, 78, 2, UI.kiBarHeight);
    }

    // Visual feedback when player can transform
    if (player.canTransform) {
      // Pulsing glow effect on Ki bar when transformation is available
      const pulseAlpha = 0.3 + Math.sin(this.time.now / 200) * 0.2;
      hud.kiBar.fillStyle(0xf1c40f, pulseAlpha);
      hud.kiBar.fillRoundedRect(-2, 76, UI.kiBarWidth + 4, UI.kiBarHeight + 4, 3);
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
    const width = CAMERA.viewportWidth;
    const height = CAMERA.viewportHeight;

    // Overlay covers full screen
    this.pauseOverlay = this.add.graphics();
    this.pauseOverlay.fillStyle(0x000000, 0.7);
    this.pauseOverlay.fillRect(0, 0, width, height);
    this.pauseOverlay.setDepth(200);
    this.pauseOverlay.setScrollFactor(0);

    this.pauseText = this.add.text(width / 2, height / 2 - 50, 'PAUSED', {
      fontSize: '64px',
      fontFamily: 'Arial Black, Arial, sans-serif',
      color: '#ffffff',
    });
    this.pauseText.setOrigin(0.5);
    this.pauseText.setDepth(201);
    this.pauseText.setScrollFactor(0);

    this.pauseHint = this.add.text(width / 2, height / 2 + 30, 'Press ESC to resume\nPress Q to quit', {
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif',
      color: '#cccccc',
      align: 'center',
    });
    this.pauseHint.setOrigin(0.5);
    this.pauseHint.setDepth(201);
    this.pauseHint.setScrollFactor(0);

    // Make main camera ignore pause elements (UI camera will render them)
    this.cameras.main.ignore([this.pauseOverlay, this.pauseText, this.pauseHint]);

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
    const loser = this.players[playerNumber - 1];

    logInfo(`GameScene: Player ${winner} wins!`);

    // Pause input immediately
    this.inputSystem.setEnabled(false);

    // === DRAMATIC KO SEQUENCE ===

    // 1. Brief freeze frame - pause physics for impact moment
    this.matter.world.pause();

    // 2. Camera shake on KO
    if (this.cameraSystem) {
      this.cameraSystem.shakeOnKO();
    }

    // 3. Flash effect - white flash on screen
    const flash = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      this.cameras.main.width * 2,
      this.cameras.main.height * 2,
      0xffffff,
      0.8
    );
    flash.setScrollFactor(0);
    flash.setDepth(500);

    // Fade out the flash
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => flash.destroy(),
    });

    // 4. Resume physics after brief freeze (150ms) to show knockback
    this.time.delayedCall(150, () => {
      this.matter.world.resume();

      // Apply dramatic final knockback to loser
      if (loser && loser.body) {
        const knockbackDir = loser.playerNumber === 1 ? -1 : 1;
        loser.applyKnockback({
          x: knockbackDir * 0.025,
          y: -0.02,
        });
      }
    });

    // 5. Show "K.O.!" text first, then winner text
    this.hudElements.centerText.setText('K.O.!');
    this.hudElements.centerText.setStyle({
      fontSize: '80px',
      color: '#ff0000',
      stroke: '#000000',
      strokeThickness: 6,
    });

    // 6. After knockback plays, show winner announcement
    this.time.delayedCall(1200, () => {
      this.hudElements.centerText.setText(`PLAYER ${winner} WINS!`);
      this.hudElements.centerText.setStyle({
        fontSize: '64px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
      });
    });

    // 7. Return to menu after full sequence plays
    this.time.delayedCall(4000, () => {
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

    // Update camera to follow players with dynamic zoom
    this.updateCamera(delta);

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
      // Currently flying - apply thrust and consume stamina
      player.applyFlightThrust(horizontal, vertical);
      player.consumeFlightStamina(delta);

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

    // Attack (disabled while charging - charging is a commitment)
    if (input.attackPressed && !player.isCharging) {
      this.handlePlayerAttack(player);
    }

    // Ki Charging / Transformation (special key: G for P1, K for P2)
    // - Hold to charge Ki
    // - When Ki reaches 100%, transformation activates automatically
    // - Can also press special when Ki is full (not charging) to transform
    if (input.special) {
      // If can transform and still holding charge key, auto-activate
      if (player.canTransform && !player.isTransformed) {
        player.activateTransformation();
      } else if (!player.isCharging && !player.isTransformed) {
        // Start charging if not already and not transformed
        player.startCharging();
      }
    } else {
      // Stop charging when key released
      if (player.isCharging) {
        player.stopCharging();
      }
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

    // Get character-specific attack damage (includes transformation bonus if active)
    const stats = player.getStats();

    // Create projectile factory with targeting and character damage
    const createProjectile = () => {
      return new Projectile(
        this,
        this.physicsSystem,
        player.playerNumber,
        pos.x + player.facingDirection * 40, // Spawn in front of player
        pos.y,
        targetPos, // Target opponent's position (null if not facing them)
        player.facingDirection, // Fallback direction if no target
        stats.attackDamage // Use character-specific damage
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

    if (this.cameraSystem) {
      this.cameraSystem.destroy();
      this.cameraSystem = null;
    }

    // Remove UI camera
    if (this.uiCamera) {
      this.cameras.remove(this.uiCamera);
      this.uiCamera = null;
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
