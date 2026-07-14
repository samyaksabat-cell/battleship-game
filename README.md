# Battleship Game

A browser-based Battleship game where a human plays against an AI opponent.

## Features

- **Single-page web app** - HTML/CSS/JS only, no backend required
- **Standard 10x10 grid** with authentic ship set:
  - Carrier (5 cells)
  - Battleship (4 cells)
  - Cruiser (3 cells)
  - Submarine (3 cells)
  - Destroyer (2 cells)
- **Ship placement options**:
  - Manual placement with click-to-place
  - Right-click to rotate ship orientation
  - "Randomize" button for auto-placement
- **Smart AI opponent**:
  - Hunt mode: Random firing until a hit is scored
  - Target mode: Once a hit is made, AI targets adjacent cells to sink the ship
- **Win/lose screens** with "Play Again" button
- **Responsive design** for different screen sizes

## How to Play

1. **Place Your Ships**
   - Click on your grid to place ships
   - Right-click to rotate between horizontal and vertical
   - Or click "Randomize Placement" for instant setup
   - Click "Start Game" when ready

2. **Battle**
   - Click on the "Enemy Waters" grid to attack
   - Red X = hit, White circle = miss
   - AI will automatically take its turn after you

3. **Win**
   - Sink all enemy ships to win
   - Don't let the AI sink your ships first!

## Technical Details

- **Pure client-side** - Can be hosted on GitHub Pages or any static hosting
- **No dependencies** - Vanilla JavaScript, no frameworks
- **AI Strategy** - Implements hunt-and-target algorithm for intelligent play

## Deployment

This game is designed to be deployed on GitHub Pages:

1. Create a new GitHub repository
2. Upload these files:
   - index.html
   - style.css
   - game.js
3. Enable GitHub Pages in repository settings
4. Select the main branch as source

## Files

- `index.html` - Main game structure
- `style.css` - Game styling and responsive design
- `game.js` - Game logic and AI implementation
- `test.html` - Automated unit tests
- `manual-test.html` - Manual testing guide

## License

Free to use and modify.