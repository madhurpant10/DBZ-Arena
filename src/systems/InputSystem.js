import { getPlayerControls } from '../constants/controls.js';
import { logDebug } from '../utils/debug.js';

/**
 * InputSystem - Centralized input handling
 * Manages keyboard input for all players with clean separation
 */
export default class InputSystem {
  /**
   * @param {Phaser.Scene} scene - The scene to attach input to
   */
  constructor(scene) {
    this.scene = scene;
    this.playerInputs = new Map();
    this.enabled = true;
  }

  /**
   * Registers input handling for a player
   * @param {number} playerNumber - 1 or 2
   * @returns {Object} Input state object for the player
   */
  registerPlayer(playerNumber) {
    const controls = getPlayerControls(playerNumber);

    // Create key objects
    const keys = this.scene.input.keyboard.addKeys({
      left: controls.left,
      right: controls.right,
      up: controls.up,
      down: controls.down,
      jump: controls.jump,
      attack: controls.attack,
      special: controls.special,
    });

    // Input state object - updated every frame
    const inputState = {
      playerNumber,
      keys,
      // Current frame state
      left: false,
      right: false,
      up: false,
      down: false,
      jump: false,
      attack: false,
      special: false,
      // Just pressed this frame (for one-shot actions)
      jumpPressed: false,
      attackPressed: false,
      specialPressed: false,
      // Previous frame state (for detecting just pressed)
      prevJump: false,
      prevAttack: false,
      prevSpecial: false,
    };

    this.playerInputs.set(playerNumber, inputState);

    logDebug(`InputSystem: Registered Player ${playerNumber}`);

    return inputState;
  }

  /**
   * Unregisters a player's input
   * @param {number} playerNumber
   */
  unregisterPlayer(playerNumber) {
    const inputState = this.playerInputs.get(playerNumber);
    if (inputState) {
      // Remove key listeners
      this.scene.input.keyboard.removeKey(inputState.keys.left);
      this.scene.input.keyboard.removeKey(inputState.keys.right);
      this.scene.input.keyboard.removeKey(inputState.keys.up);
      this.scene.input.keyboard.removeKey(inputState.keys.down);
      this.scene.input.keyboard.removeKey(inputState.keys.jump);
      this.scene.input.keyboard.removeKey(inputState.keys.attack);
      this.scene.input.keyboard.removeKey(inputState.keys.special);

      this.playerInputs.delete(playerNumber);
    }
  }

  /**
   * Updates all player input states
   * Should be called once per frame in scene update
   */
  update() {
    if (!this.enabled) return;

    this.playerInputs.forEach((inputState) => {
      this.updatePlayerInput(inputState);
    });
  }

  /**
   * Updates a single player's input state
   * @param {Object} inputState
   */
  updatePlayerInput(inputState) {
    const { keys } = inputState;

    // Store previous frame state
    inputState.prevJump = inputState.jump;
    inputState.prevAttack = inputState.attack;
    inputState.prevSpecial = inputState.special;

    // Update current state from keys
    inputState.left = keys.left.isDown;
    inputState.right = keys.right.isDown;
    inputState.up = keys.up.isDown;
    inputState.down = keys.down.isDown;
    inputState.jump = keys.jump.isDown;
    inputState.attack = keys.attack.isDown;
    inputState.special = keys.special.isDown;

    // Calculate "just pressed" states
    inputState.jumpPressed = inputState.jump && !inputState.prevJump;
    inputState.attackPressed = inputState.attack && !inputState.prevAttack;
    inputState.specialPressed = inputState.special && !inputState.prevSpecial;
  }

  /**
   * Gets input state for a player
   * @param {number} playerNumber
   * @returns {Object|null} Input state or null if not registered
   */
  getInput(playerNumber) {
    return this.playerInputs.get(playerNumber) || null;
  }

  /**
   * Gets horizontal input as a value between -1 and 1
   * @param {number} playerNumber
   * @returns {number} -1 (left), 0 (none), or 1 (right)
   */
  getHorizontalInput(playerNumber) {
    const input = this.getInput(playerNumber);
    if (!input) return 0;

    let horizontal = 0;
    if (input.left) horizontal -= 1;
    if (input.right) horizontal += 1;
    return horizontal;
  }

  /**
   * Gets vertical input as a value between -1 and 1
   * @param {number} playerNumber
   * @returns {number} -1 (up), 0 (none), or 1 (down)
   */
  getVerticalInput(playerNumber) {
    const input = this.getInput(playerNumber);
    if (!input) return 0;

    let vertical = 0;
    if (input.up) vertical -= 1; // Up is negative in screen coords
    if (input.down) vertical += 1;
    return vertical;
  }

  /**
   * Enables or disables input processing
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Cleans up the input system
   */
  destroy() {
    this.playerInputs.forEach((_, playerNumber) => {
      this.unregisterPlayer(playerNumber);
    });
    this.playerInputs.clear();
  }
}
