# DBZ Physics Arena

A Dragon Ball-inspired 2D local multiplayer fighting game built with **Phaser 3** and **Matter.js** physics.

## 🎮 Overview

This is a physics-first 2D fighting game foundation designed for extensibility. The current version provides:

- Local 2-player gameplay on a single keyboard
- Real physics-based movement, jumping, and knockback
- Projectile attacks with collision detection
- Clean scene-based menu system
- Modular, scalable architecture

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone or navigate to the project
cd dbz-physics-game

# Install dependencies
npm install

# Start development server
npm run dev
```

The game will open in your browser at `http://localhost:3000`.

### Build for Production

```bash
npm run build
npm run preview  # Preview the build
```

## 🎮 Controls

### Player 1 (Red)
| Action | Key |
|--------|-----|
| Move Left | `A` |
| Move Right | `D` |
| Jump | `W` |
| Attack | `F` |

### Player 2 (Blue)
| Action | Key |
|--------|-----|
| Move Left | `←` |
| Move Right | `→` |
| Jump | `↑` |
| Attack | `L` |

### System Controls
| Action | Key |
|--------|-----|
| Navigate Menu | `↑` `↓` |
| Confirm Selection | `Enter` |
| Back / Pause | `Esc` |
| Toggle Debug Info | `` ` `` (backtick) |
| Toggle Physics Debug | `F1` |

## 🏗️ Project Structure

```
/src
├── main.js                 # Application entry point
├── config/
│   └── gameConfig.js       # Phaser game configuration
├── scenes/
│   ├── BootScene.js        # Initial loading scene
│   ├── MainMenuScene.js    # Main menu
│   ├── ModeSelectScene.js  # Game mode selection
│   └── GameScene.js        # Core gameplay scene
├── entities/
│   ├── Player.js           # Player entity class
│   └── Projectile.js       # Projectile entity class
├── systems/
│   ├── InputSystem.js      # Centralized input handling
│   ├── PhysicsSystem.js    # Matter.js physics management
│   └── CombatSystem.js     # Combat, damage, and projectiles
├── constants/
│   ├── controls.js         # Key bindings
│   ├── physics.js          # Physics tuning values
│   └── gameBalance.js      # Gameplay balance values
└── utils/
    └── debug.js            # Debug utilities
```

## 🧠 Architecture Principles

1. **Scenes Orchestrate, Don't Contain Logic**
   - Scenes initialize and connect systems/entities
   - Business logic lives in entities and systems

2. **Entities Own Their Behavior**
   - Players manage their own movement, state, and rendering
   - Projectiles handle their own physics and lifecycle

3. **Systems Handle Cross-Cutting Concerns**
   - InputSystem: Unified input polling for all players
   - PhysicsSystem: Matter.js world management
   - CombatSystem: Damage calculation, knockback, hit detection

4. **Constants Centralize Tuning**
   - No magic numbers in gameplay code
   - All tunable values in `/constants/`

## ⚙️ Tech Stack

- **Phaser 3** - Game framework
- **Matter.js** - Physics engine (via Phaser)
- **Vite** - Build tool and dev server
- **ES6 Modules** - Modern JavaScript

## 🛣️ Roadmap

### Phase 1: Foundation ✅
- [x] Project structure
- [x] Menu system
- [x] Basic physics
- [x] 2-player input
- [x] Projectile attacks
- [x] Health system

### Phase 2: Visual Polish
- [ ] Sprite-based characters
- [ ] Animation system
- [ ] Particle effects
- [ ] Arena backgrounds

### Phase 3: Combat Depth
- [ ] Multiple attack types
- [ ] Special moves (Ki attacks)
- [ ] Combo system
- [ ] Block/parry mechanics

### Phase 4: Characters
- [ ] Character selection
- [ ] Unique character abilities
- [ ] Character-specific stats

### Phase 5: Game Modes
- [ ] Training mode
- [ ] Arcade mode (vs AI)
- [ ] Story mode

### Phase 6: Polish
- [ ] Sound effects & music
- [ ] Screen shake & effects
- [ ] UI improvements
- [ ] Gamepad support

## 🐛 Debugging

Press `` ` `` (backtick) to toggle debug mode, which enables additional console logging.

Press `F1` to toggle physics debug rendering, which shows collision bodies and forces.

## 📄 License

MIT License - feel free to use this foundation for your own projects.

---

**Version:** 0.1.0 - Foundation Build
