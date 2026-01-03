import Phaser from 'phaser';

/**
 * Player control key bindings
 * All input mappings are centralized here for easy modification
 */

export const PLAYER_1_CONTROLS = {
  left: Phaser.Input.Keyboard.KeyCodes.A,
  right: Phaser.Input.Keyboard.KeyCodes.D,
  jump: Phaser.Input.Keyboard.KeyCodes.W,
  attack: Phaser.Input.Keyboard.KeyCodes.F,
  special: Phaser.Input.Keyboard.KeyCodes.G, // Future: special attack
};

export const PLAYER_2_CONTROLS = {
  left: Phaser.Input.Keyboard.KeyCodes.LEFT,
  right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
  jump: Phaser.Input.Keyboard.KeyCodes.UP,
  attack: Phaser.Input.Keyboard.KeyCodes.L,
  special: Phaser.Input.Keyboard.KeyCodes.K, // Future: special attack
};

/**
 * Menu navigation controls
 */
export const MENU_CONTROLS = {
  up: Phaser.Input.Keyboard.KeyCodes.UP,
  down: Phaser.Input.Keyboard.KeyCodes.DOWN,
  left: Phaser.Input.Keyboard.KeyCodes.LEFT,
  right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
  confirm: Phaser.Input.Keyboard.KeyCodes.ENTER,
  back: Phaser.Input.Keyboard.KeyCodes.ESC,
};

/**
 * Debug controls
 */
export const DEBUG_CONTROLS = {
  toggleDebug: Phaser.Input.Keyboard.KeyCodes.BACKTICK, // ` key
  togglePhysicsDebug: Phaser.Input.Keyboard.KeyCodes.F1,
};

/**
 * Returns control config for a given player number
 * @param {number} playerNumber - 1 or 2
 * @returns {Object} Control configuration
 */
export function getPlayerControls(playerNumber) {
  if (playerNumber === 1) return PLAYER_1_CONTROLS;
  if (playerNumber === 2) return PLAYER_2_CONTROLS;
  throw new Error(`Invalid player number: ${playerNumber}`);
}
