# 4v4 Soccer Game

A simulation-style 4v4 soccer game built with TypeScript, Three.js, and Cannon.js physics engine.

## Features

- **4v4 Soccer Gameplay**: Control your team of 4 players against an AI-controlled opponent
- **Mobile-First Design**: Full touch controls with virtual joystick and buttons
- **Cross-Platform**: Works on desktop (keyboard) and mobile (touch) seamlessly
- **Realistic Physics**: Ball physics and player movement powered by Cannon.js
- **3D Graphics**: Rendered with Three.js for smooth 3D visuals
- **Intuitive Controls**:
  - Desktop: WASD movement, Space to kick, Shift to sprint, E to switch
  - Mobile: Virtual joystick + touch buttons with visual feedback
- **AI Opponents**: Smart AI that chases the ball and tries to score
- **Score Tracking**: Real-time score display
- **Dynamic Camera**: Follows your controlled player

## Tech Stack

- **TypeScript**: Type-safe JavaScript
- **Three.js**: 3D graphics rendering
- **Cannon.js**: Physics engine for realistic ball and player movement
- **Vite**: Fast build tool and dev server

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

### Run the Game

Start the development server:
```bash
npm run dev
```

The game will open automatically in your browser at `http://localhost:3000`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Controls

### Desktop (Keyboard)
- **W** - Move forward
- **A** - Move left
- **S** - Move backward
- **D** - Move right
- **Space** - Kick/Pass the ball
- **Shift** - Sprint
- **E** - Switch to the nearest teammate

### Mobile (Touch)
- **Virtual Joystick** (bottom-left) - Move player in any direction
- **Red Button** (bottom-right) - Kick/Pass the ball
- **Blue Button** (middle-right) - Sprint while held
- **Orange Button** (top-right) - Switch to nearest teammate

The game automatically detects your device and shows the appropriate controls!

## Game Mechanics

### Scoring
- Score by getting the ball into the opponent's goal
- Goals are located at each end of the field
- Score is displayed at the top of the screen

### Player Switching
- Press **E** to switch control to the teammate closest to the ball
- The camera follows your controlled player

### AI Behavior
- AI players chase the ball when it's nearby
- AI attempts to kick toward the opponent's goal
- AI returns to defensive positions when the ball is far away

## Project Structure

```
src/
├── main.ts          # Entry point
├── Game.ts          # Main game loop and orchestration
├── Field.ts         # Soccer field rendering
├── Player.ts        # Player entity with physics
├── Ball.ts          # Ball physics and behavior
├── InputManager.ts  # Keyboard input handling
├── AIController.ts  # AI behavior logic
└── GameState.ts     # Score and game state tracking
```

## Future Enhancements

- Multiplayer support (local and online)
- Player stats and attributes
- Different formations and tactics
- Tournament/career mode
- Mobile touch controls
- Improved AI difficulty levels
- Sound effects and music
- Replay system
- Customizable teams and jerseys

## Development

This is the foundation for a full-featured soccer game. The architecture is designed to be extensible for future features like:
- Network multiplayer
- Advanced AI tactics
- Player progression systems
- Tournament modes
- Mobile deployment

Built with performance and gameplay feel as the top priorities.
