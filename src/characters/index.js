/**
 * Characters Module
 *
 * Central export point for all character configurations.
 * Import characters from here rather than individual files.
 *
 * Usage:
 *   import { characters, getCharacterById } from './characters/index.js';
 *
 *   // Get all characters as array
 *   characters.forEach(char => console.log(char.name));
 *
 *   // Get specific character by id
 *   const goku = getCharacterById('goku');
 */

import goku from './goku.js';
import vegeta from './vegeta.js';
import frieza from './frieza.js';
import piccolo from './piccolo.js';
import { BASE_CHARACTER, createCharacter } from './baseCharacter.js';

/**
 * Array of all playable characters
 * Order determines display order in character select
 */
export const characters = [goku, vegeta, frieza, piccolo];

/**
 * Map of character ID to config for quick lookup
 */
const characterMap = new Map(characters.map((char) => [char.id, char]));

/**
 * Gets a character configuration by ID
 * @param {string} id - Character ID (e.g., 'goku', 'vegeta')
 * @returns {Object|null} Character config or null if not found
 */
export function getCharacterById(id) {
  return characterMap.get(id) || null;
}

/**
 * Gets the default character (first in list)
 * @returns {Object} Default character config
 */
export function getDefaultCharacter() {
  return characters[0];
}

/**
 * Gets the next character in the list (for cycling)
 * @param {string} currentId - Current character ID
 * @param {number} direction - 1 for next, -1 for previous
 * @returns {Object} Next character config
 */
export function getNextCharacter(currentId, direction = 1) {
  const currentIndex = characters.findIndex((c) => c.id === currentId);
  if (currentIndex === -1) return characters[0];

  let nextIndex = currentIndex + direction;
  if (nextIndex < 0) nextIndex = characters.length - 1;
  if (nextIndex >= characters.length) nextIndex = 0;

  return characters[nextIndex];
}

/**
 * Gets the total number of characters
 * @returns {number}
 */
export function getCharacterCount() {
  return characters.length;
}

// Export utilities
export { BASE_CHARACTER, createCharacter };

// Default export is the characters array
export default characters;
