# Battleship Game

A browser-based Battleship game where a human plays against an AI opponent with
three selectable difficulty tiers.

## Features

- **Single-page web app** - HTML/CSS/JS only, no backend and no build step
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
- **Three AI difficulty tiers** (selectable on the setup screen)
- **"Show AI reasoning"** heatmap of the Hard AI's probability map
- **Post-game analysis** grading every shot you fired
- **Win/lose screens** with "Play Again" button
- **Responsive design** for different screen sizes

## AI Difficulty Tiers

| Tier | Module | Strategy | Avg. shots to sink the fleet* |
| --- | --- | --- | --- |
| Easy | `src/ai/easy.js` | Fires at a uniformly random cell it has not fired at yet. | ~96 |
| Medium | `src/ai/medium.js` | Hunt/target: random fire until it hits, then probes the orthogonally adjacent cells of the wounded ship until it sinks or the leads run out. | ~69 |
| Hard | `src/ai/hard.js` | Probability density (see below). | ~44 |

\* Measured by `src/simulation.test.js` over 200 seeded games per tier; every tier
faces the same 200 boards.

Every tier is a pure module: it receives the AI's knowledge of the opponent
board (`{ shots, sunkCells, remainingShipSizes }`, see `src/ai/knowledge.js`) and
returns the next `{ row, col }` to fire at. None of them touch the DOM.

### The probability-density algorithm (Hard)

For every ship that is still afloat, the Hard AI slides that ship across the
board in both orientations and keeps every placement that is still *possible* -
one that covers no miss and no cell of an already sunk ship. Each surviving
placement adds a weight to each un-fired cell it covers:

- a placement that covers no known hit adds `1`;
- a placement that covers `n` unresolved hits (hits on a ship that has not been
  sunk yet) adds `12^n`, so explanations of a wounded ship dominate the map;
- un-fired cells orthogonally adjacent to an unresolved hit get a further flat
  bonus.

The AI fires at the highest scoring cell, breaking ties randomly. Cells that were
already fired at always score `0`. The result is the "no hits yet" parity/centre
bias you would expect from a strong player, and a decisive finish-the-ship
behaviour once something is wounded.

## Show AI reasoning (heatmap)

During a Hard game, tick **Show AI reasoning** to overlay the Hard AI's live
probability map on your own fleet grid. Each un-fired cell is tinted from pale
yellow (low) to bright red (high) according to how likely the AI is to fire
there, and the legend above the boards maps the colours. The overlay refreshes
every turn, is drawn on top of the existing ship/hit/miss colours without
replacing them, and disappears as soon as the toggle is switched off. With Easy
or Medium selected the toggle explains that the heatmap is Hard-only.

## Post-game analysis

Every shot you fire is recorded. When the match ends, the game replays your shot
history through the same Hard probability engine and, for each turn, compares the
score of the cell you chose with the score of the best cell available at that
moment. The game-over screen shows:

- **Targeting efficiency** - the average of `your cell's score / best cell's score`
  across the match, as a percentage;
- **Biggest missed opportunities** - the three turns with the largest gap between
  your cell and the optimal one, with the cell you should have fired at.

## How to Play

1. **Place Your Ships**
   - Choose the AI difficulty
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

## Running the game locally

The game is loaded as ES modules, so it must be served over HTTP (browsers block
module imports on `file://`):

```bash
npx serve .
# then open http://localhost:3000
```

## Tests

```bash
npm install
npm test
```

`npm test` runs Vitest over the pure modules:

- `src/board.test.js` - grid, placement and fleet helpers
- `src/ai/easy.test.js`, `src/ai/medium.test.js`, `src/ai/hard.test.js` - one per tier
- `src/analysis.test.js` - post-game efficiency and worst-turn detection
- `src/simulation.test.js` - 200 seeded games per tier, asserting Hard beats
  Medium beats Easy on average shots

`test.html` additionally runs a handful of the same checks straight in the
browser (serve it over HTTP as above).

## Technical Details

- **Pure client-side** - Can be hosted on GitHub Pages or any static hosting
- **No runtime dependencies** - vanilla JavaScript ES modules; Vitest is a dev
  dependency used only for tests
- **No build step** - the files that are committed are the files that are served

## Deployment

This game is designed to be deployed on GitHub Pages:

1. Push the repository to GitHub
2. Enable GitHub Pages in repository settings
3. Select the main branch as source

GitHub Pages serves `src/**` as static files with the correct MIME type, so the
ES module imports work as-is - no bundler required.

## Files

- `index.html` - Main game structure
- `style.css` - Game styling, heatmap scale and analysis screen
- `game.js` - DOM wiring: setup, turn loop, heatmap rendering, analysis rendering
- `src/constants.js` - Grid size and ship definitions
- `src/board.js` - Pure grid/placement helpers (`canPlaceShip`, `placeShip`, `getAdjacentCells`, ...)
- `src/rng.js` - Seeded PRNG for deterministic tests and simulations
- `src/ai/knowledge.js` - What an AI knows about the board it fires at
- `src/ai/easy.js`, `src/ai/medium.js`, `src/ai/hard.js` - The three difficulty tiers
- `src/ai/index.js` - `createAI(difficulty, rng)` wrapper used by the game
- `src/analysis.js` - Post-game shot grading
- `src/simulation.js` - Headless games used by the difficulty simulations
- `test.html` - In-browser smoke tests
- `manual-test.html` - Manual testing guide

## License

Free to use and modify.
