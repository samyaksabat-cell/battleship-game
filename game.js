import { GRID_SIZE, SHIPS } from './src/constants.js';
import { canPlaceShip, createGrid, placeShip } from './src/board.js';
import { createAI } from './src/ai/index.js';
import { createKnowledge, recordShot } from './src/ai/knowledge.js';
import { computeProbabilityMap } from './src/ai/hard.js';
import { analyzeShots, formatCell } from './src/analysis.js';

const HEAT_LEVELS = 5;

// Game State
let playerGrid = [];
let aiGrid = [];
let playerShips = [];
let aiShips = [];
let currentPlayerShipIndex = 0;
let isPlayerTurn = true;
let gameOver = false;
let isHorizontal = true;

// AI State
let aiDifficulty = 'medium';
let ai = createAI(aiDifficulty);
let aiKnowledge = createKnowledge(SHIPS);
let showHeatmap = false;

// Player shot history, replayed by the post-game analysis
let playerShotHistory = [];

// DOM Elements
const setupScreen = document.getElementById('setup-screen');
const gameScreen = document.getElementById('game-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const playerGridSetup = document.getElementById('player-grid');
const playerGridGame = document.getElementById('player-grid-game');
const aiGridElement = document.getElementById('ai-grid');
const randomizeBtn = document.getElementById('randomize-btn');
const startGameBtn = document.getElementById('start-game-btn');
const difficultySelect = document.getElementById('difficulty-select');
const heatmapToggle = document.getElementById('heatmap-toggle');
const heatmapLegend = document.getElementById('heatmap-legend');
const heatmapNote = document.getElementById('heatmap-note');
const currentShipDisplay = document.getElementById('current-ship');
const turnIndicator = document.getElementById('turn-indicator');
const playerShipsLeft = document.getElementById('player-ships-left');
const aiShipsLeft = document.getElementById('ai-ships-left');
const gameOverTitle = document.getElementById('game-over-title');
const gameOverMessage = document.getElementById('game-over-message');
const analysisEfficiency = document.getElementById('analysis-efficiency');
const analysisSummary = document.getElementById('analysis-summary');
const analysisMistakes = document.getElementById('analysis-mistakes');
const playAgainBtn = document.getElementById('play-again-btn');

// Initialize grids
function initializeGrids() {
    playerGrid = createGrid(GRID_SIZE);
    aiGrid = createGrid(GRID_SIZE);
    playerShips = [];
    aiShips = [];
    currentPlayerShipIndex = 0;
    isPlayerTurn = true;
    gameOver = false;

    resetAI();
    playerShotHistory = [];
}

function resetAI() {
    ai = createAI(aiDifficulty);
    aiKnowledge = createKnowledge(SHIPS);
}

// Create grid UI
function createGridUI(gridElement, isSetup = false, isAI = false) {
    gridElement.innerHTML = '';
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;

            if (isSetup && !isAI) {
                cell.addEventListener('click', () => handleSetupClick(row, col));
                cell.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    handleSetupRightClick(row, col);
                });
            } else if (!isSetup && isAI) {
                cell.addEventListener('click', () => handlePlayerAttack(row, col));
            }

            gridElement.appendChild(cell);
        }
    }
}

function handleSetupClick(row, col) {
    if (currentPlayerShipIndex >= SHIPS.length) return;

    const ship = SHIPS[currentPlayerShipIndex];
    if (canPlaceShip(playerGrid, row, col, ship.size, isHorizontal)) {
        const positions = placeShip(playerGrid, row, col, ship.size, isHorizontal, ship.name);
        playerShips.push({ name: ship.name, positions, hits: 0 });
        currentPlayerShipIndex++;
        updateSetupGrid();
        updateCurrentShipDisplay();

        if (currentPlayerShipIndex >= SHIPS.length) {
            startGameBtn.disabled = false;
        }
    }
}

function handleSetupRightClick() {
    isHorizontal = !isHorizontal;
    updateCurrentShipDisplay();
}

function updateSetupGrid() {
    const cells = playerGridSetup.querySelectorAll('.cell');
    cells.forEach(cell => {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        cell.className = 'cell';
        if (playerGrid[row][col]) {
            cell.classList.add('ship');
        }
    });
}

function updateCurrentShipDisplay() {
    if (currentPlayerShipIndex < SHIPS.length) {
        const ship = SHIPS[currentPlayerShipIndex];
        currentShipDisplay.textContent = `Current Ship: ${ship.name} (${ship.size} cells) - ${isHorizontal ? 'Horizontal' : 'Vertical'} (Right-click to rotate)`;
    } else {
        currentShipDisplay.textContent = 'All ships placed!';
    }
}

// Random placement
function randomizePlacement() {
    initializeGrids();
    isHorizontal = true;

    SHIPS.forEach(ship => {
        let placed = false;
        while (!placed) {
            const row = Math.floor(Math.random() * GRID_SIZE);
            const col = Math.floor(Math.random() * GRID_SIZE);
            const horizontal = Math.random() < 0.5;

            if (canPlaceShip(playerGrid, row, col, ship.size, horizontal)) {
                const positions = placeShip(playerGrid, row, col, ship.size, horizontal, ship.name);
                playerShips.push({ name: ship.name, positions, hits: 0 });
                placed = true;
            }
        }
    });

    currentPlayerShipIndex = SHIPS.length;
    updateSetupGrid();
    updateCurrentShipDisplay();
    startGameBtn.disabled = false;
}

// Game start
function startGame() {
    resetAI();

    // Place AI ships randomly
    SHIPS.forEach(ship => {
        let placed = false;
        while (!placed) {
            const row = Math.floor(Math.random() * GRID_SIZE);
            const col = Math.floor(Math.random() * GRID_SIZE);
            const horizontal = Math.random() < 0.5;

            if (canPlaceShip(aiGrid, row, col, ship.size, horizontal)) {
                const positions = placeShip(aiGrid, row, col, ship.size, horizontal, ship.name);
                aiShips.push({ name: ship.name, positions, hits: 0 });
                placed = true;
            }
        }
    });

    setupScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');

    createGridUI(playerGridGame, false, false);
    createGridUI(aiGridElement, false, true);

    updateHeatmapControls();
    updateGameGrids();
    updateScore();
}

// The heatmap shows the Hard AI's probability map, so it is only meaningful
// when the Hard AI is the one firing at the player's fleet.
function isHeatmapActive() {
    return showHeatmap && aiDifficulty === 'hard' && !gameOver;
}

function updateHeatmapControls() {
    heatmapLegend.classList.toggle('hidden', !isHeatmapActive());
    heatmapNote.classList.toggle(
        'hidden',
        !(showHeatmap && aiDifficulty !== 'hard')
    );
}

// Scores are spread over the range currently present on the board, so the
// colour scale stays readable whether the map is flat or dominated by a
// wounded ship.
function heatLevel(score, minScore, maxScore) {
    if (score <= 0 || maxScore <= 0) return 0;
    if (maxScore === minScore) return HEAT_LEVELS;
    return Math.max(1, Math.ceil(((score - minScore) / (maxScore - minScore)) * HEAT_LEVELS));
}

// Update game grids display
function updateGameGrids() {
    const heatmap = isHeatmapActive() ? computeProbabilityMap(aiKnowledge) : null;
    const scores = heatmap ? heatmap.flat().filter(score => score > 0) : [];
    const maxScore = scores.length ? Math.max(...scores) : 0;
    const minScore = scores.length ? Math.min(...scores) : 0;

    // Update player grid
    const playerCells = playerGridGame.querySelectorAll('.cell');
    playerCells.forEach(cell => {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        cell.className = 'cell';
        cell.textContent = '';
        cell.removeAttribute('title');

        const cellData = playerGrid[row][col];

        // Show ship if present
        if (typeof cellData === 'string') {
            cell.classList.add('ship');
        }
        // Show hits/misses from AI attacks
        else if (typeof cellData === 'object' && cellData !== null) {
            if (cellData.hit) {
                cell.classList.add('ship', 'hit');
                cell.textContent = '✗';
            } else if (cellData.miss) {
                cell.classList.add('miss');
                cell.textContent = '○';
            }
        }

        // Non-destructive heatmap overlay: only un-fired cells are tinted, and
        // the tint is dropped entirely as soon as the toggle is switched off.
        if (heatmap) {
            const level = heatLevel(heatmap[row][col], minScore, maxScore);
            if (level > 0) {
                cell.classList.add('heat', `heat-${level}`);
                cell.title = `AI interest: ${Math.round((heatmap[row][col] / maxScore) * 100)}%`;
            }
        }
    });

    // Update AI grid (hide ships, show hits/misses)
    const aiCells = aiGridElement.querySelectorAll('.cell');
    aiCells.forEach(cell => {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        cell.className = 'cell';
        cell.textContent = '';

        const cellData = aiGrid[row][col];
        if (typeof cellData === 'object' && cellData !== null) {
            if (cellData.hit) {
                cell.classList.add('hit');
                cell.textContent = '✗';
            } else if (cellData.miss) {
                cell.classList.add('miss');
                cell.textContent = '○';
            }
        }
    });

    // Re-apply the sunk styling for enemy ships that are already down
    aiShips
        .filter(ship => ship.hits === ship.positions.length)
        .forEach(ship => {
            ship.positions.forEach(pos => {
                const cell = aiGridElement.querySelector(`[data-row="${pos.row}"][data-col="${pos.col}"]`);
                if (cell) cell.classList.add('sunk');
            });
        });
}

// Player attack
function handlePlayerAttack(row, col) {
    if (!isPlayerTurn || gameOver) return;

    const cellData = aiGrid[row][col];

    // Check if already fired upon
    if (typeof cellData === 'object' && cellData !== null) return;

    let sunkShip = null;
    const hit = typeof cellData === 'string';

    if (hit) {
        aiGrid[row][col] = { hit: true, ship: cellData };

        const ship = aiShips.find(s => s.name === cellData);
        if (ship) {
            ship.hits++;
            if (ship.hits === ship.positions.length) {
                sunkShip = { size: ship.positions.length, positions: ship.positions };
            }
        }
    } else {
        aiGrid[row][col] = { miss: true };
    }

    playerShotHistory.push({ row, col, hit, sunk: Boolean(sunkShip), sunkShip });

    updateGameGrids();
    updateScore();

    if (checkGameOver()) return;

    isPlayerTurn = false;
    turnIndicator.textContent = "AI's Turn";
    turnIndicator.style.color = '#ff6b6b';

    setTimeout(aiTurn, 1000);
}

// AI turn: delegates the choice of cell to the selected difficulty module
function aiTurn() {
    if (gameOver) return;

    const move = ai.nextMove(aiKnowledge);
    if (!move) return;

    const { row, col } = move;
    const cellData = playerGrid[row][col];
    const hit = typeof cellData === 'string';
    let sunkShip = null;

    if (hit) {
        playerGrid[row][col] = { hit: true, ship: cellData };
        const ship = playerShips.find(s => s.name === cellData);
        if (ship) {
            ship.hits++;
            if (ship.hits === ship.positions.length) {
                sunkShip = { size: ship.positions.length, positions: ship.positions };
            }
        }
    } else {
        playerGrid[row][col] = { miss: true };
    }

    const result = { row, col, hit, sunk: Boolean(sunkShip), sunkShip };
    recordShot(aiKnowledge, result);
    ai.onShotResult(aiKnowledge, result);

    updateGameGrids();
    updateScore();

    if (checkGameOver()) return;

    isPlayerTurn = true;
    turnIndicator.textContent = 'Your Turn';
    turnIndicator.style.color = '#00d4ff';
}

// Update score display
function updateScore() {
    const playerAlive = playerShips.filter(s => s.hits < s.positions.length).length;
    const aiAlive = aiShips.filter(s => s.hits < s.positions.length).length;

    playerShipsLeft.textContent = playerAlive;
    aiShipsLeft.textContent = aiAlive;
}

// Post-game analysis of the player's own shots
function renderAnalysis() {
    const { turns, efficiency, worstTurns } = analyzeShots(playerShotHistory);

    if (turns.length === 0) {
        analysisEfficiency.textContent = '—';
        analysisSummary.textContent = 'No shots to analyse.';
        analysisMistakes.innerHTML = '';
        return;
    }

    analysisEfficiency.textContent = `${efficiency.toFixed(1)}%`;
    analysisSummary.textContent =
        `Across ${turns.length} shot${turns.length === 1 ? '' : 's'}, your choices scored ` +
        `${efficiency.toFixed(1)}% of what the Hard AI's probability engine would have picked.`;

    analysisMistakes.innerHTML = '';
    if (worstTurns.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'Every shot was an optimal cell. Flawless targeting!';
        analysisMistakes.appendChild(li);
        return;
    }

    worstTurns.forEach(turn => {
        const li = document.createElement('li');
        li.innerHTML =
            `<strong>Turn ${turn.turn}:</strong> you fired at ${formatCell(turn)} ` +
            `(${Math.round(turn.ratio * 100)}% of optimal) — the best cell was ` +
            `${formatCell(turn.bestCell)}.`;
        analysisMistakes.appendChild(li);
    });
}

// Check game over
function checkGameOver() {
    const playerAlive = playerShips.filter(s => s.hits < s.positions.length).length;
    const aiAlive = aiShips.filter(s => s.hits < s.positions.length).length;

    if (playerAlive === 0 || aiAlive === 0) {
        gameOver = true;
        gameScreen.classList.add('hidden');
        gameOverScreen.classList.remove('hidden');

        if (playerAlive === 0) {
            gameOverTitle.textContent = 'You Lose!';
            gameOverMessage.textContent = 'The AI sank all your ships. Better luck next time!';
            gameOverTitle.style.color = '#ff6b6b';
        } else {
            gameOverTitle.textContent = 'You Win!';
            gameOverMessage.textContent = 'Congratulations! You sank all enemy ships!';
            gameOverTitle.style.color = '#00d4ff';
        }

        renderAnalysis();

        return true;
    }

    return false;
}

// Play again
function playAgain() {
    gameOverScreen.classList.add('hidden');
    setupScreen.classList.remove('hidden');

    initializeGrids();
    isHorizontal = true;
    currentPlayerShipIndex = 0;

    createGridUI(playerGridSetup, true, false);
    updateSetupGrid();
    updateCurrentShipDisplay();
    updateHeatmapControls();
    startGameBtn.disabled = true;
}

// Event listeners
randomizeBtn.addEventListener('click', randomizePlacement);
startGameBtn.addEventListener('click', startGame);
playAgainBtn.addEventListener('click', playAgain);

difficultySelect.addEventListener('change', () => {
    aiDifficulty = difficultySelect.value;
    resetAI();
    updateHeatmapControls();
});

heatmapToggle.addEventListener('change', () => {
    showHeatmap = heatmapToggle.checked;
    updateHeatmapControls();
    updateGameGrids();
});

// Initialize
aiDifficulty = difficultySelect.value;
initializeGrids();
createGridUI(playerGridSetup, true, false);
updateCurrentShipDisplay();
updateHeatmapControls();
