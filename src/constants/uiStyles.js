/**
 * UI Style Constants
 * Premium, dark-themed fighting game menu UI styles
 * Reusable across MainMenu, ModeSelect, CharacterSelect, ArenaSelect
 */

/**
 * Color palette - Dark navy/charcoal with gold accents
 */
export const COLORS = {
  // Backgrounds
  bgDark: 0x0d1117, // Dark navy
  bgMedium: 0x161b22, // Slightly lighter
  bgLight: 0x21262d, // Even lighter for overlays

  // Accent colors - Vibrant gold/yellow for fighting game aesthetic
  gold: 0xffb300, // Primary bright gold
  goldBright: 0xffc400, // Even brighter gold for highlights
  goldDim: 0xe6a200, // Slightly dimmer for shadows (still vibrant)

  // Text colors
  textPrimary: '#ffffff', // White for important text
  textSecondary: '#8b949e', // Muted gray for unselected
  textMuted: '#9ca3af', // Light gray for hints (more readable)
  textGold: '#ffb300', // Bright gold for selected items

  // UI elements
  borderGold: 0xffb300, // Match brighter gold
  borderMuted: 0x30363d,
};

/**
 * Typography styles
 * Using condensed fonts for fighting game aesthetic
 */
export const FONTS = {
  // Title font (Anton - bold, condensed fighting game style)
  title: {
    fontFamily: 'Anton, Impact, Haettenschweiler, Arial Black, sans-serif',
  },
  // Menu items (same bold condensed font)
  menu: {
    fontFamily: 'Anton, Impact, Haettenschweiler, Arial Black, sans-serif',
  },
  // Helper text (clean sans-serif)
  helper: {
    fontFamily: 'Inter, Roboto, -apple-system, BlinkMacSystemFont, sans-serif',
  },
  // Monospace for control hints
  mono: {
    fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
  },
};

/**
 * Layout constants (16:9 resolution-independent)
 */
export const LAYOUT = {
  // Corner accents
  cornerSize: 40,
  cornerThickness: 2,
  cornerPadding: 20,

  // Menu positioning (as percentage of screen)
  titleY: 0.28, // Title vertical position
  menuStartY: 0.52, // First menu item position (more space below title)
  menuSpacing: 0.09, // Space between menu items (percentage)
  hintY: 0.92, // Control hints position

  // Sizes
  titleFontSize: 96,
  menuFontSize: 36,
  menuFontSizeSelected: 42,
  hintFontSize: 13,

  // Animations
  transitionDuration: 200,
  pulseDuration: 2000,
};

/**
 * Text style presets
 */
export const TEXT_STYLES = {
  // Title "DBZ" part - bold bright gold
  titlePrimary: {
    fontSize: '96px',
    fontFamily: FONTS.title.fontFamily,
    color: '#ffb300',
  },
  // Title "ARENA" part - white
  titleSecondary: {
    fontSize: '96px',
    fontFamily: FONTS.title.fontFamily,
    color: '#ffffff',
  },
  // Selected menu item
  menuSelected: {
    fontSize: '42px',
    fontFamily: FONTS.menu.fontFamily,
    color: COLORS.textGold,
  },
  // Unselected menu item
  menuUnselected: {
    fontSize: '36px',
    fontFamily: FONTS.menu.fontFamily,
    color: COLORS.textSecondary,
  },
  // Control hints
  hint: {
    fontSize: '13px',
    fontFamily: FONTS.mono.fontFamily,
    color: COLORS.textMuted,
  },
  // Overlay title
  overlayTitle: {
    fontSize: '32px',
    fontFamily: FONTS.title.fontFamily,
    color: COLORS.textGold,
    letterSpacing: 4,
  },
  // Overlay content
  overlayContent: {
    fontSize: '16px',
    fontFamily: FONTS.mono.fontFamily,
    color: '#cccccc',
    lineSpacing: 8,
  },
};

/**
 * Creates the standard dark background with diagonal pattern
 * @param {Phaser.Scene} scene - The scene to add graphics to
 * @returns {Phaser.GameObjects.Graphics} The background graphics object
 */
export function createMenuBackground(scene) {
  const { width, height } = scene.cameras.main;
  const bg = scene.add.graphics();

  // Solid dark background
  bg.fillStyle(COLORS.bgDark, 1);
  bg.fillRect(0, 0, width, height);

  // Subtle diagonal pattern (low contrast grid)
  bg.lineStyle(1, 0x1a1f26, 0.5);
  const spacing = 30;

  // Diagonal lines going one direction
  for (let i = -height; i < width + height; i += spacing) {
    bg.lineBetween(i, 0, i + height, height);
  }

  // Diagonal lines going other direction (creates diamond pattern)
  for (let i = -height; i < width + height; i += spacing) {
    bg.lineBetween(i + height, 0, i, height);
  }

  return bg;
}

/**
 * Creates corner frame accents
 * @param {Phaser.Scene} scene - The scene to add graphics to
 * @returns {Phaser.GameObjects.Graphics} The corner graphics object
 */
export function createCornerAccents(scene) {
  const { width, height } = scene.cameras.main;
  const size = LAYOUT.cornerSize;
  const pad = LAYOUT.cornerPadding;

  const corners = scene.add.graphics();
  corners.lineStyle(LAYOUT.cornerThickness, COLORS.borderGold, 0.6);

  // Top-left
  corners.lineBetween(pad, pad + size, pad, pad);
  corners.lineBetween(pad, pad, pad + size, pad);

  // Top-right
  corners.lineBetween(width - pad - size, pad, width - pad, pad);
  corners.lineBetween(width - pad, pad, width - pad, pad + size);

  // Bottom-left
  corners.lineBetween(pad, height - pad - size, pad, height - pad);
  corners.lineBetween(pad, height - pad, pad + size, height - pad);

  // Bottom-right
  corners.lineBetween(width - pad - size, height - pad, width - pad, height - pad);
  corners.lineBetween(width - pad, height - pad - size, width - pad, height - pad);

  return corners;
}

/**
 * Creates the title accent line with diamond center
 * @param {Phaser.Scene} scene - The scene to add graphics to
 * @param {number} y - Y position for the line
 * @returns {Phaser.GameObjects.Graphics} The line graphics object
 */
export function createTitleAccentLine(scene, y) {
  const { width } = scene.cameras.main;
  const lineWidth = 180;
  const centerX = width / 2;

  const line = scene.add.graphics();

  // Main horizontal line
  line.lineStyle(1, COLORS.borderGold, 0.6);
  line.lineBetween(centerX - lineWidth / 2, y, centerX + lineWidth / 2, y);

  // Diamond in center
  const diamondSize = 6;
  line.fillStyle(COLORS.gold, 0.8);
  line.beginPath();
  line.moveTo(centerX, y - diamondSize);
  line.lineTo(centerX + diamondSize, y);
  line.lineTo(centerX, y + diamondSize);
  line.lineTo(centerX - diamondSize, y);
  line.closePath();
  line.fillPath();

  return line;
}

/**
 * Creates navigation hint text at bottom of screen
 * @param {Phaser.Scene} scene - The scene
 * @param {Object} options - Options { showBack: boolean }
 * @returns {Phaser.GameObjects.Text} The hint text object
 */
export function createNavigationHints(scene, options = {}) {
  const { width, height } = scene.cameras.main;
  const showBack = options.showBack !== false;

  let hintText = '[ ↑  ↓ ] NAVIGATE     [ ENTER ] SELECT';
  if (showBack) {
    hintText += '     [ ESC ] BACK';
  }

  const hint = scene.add.text(width / 2, height * LAYOUT.hintY, hintText, TEXT_STYLES.hint);
  hint.setOrigin(0.5);

  return hint;
}
