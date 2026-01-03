# DBZ Arena

A Dragon Ball-inspired 2D local multiplayer fighting game built with **Phaser 3** and **Matter.js** physics.

## Overview

DBZ Arena is a physics-based 2D fighting game featuring:

- Local 2-player gameplay on a single keyboard
- Flight system with full aerial combat
- Real physics-based movement, jumping, and knockback
- Auto-aiming projectile attacks
- Player state machine (Grounded, Airborne, Flying, Stunned)
- Clean scene-based menu system
- Modular, scalable architecture

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone or navigate to the project
cd DBZ-Game

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

## Controls

### Player 1 (Red)
| Action | Key |
|--------|-----|
| Move Left | `A` |
| Move Right | `D` |
| Jump / Fly Up | `W` |
| Descend (while flying) | `S` |
| Attack | `F` |

### Player 2 (Blue)
| Action | Key |
|--------|-----|
| Move Left | `←` |
| Move Right | `→` |
| Jump / Fly Up | `↑` |
| Descend (while flying) | `↓` |
| Attack | `L` |

### Flight
- **Double-jump, then hold UP** to enter flight mode
- **Release UP** to exit flight and fall
- **Land on ground** to automatically exit flight
- Flight consumes energy over time (~30 seconds from full)

### System Controls
| Action | Key |
|--------|-----|
| Navigate Menu | `↑` `↓` |
| Confirm Selection | `Enter` |
| Back / Pause | `Esc` |
| Toggle Debug Info | `` ` `` (backtick) |
| Toggle Physics Debug | `F1` |

## Project Structure

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
│   ├── Player.js           # Player entity with state machine
│   └── Projectile.js       # Projectile entity with 2D aiming
├── systems/
│   ├── InputSystem.js      # Centralized input handling
│   ├── PhysicsSystem.js    # Matter.js physics management
│   └── CombatSystem.js     # Combat, damage, and knockback
├── constants/
│   ├── controls.js         # Key bindings
│   ├── physics.js          # Physics tuning values
│   └── gameBalance.js      # Gameplay balance values
└── utils/
    └── debug.js            # Debug utilities
```

## Architecture

1. **Player State Machine**
   - States: GROUNDED, AIRBORNE, FLYING, STUNNED, DEAD
   - Clean transitions with entry/exit logic
   - State determines available actions and physics behavior

2. **Flight System**
   - Auto-activates when holding UP after exhausting jumps
   - Asymmetric thrust (stronger upward to fight gravity)
   - Gravity counterforce creates floaty hover feel
   - Energy consumption for balance

3. **Combat System**
   - Projectiles auto-aim toward opponent when facing them
   - 2D knockback follows projectile direction
   - Damage scaling increases knockback over time

4. **Systems Handle Cross-Cutting Concerns**
   - InputSystem: Unified input polling for all players
   - PhysicsSystem: Matter.js world management
   - CombatSystem: Damage calculation, knockback, hit detection

## Tech Stack

- **Phaser 3** - Game framework
- **Matter.js** - Physics engine (via Phaser)
- **Vite** - Build tool and dev server
- **ES6 Modules** - Modern JavaScript


## Debugging

Press `` ` `` (backtick) to toggle debug mode, which shows player state info and enables additional console logging.

Press `F1` to toggle physics debug rendering, which shows collision bodies and forces.

## License

MIT License - feel free to use this foundation for your own projects.

---

**Version:** 0.2.0 - Flight + Air Combat Update
