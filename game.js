import { GRID_SIZE, SHIPS } from './src/constants.js';
import { canPlaceShip, createGrid, createRandomFleet, placeShip } from './src/board.js';
import { createAI } from './src/ai/index.js';
import { createKnowledge, recordShot } from './src/ai/knowledge.js';
import { computeProbabilityMap } from './src/ai/hard.js';
import { analyzeShots, formatCell } from './src/analysis.js';
import { buildReplay } from './src/replay.js';
import {
    createStats, loadStats, recordGame, saveStats, streakMultiplier
} from './src/scoring.js';
import { dailyChallenge } from './src/daily.js';
import { getMap, MAPS } from './src/maps.js';
import { isMuted, playSound, setMuted } from './src/audio.js';
import { personalityLine } from './src/personality.js';
import {
    clearProfile, hasProfile, loadProfile, saveProfile
} from './src/profile.js';

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
let currentMapId = 'classic';
let currentMap = getMap(currentMapId);
let islands = [];
let islandLookup = new Set();
let blocked = createGrid(GRID_SIZE, false);
let turnCounter = 0;
let dailyFleet = null;
let aiWasBehind = false;

// AI State
let aiDifficulty = 'medium';
let ai = createAI(aiDifficulty);
let aiKnowledge = createKnowledge(SHIPS);
let showHeatmap = false;

// Player shot history, replayed by the post-game analysis
let playerShotHistory = [];
let replayFrames = [];
let replayIndex = 0;
let replayTimer = null;
let replayPlaying = false;
let endGameTimer = null;
let endPointsAnimation = null;

// DOM Elements
const welcomeScreen = document.getElementById('welcome-screen');
const welcomeNew = document.getElementById('welcome-new');
const welcomeReturning = document.getElementById('welcome-returning');
const welcomeBackTitle = document.getElementById('welcome-back-title');
const welcomeSummary = document.getElementById('welcome-summary');
const playerNameInput = document.getElementById('player-name-input');
const welcomeStartBtn = document.getElementById('welcome-start-btn');
const welcomeContinueBtn = document.getElementById('welcome-continue-btn');
const welcomeNewPlayerBtn = document.getElementById('welcome-new-player-btn');
const setupScreen = document.getElementById('setup-screen');
const gameScreen = document.getElementById('game-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const profileBar = document.getElementById('profile-bar');
const endGameModal = document.getElementById('end-game-modal');
const endGameTitle = document.getElementById('end-game-title');
const endGameMessage = document.getElementById('end-game-message');
const endGamePoints = document.getElementById('end-game-points');
const endGameBreakdown = document.getElementById('end-game-breakdown');
const endViewReplayBtn = document.getElementById('end-view-replay-btn');
const endPlayAgainBtn = document.getElementById('end-play-again-btn');
const playerGridSetup = document.getElementById('player-grid');
const playerGridGame = document.getElementById('player-grid-game');
const aiGridElement = document.getElementById('ai-grid');
const randomizeBtn = document.getElementById('randomize-btn');
const startGameBtn = document.getElementById('start-game-btn');
const difficultySelect = document.getElementById('difficulty-select');
const mapSelect = document.getElementById('map-select');
const dailyChallengeBtn = document.getElementById('daily-challenge-btn');
const dailyStatus = document.getElementById('daily-status');
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
const pointsEarned = document.getElementById('points-earned');
const statsScreen = document.getElementById('stats-screen');
const statsContent = document.getElementById('stats-content');
const viewStatsBtn = document.getElementById('view-stats-btn');
const statsBackBtn = document.getElementById('stats-back-btn');
const watchReplayBtn = document.getElementById('watch-replay-btn');
const replay = document.getElementById('replay');
const replayGrid = document.getElementById('replay-grid');
const replayCaption = document.getElementById('replay-caption');
const replayPrev = document.getElementById('replay-prev');
const replayPlay = document.getElementById('replay-play');
const replayNext = document.getElementById('replay-next');
const replayRestart = document.getElementById('replay-restart');
const muteToggle = document.getElementById('mute-toggle');
const playerBoardGame = document.getElementById('player-board-game');
let statsOrigin = setupScreen;

function updateProfileHeader() {
    const profile = loadProfile();
    const stats = loadStats();
    const streak = stats.currentStreak;
    const multiplier = streakMultiplier(streak) > 1 ? ` (×${streakMultiplier(streak)})` : '';
    profileBar.textContent =
        `${profile.name} • Score: ${stats.totalPoints} pts • Streak: ${streak}${multiplier}`;
}

function updateWelcomeView() {
    const returning = hasProfile();
    welcomeNew.classList.toggle('hidden', returning);
    welcomeReturning.classList.toggle('hidden', !returning);
    if (returning) {
        const profile = loadProfile();
        const stats = loadStats();
        const multiplier = streakMultiplier(stats.currentStreak) > 1
            ? ` (×${streakMultiplier(stats.currentStreak)})`
            : '';
        welcomeBackTitle.textContent = `Welcome back, ${profile.name}`;
        welcomeSummary.innerHTML =
            `<div><strong>Total points</strong><br>${stats.totalPoints}</div>` +
            `<div><strong>Current streak</strong><br>${stats.currentStreak}${multiplier}</div>` +
            `<div><strong>Best streak</strong><br>${stats.bestStreak}</div>`;
    } else {
        playerNameInput.value = '';
        welcomeStartBtn.disabled = true;
    }
}

function enterSetup() {
    welcomeScreen.classList.add('hidden');
    setupScreen.classList.remove('hidden');
    updateProfileHeader();
}

function updateMapState(mapId) {
    currentMapId = mapId;
    currentMap = getMap(currentMapId) ?? MAPS.classic;
    islands = currentMap.islands ?? [];
    islandLookup = new Set(islands.map(({ row, col }) => `${row},${col}`));
    blocked = createGrid(GRID_SIZE, false);
    islands.forEach(({ row, col }) => {
        if (blocked[row]?.[col] !== undefined) blocked[row][col] = true;
    });
}

function isIsland(row, col) {
    return islandLookup.has(`${row},${col}`);
}

function canPlaceCurrentShip(row, col, size, horizontal) {
    if (!canPlaceShip(playerGrid, row, col, size, horizontal)) return false;
    for (let i = 0; i < size; i++) {
        const shipRow = horizontal ? row : row + i;
        const shipCol = horizontal ? col + i : col;
        if (isIsland(shipRow, shipCol)) return false;
    }
    return true;
}

function triggerEffect(gridElement, row, col, effect) {
    const cell = gridElement.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    if (!cell) return;
    cell.classList.add(effect);
    setTimeout(() => cell.classList.remove(effect), 500);
}

function triggerShipEffect(gridElement, positions, effect) {
    positions.forEach(({ row, col }) => {
        const cell = gridElement.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (cell) cell.classList.add(effect);
    });
    setTimeout(() => positions.forEach(({ row, col }) => {
        const cell = gridElement.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (cell) cell.classList.remove(effect);
    }), 700);
}

function triggerShake() {
    gameScreen.classList.add('shake');
    setTimeout(() => gameScreen.classList.remove('shake'), 500);
}

function triggerSonar() {
    const overlay = document.createElement('div');
    overlay.className = 'sonar-sweep';
    playerBoardGame.appendChild(overlay);
    setTimeout(() => overlay.remove(), 900);
}

function formatPointsBreakdown(result) {
    if (!result.rawPoints) return 'No points — win streak reset.';
    const raw = Number.isInteger(result.rawPoints)
        ? `${result.rawPoints}`
        : result.rawPoints.toFixed(1);
    const rounding = Number.isInteger(result.rawPoints)
        ? ''
        : `, rounded to ${result.pointsEarned}`;
    return `${result.basePoints} base × ${result.multiplier.toFixed(1)} streak = ${raw}${rounding}`;
}

function animateEndPoints(points, streak) {
    if (endPointsAnimation !== null) {
        cancelAnimationFrame(endPointsAnimation);
        endPointsAnimation = null;
    }
    const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || points === 0) {
        endGamePoints.textContent = `${points} pts · win streak: ${streak}`;
        return;
    }
    const started = performance.now();
    const duration = 900;
    const tick = (now) => {
        const progress = Math.min(1, (now - started) / duration);
        endGamePoints.textContent = `${Math.round(points * progress)} pts · win streak: ${streak}`;
        if (progress < 1) {
            endPointsAnimation = requestAnimationFrame(tick);
        } else {
            endPointsAnimation = null;
        }
    };
    endPointsAnimation = requestAnimationFrame(tick);
}

function revealEndGameModal(won, result, line) {
    if (!gameOver) return;
    endGameTitle.textContent = won ? 'Victory!' : 'Defeat';
    endGameMessage.textContent = line;
    endGameBreakdown.textContent = won
        ? formatPointsBreakdown(result)
        : 'No points — win streak reset.';
    if (won) {
        animateEndPoints(result.pointsEarned, result.stats.currentStreak);
    } else {
        endGamePoints.textContent = 'No points';
    }
    endGameModal.classList.remove('hidden');
    if (won) triggerVictoryCelebration();
}

function triggerVictoryCelebration() {
    if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    for (let index = 0; index < 30; index++) {
        const sparkle = document.createElement('div');
        sparkle.className = 'sparkle';
        sparkle.style.left = `${Math.random() * 100}%`;
        sparkle.style.top = `${Math.random() * 100}%`;
        const delay = Math.random() * 0.35;
        sparkle.style.animationDelay = `${delay}s`;
        sparkle.style.setProperty('--sparkle-drift', `${(Math.random() - 0.5) * 24}px`);
        gameScreen.appendChild(sparkle);
        setTimeout(() => sparkle.remove(), 1100 + delay * 1000);
    }
}

// Initialize grids
function initializeGrids() {
    playerGrid = createGrid(GRID_SIZE);
    aiGrid = createGrid(GRID_SIZE);
    playerShips = [];
    aiShips = [];
    currentPlayerShipIndex = 0;
    isPlayerTurn = true;
    turnIndicator.textContent = 'Your Turn';
    turnIndicator.style.color = '#00d4ff';
    gameOver = false;
    turnCounter = 0;
    aiWasBehind = false;

    resetAI();
    playerShotHistory = [];
}

function resetAI() {
    ai = createAI(aiDifficulty);
    aiKnowledge = createKnowledge(SHIPS, GRID_SIZE, blocked);
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
            if (isIsland(row, col)) cell.classList.add('island');

            if (isSetup && !isAI) {
                if (!isIsland(row, col)) {
                    cell.addEventListener('click', () => handleSetupClick(row, col));
                    cell.addEventListener('contextmenu', (e) => {
                        e.preventDefault();
                        handleSetupRightClick(row, col);
                    });
                }
            } else if (!isSetup && isAI) {
                cell.addEventListener('click', () => handlePlayerAttack(row, col));
            }

            gridElement.appendChild(cell);
        }
    }
}

function handleSetupClick(row, col) {
    if (currentPlayerShipIndex >= SHIPS.length) return;
    if (isIsland(row, col)) return;

    const ship = SHIPS[currentPlayerShipIndex];
    if (canPlaceCurrentShip(row, col, ship.size, isHorizontal)) {
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
        if (isIsland(row, col)) cell.classList.add('island');
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
    const fleet = createRandomFleet(Math.random, SHIPS, GRID_SIZE, islands);
    playerGrid = fleet.grid;
    playerShips = fleet.ships;

    currentPlayerShipIndex = SHIPS.length;
    updateSetupGrid();
    updateCurrentShipDisplay();
    startGameBtn.disabled = false;
}

// Game start
function startGame() {
    resetAI();

    const fleet = dailyFleet ?? createRandomFleet(Math.random, SHIPS, GRID_SIZE, islands);
    aiGrid = fleet.grid;
    aiShips = fleet.ships;
    dailyFleet = null;

    setupScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');

    createGridUI(playerGridGame, false, false);
    createGridUI(aiGridElement, false, true);

    updateHeatmapControls();
    updateGameGrids();
    updateScore();
    updateProfileHeader();
    muteToggle.checked = isMuted();
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
        if (isIsland(row, col)) {
            cell.classList.add('island');
            return;
        }

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
        if (isIsland(row, col)) {
            cell.classList.add('island');
            return;
        }

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
        const unfired = typeof cellData !== 'object' || cellData === null;
        if (currentMap.hasFog && unfired) {
            const fogged = currentMap.fogCells(turnCounter, GRID_SIZE)
                .some((fogCell) => fogCell.row === row && fogCell.col === col);
            if (fogged) cell.classList.add('fog');
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
    if (isIsland(row, col)) return;

    const cellData = aiGrid[row][col];

    // Check if already fired upon
    if (typeof cellData === 'object' && cellData !== null) return;

    let sunkShip = null;
    const hit = typeof cellData === 'string';
    turnCounter++;
    playSound('fire');

    if (hit) {
        aiGrid[row][col] = { hit: true, ship: cellData };

        const ship = aiShips.find(s => s.name === cellData);
        if (ship) {
            ship.hits++;
            if (ship.hits === ship.positions.length) {
                sunkShip = { size: ship.positions.length, positions: ship.positions };
            }
        }
        playSound(sunkShip ? 'sink' : 'hit');
    } else {
        aiGrid[row][col] = { miss: true };
        playSound('splash');
    }

    playerShotHistory.push({ row, col, hit, sunk: Boolean(sunkShip), sunkShip });

    updateGameGrids();
    updateScore();
    triggerEffect(aiGridElement, row, col, hit ? 'exploding' : 'splashing');
    if (sunkShip) triggerShipEffect(aiGridElement, sunkShip.positions, 'sinking');
    if (hit) triggerShake();

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
    playSound('fire');

    if (hit) {
        playerGrid[row][col] = { hit: true, ship: cellData };
        const ship = playerShips.find(s => s.name === cellData);
        if (ship) {
            ship.hits++;
            if (ship.hits === ship.positions.length) {
                sunkShip = { size: ship.positions.length, positions: ship.positions };
            }
        }
        playSound(sunkShip ? 'sink' : 'hit');
    } else {
        playerGrid[row][col] = { miss: true };
        playSound('splash');
    }

    const result = { row, col, hit, sunk: Boolean(sunkShip), sunkShip };
    recordShot(aiKnowledge, result);
    ai.onShotResult(aiKnowledge, result);

    updateGameGrids();
    updateScore();
    triggerEffect(playerGridGame, row, col, hit ? 'exploding' : 'splashing');
    if (sunkShip) triggerShipEffect(playerGridGame, sunkShip.positions, 'sinking');
    if (hit) triggerShake();

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
    const { turns, efficiency, worstTurns } = analyzeShots(playerShotHistory, { blocked });

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

function renderStats() {
    const stats = loadStats();
    const winRate = stats.gamesPlayed ? (stats.wins / stats.gamesPlayed) * 100 : 0;
    statsContent.innerHTML = `
        <div class="stats-grid">
            <div><strong>Total points</strong><br>${stats.totalPoints}</div>
            <div><strong>Games played</strong><br>${stats.gamesPlayed}</div>
            <div><strong>Wins</strong><br>${stats.wins}</div>
            <div><strong>Losses</strong><br>${stats.losses}</div>
            <div><strong>Win rate</strong><br>${winRate.toFixed(1)}%</div>
            <div><strong>Current streak</strong><br>${stats.currentStreak}</div>
            <div><strong>Best streak</strong><br>${stats.bestStreak}</div>
        </div>
        <table class="stats-difficulty">
            <thead><tr><th>Difficulty</th><th>Wins</th><th>Losses</th></tr></thead>
            <tbody>
                ${['easy', 'medium', 'hard'].map((difficulty) => `
                    <tr><td>${difficulty[0].toUpperCase() + difficulty.slice(1)}</td>
                    <td>${stats.byDifficulty[difficulty].wins}</td>
                    <td>${stats.byDifficulty[difficulty].losses}</td></tr>
                `).join('')}
            </tbody>
        </table>`;
}

function showStats() {
    setupScreen.classList.add('hidden');
    gameScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    statsScreen.classList.remove('hidden');
    renderStats();
}

function hideReplay() {
    replay.classList.add('hidden');
    stopReplay();
}

function stopReplay() {
    if (replayTimer !== null) {
        clearTimeout(replayTimer);
        replayTimer = null;
    }
    replayPlaying = false;
    replayPlay.textContent = replayIndex === replayFrames.length - 1 ? 'Replay' : 'Play';
}

function renderReplayFrame() {
    const frame = replayFrames[replayIndex];
    if (!frame) return;
    const scores = frame.map.flat().filter((score) => score > 0);
    const maxScore = scores.length ? Math.max(...scores) : 0;
    const minScore = scores.length ? Math.min(...scores) : 0;
    const fired = new Map(
        playerShotHistory.slice(0, replayIndex + 1)
            .map((shot) => [`${shot.row},${shot.col}`, shot])
    );
    const cells = replayGrid.querySelectorAll('.cell');
    cells.forEach((cell) => {
        const row = Number(cell.dataset.row);
        const col = Number(cell.dataset.col);
        const key = `${row},${col}`;
        cell.className = 'cell';
        cell.textContent = '';
        if (isIsland(row, col)) {
            cell.classList.add('island');
            return;
        }
        const level = heatLevel(frame.map[row][col], minScore, maxScore);
        if (level > 0) cell.classList.add('heat', `heat-${level}`);
        const shot = fired.get(key);
        if (shot) {
            cell.classList.add(shot.hit ? 'hit' : 'miss');
            cell.textContent = shot.hit ? '✗' : '○';
        }
        if (row === frame.row && col === frame.col) cell.classList.add('replay-choice');
        if (frame.bestCell && row === frame.bestCell.row && col === frame.bestCell.col) {
            cell.classList.add('replay-best');
            cell.textContent = `${cell.textContent}★`;
        }
    });
    replay.classList.toggle('replay-frame--mistake', frame.isMistake);
    replayCaption.classList.toggle('mistake', frame.isMistake);
    const marker = frame.isMistake ? '⚠ Biggest mistakes — ' : '';
    const result = frame.hit ? 'Hit' : 'Miss';
    replayCaption.textContent =
        `${marker}Turn ${frame.turn}/${replayFrames.length} — you fired ${formatCell(frame)} (${result}). ` +
        `Optimal: ${frame.bestCell ? formatCell(frame.bestCell) : '—'} ` +
        `(${Math.round(frame.ratio * 100)}% of optimal).`;
    replayPrev.disabled = replayIndex === 0;
    replayNext.disabled = replayIndex === replayFrames.length - 1;
    replayPlay.textContent = replayPlaying
        ? 'Pause'
        : (replayIndex === replayFrames.length - 1 ? 'Replay' : 'Play');
}

function scheduleReplay() {
    if (!replayFrames.length || replayIndex >= replayFrames.length - 1) {
        stopReplay();
        return;
    }
    replayTimer = setTimeout(() => {
        replayTimer = null;
        replayIndex++;
        renderReplayFrame();
        if (replayIndex < replayFrames.length - 1) {
            scheduleReplay();
        } else {
            stopReplay();
        }
    }, replayFrames[replayIndex].isMistake ? 2600 : 1100);
}

function toggleReplay() {
    if (replayTimer !== null) {
        stopReplay();
    } else if (replayFrames.length && replayIndex < replayFrames.length - 1) {
        replayPlaying = true;
        replayPlay.textContent = 'Pause';
        scheduleReplay();
    } else if (replayFrames.length) {
        replayIndex = 0;
        replayPlaying = true;
        renderReplayFrame();
        scheduleReplay();
    }
}

function showReplay() {
    stopReplay();
    const result = buildReplay(playerShotHistory, { blocked });
    replayFrames = result.frames;
    replayIndex = 0;
    replay.classList.remove('hidden');
    if (!replayFrames.length) {
        replayCaption.textContent = 'No shots to replay.';
        replayPlay.disabled = true;
        replayPrev.disabled = true;
        replayNext.disabled = true;
        return;
    }
    replayPlay.disabled = false;
    createGridUI(replayGrid);
    renderReplayFrame();
}

function openReplayFromEndModal() {
    endGameModal.classList.add('hidden');
    gameScreen.classList.add('hidden');
    gameScreen.classList.remove('defeat-transition');
    gameOverScreen.classList.remove('hidden');
    showReplay();
    if (replayFrames.length) toggleReplay();
}

// Check game over
function checkGameOver() {
    const playerAlive = playerShips.filter(s => s.hits < s.positions.length).length;
    const aiAlive = aiShips.filter(s => s.hits < s.positions.length).length;
    if (aiAlive < playerAlive) aiWasBehind = true;

    if (playerAlive === 0 || aiAlive === 0) {
        gameOver = true;
        const won = playerAlive !== 0;
        const line = personalityLine({
            won,
            playerShipsLeft: playerAlive,
            aiShipsLeft: aiAlive,
            difficulty: aiDifficulty,
            aiWasBehind
        });
        if (!won) {
            gameOverTitle.textContent = 'You Lose!';
            gameOverMessage.textContent = line;
            gameOverTitle.style.color = '#ff6b6b';
            playSound('lose');
            gameScreen.classList.add('defeat-transition');
        } else {
            gameOverTitle.textContent = 'You Win!';
            gameOverMessage.textContent = line;
            gameOverTitle.style.color = '#00d4ff';
            playSound('win');
        }

        const result = recordGame(loadStats(), { difficulty: aiDifficulty, won });
        saveStats(undefined, result.stats);
        updateProfileHeader();
        pointsEarned.textContent = won
            ? `${result.pointsEarned} pts — ${formatPointsBreakdown(result)} (win streak: ${result.stats.currentStreak})`
            : 'No points — win streak reset.';
        renderAnalysis();
        hideReplay();
        endGameTimer = setTimeout(() => {
            endGameTimer = null;
            revealEndGameModal(won, result, line);
        }, 1000);

        return true;
    }

    return false;
}

// Play again
function playAgain() {
    hideReplay();
    if (endGameTimer !== null) {
        clearTimeout(endGameTimer);
        endGameTimer = null;
    }
    if (endPointsAnimation !== null) {
        cancelAnimationFrame(endPointsAnimation);
        endPointsAnimation = null;
    }
    endGameModal.classList.add('hidden');
    gameScreen.classList.remove('defeat-transition');
    gameScreen.classList.add('hidden');
    dailyStatus.textContent = '';
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
playerNameInput.addEventListener('input', () => {
    welcomeStartBtn.disabled = playerNameInput.value.trim().length === 0;
});
welcomeStartBtn.addEventListener('click', () => {
    saveProfile(undefined, { name: playerNameInput.value });
    enterSetup();
});
welcomeContinueBtn.addEventListener('click', enterSetup);
welcomeNewPlayerBtn.addEventListener('click', () => {
    if (!confirm('Start a new player profile and reset your score?')) return;
    clearProfile();
    saveStats(undefined, createStats());
    updateWelcomeView();
    updateProfileHeader();
    setupScreen.classList.add('hidden');
    gameScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    statsScreen.classList.add('hidden');
    welcomeScreen.classList.remove('hidden');
});
randomizeBtn.addEventListener('click', randomizePlacement);
startGameBtn.addEventListener('click', startGame);
mapSelect.addEventListener('change', () => {
    updateMapState(mapSelect.value);
    dailyFleet = null;
    dailyStatus.textContent = '';
    initializeGrids();
    createGridUI(playerGridSetup, true, false);
    updateSetupGrid();
    updateCurrentShipDisplay();
    startGameBtn.disabled = true;
});
dailyChallengeBtn.addEventListener('click', () => {
    const now = new Date();
    const today = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0')
    ].join('-');
    const challenge = dailyChallenge(today);
    dailyFleet = challenge.fleet;
    mapSelect.value = challenge.mapId;
    updateMapState(challenge.mapId);
    dailyStatus.textContent = `Daily Challenge: ${today} (seed ${challenge.seed})`;
    randomizePlacement();
});
playAgainBtn.addEventListener('click', playAgain);
viewStatsBtn.addEventListener('click', () => {
    statsOrigin = setupScreen;
    showStats();
});
watchReplayBtn.addEventListener('click', () => {
    statsOrigin = gameOverScreen;
    showStats();
});
statsBackBtn.addEventListener('click', () => {
    statsScreen.classList.add('hidden');
    statsOrigin.classList.remove('hidden');
});
replayPrev.addEventListener('click', () => {
    stopReplay();
    if (replayIndex > 0) replayIndex--;
    renderReplayFrame();
});
replayNext.addEventListener('click', () => {
    stopReplay();
    if (replayIndex < replayFrames.length - 1) replayIndex++;
    renderReplayFrame();
});
replayRestart.addEventListener('click', () => {
    stopReplay();
    replayIndex = 0;
    renderReplayFrame();
});
replayPlay.addEventListener('click', toggleReplay);
endViewReplayBtn.addEventListener('click', openReplayFromEndModal);
endPlayAgainBtn.addEventListener('click', playAgain);

difficultySelect.addEventListener('change', () => {
    aiDifficulty = difficultySelect.value;
    resetAI();
    updateHeatmapControls();
});

heatmapToggle.addEventListener('change', () => {
    showHeatmap = heatmapToggle.checked;
    updateHeatmapControls();
    updateGameGrids();
    if (showHeatmap && aiDifficulty === 'hard') {
        triggerSonar();
        playSound('sonar');
    }
});
muteToggle.addEventListener('change', () => setMuted(muteToggle.checked));

// Initialize
aiDifficulty = difficultySelect.value;
updateMapState(mapSelect.value);
muteToggle.checked = isMuted();
initializeGrids();
createGridUI(playerGridSetup, true, false);
updateCurrentShipDisplay();
updateHeatmapControls();
updateWelcomeView();
