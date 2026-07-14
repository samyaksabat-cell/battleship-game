// Game Configuration
const GRID_SIZE = 10;
const SHIPS = [
    { name: 'Carrier', size: 5 },
    { name: 'Battleship', size: 4 },
    { name: 'Cruiser', size: 3 },
    { name: 'Submarine', size: 3 },
    { name: 'Destroyer', size: 2 }
];

// Game State
let playerGrid = [];
let aiGrid = [];
let playerShips = [];
let aiShips = [];
let currentPlayerShipIndex = 0;
let isPlayerTurn = true;
let gameOver = false;

// AI Targeting State
let aiMode = 'hunt'; // 'hunt' or 'target'
let aiHits = []; // Stack of hit positions to target
let aiHuntedPositions = new Set(); // Positions already fired upon in hunt mode

// DOM Elements
const setupScreen = document.getElementById('setup-screen');
const gameScreen = document.getElementById('game-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const playerGridSetup = document.getElementById('player-grid');
const playerGridGame = document.getElementById('player-grid-game');
const aiGridElement = document.getElementById('ai-grid');
const randomizeBtn = document.getElementById('randomize-btn');
const startGameBtn = document.getElementById('start-game-btn');
const currentShipDisplay = document.getElementById('current-ship');
const turnIndicator = document.getElementById('turn-indicator');
const playerShipsLeft = document.getElementById('player-ships-left');
const aiShipsLeft = document.getElementById('ai-ships-left');
const gameOverTitle = document.getElementById('game-over-title');
const gameOverMessage = document.getElementById('game-over-message');
const playAgainBtn = document.getElementById('play-again-btn');

// Initialize grids
function initializeGrids() {
    playerGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    aiGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    playerShips = [];
    aiShips = [];
    currentPlayerShipIndex = 0;
    isPlayerTurn = true;
    gameOver = false;
    
    // Reset AI targeting state
    aiMode = 'hunt';
    aiHits = [];
    aiHuntedPositions = new Set();
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

// Ship placement helper functions
function canPlaceShip(grid, row, col, size, horizontal) {
    if (horizontal) {
        if (col + size > GRID_SIZE) return false;
        for (let i = 0; i < size; i++) {
            if (grid[row][col + i] !== null) return false;
        }
    } else {
        if (row + size > GRID_SIZE) return false;
        for (let i = 0; i < size; i++) {
            if (grid[row + i][col] !== null) return false;
        }
    }
    return true;
}

function placeShip(grid, row, col, size, horizontal, shipName) {
    const positions = [];
    if (horizontal) {
        for (let i = 0; i < size; i++) {
            grid[row][col + i] = shipName;
            positions.push({ row, col: col + i });
        }
    } else {
        for (let i = 0; i < size; i++) {
            grid[row + i][col] = shipName;
            positions.push({ row: row + i, col });
        }
    }
    return positions;
}

let isHorizontal = true;

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

function handleSetupRightClick(row, col) {
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
    
    // Place player ships randomly
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
    
    updateGameGrids();
    updateScore();
}

// Update game grids display
function updateGameGrids() {
    // Update player grid
    const playerCells = playerGridGame.querySelectorAll('.cell');
    playerCells.forEach(cell => {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        cell.className = 'cell';
        cell.textContent = '';
        
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
    });
    
    // Update AI grid (hide ships, show hits/misses)
    const aiCells = aiGridElement.querySelectorAll('.cell');
    aiCells.forEach(cell => {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        cell.className = 'cell';
        cell.textContent = '';
        
        // Check if this position was fired upon
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
}

// Player attack
function handlePlayerAttack(row, col) {
    if (!isPlayerTurn || gameOver) return;
    
    const cellData = aiGrid[row][col];
    
    // Check if already fired upon
    if (typeof cellData === 'object' && cellData !== null) return;
    
    let hit = false;
    if (typeof cellData === 'string') {
        // It's a ship
        hit = true;
        aiGrid[row][col] = { hit: true, ship: cellData };
        
        // Update ship hits
        const ship = aiShips.find(s => s.name === cellData);
        if (ship) {
            ship.hits++;
            if (ship.hits === ship.positions.length) {
                // Ship sunk
                ship.positions.forEach(pos => {
                    const cell = aiGridElement.querySelector(`[data-row="${pos.row}"][data-col="${pos.col}"]`);
                    if (cell) cell.classList.add('sunk');
                });
            }
        }
    } else {
        // Miss
        aiGrid[row][col] = { miss: true };
    }
    
    updateGameGrids();
    updateScore();
    
    if (checkGameOver()) return;
    
    isPlayerTurn = false;
    turnIndicator.textContent = "AI's Turn";
    turnIndicator.style.color = '#ff6b6b';
    
    setTimeout(aiTurn, 1000);
}

// AI Turn with hunting and targeting strategy
function aiTurn() {
    if (gameOver) return;
    
    let row, col;
    let hit = false;
    
    if (aiMode === 'target' && aiHits.length > 0) {
        // Target mode: fire adjacent to known hits
        const lastHit = aiHits[aiHits.length - 1];
        const adjacent = getAdjacentCells(lastHit.row, lastHit.col);
        
        // Find an untried adjacent cell
        for (const adj of adjacent) {
            const key = `${adj.row},${adj.col}`;
            if (!aiHuntedPositions.has(key)) {
                row = adj.row;
                col = adj.col;
                break;
            }
        }
        
        // If no valid adjacent cells, switch to hunt mode
        if (row === undefined) {
            aiMode = 'hunt';
            aiHits = [];
            aiTurn();
            return;
        }
    } else {
        // Hunt mode: random firing
        let attempts = 0;
        do {
            row = Math.floor(Math.random() * GRID_SIZE);
            col = Math.floor(Math.random() * GRID_SIZE);
            attempts++;
        } while (aiHuntedPositions.has(`${row},${col}`) && attempts < 100);
        
        if (attempts >= 100) {
            // All positions tried, shouldn't happen
            return;
        }
    }
    
    const key = `${row},${col}`;
    aiHuntedPositions.add(key);
    
    const cellData = playerGrid[row][col];
    
    if (typeof cellData === 'string') {
        // Hit
        hit = true;
        playerGrid[row][col] = { hit: true, ship: cellData };
        aiHits.push({ row, col });
        aiMode = 'target';
        
        // Update ship hits
        const ship = playerShips.find(s => s.name === cellData);
        if (ship) {
            ship.hits++;
            if (ship.hits === ship.positions.length) {
                // Ship sunk - clear hits stack and switch to hunt mode
                aiHits = [];
                aiMode = 'hunt';
            }
        }
    } else {
        // Miss
        playerGrid[row][col] = { miss: true };
        
        // If in target mode and this was a miss, try removing the last hit
        if (aiMode === 'target' && aiHits.length > 0) {
            // Check if we've tried all adjacent cells
            const lastHit = aiHits[aiHits.length - 1];
            const adjacent = getAdjacentCells(lastHit.row, lastHit.col);
            const allTried = adjacent.every(adj => aiHuntedPositions.has(`${adj.row},${adj.col}`));
            
            if (allTried) {
                aiHits.pop();
                if (aiHits.length === 0) {
                    aiMode = 'hunt';
                }
            }
        }
    }
    
    updateGameGrids();
    updateScore();
    
    if (checkGameOver()) return;
    
    isPlayerTurn = true;
    turnIndicator.textContent = "Your Turn";
    turnIndicator.style.color = '#00d4ff';
}

function getAdjacentCells(row, col) {
    const adjacent = [];
    if (row > 0) adjacent.push({ row: row - 1, col });
    if (row < GRID_SIZE - 1) adjacent.push({ row: row + 1, col });
    if (col > 0) adjacent.push({ row, col: col - 1 });
    if (col < GRID_SIZE - 1) adjacent.push({ row, col: col + 1 });
    return adjacent;
}

// Update score display
function updateScore() {
    const playerAlive = playerShips.filter(s => s.hits < s.positions.length).length;
    const aiAlive = aiShips.filter(s => s.hits < s.positions.length).length;
    
    playerShipsLeft.textContent = playerAlive;
    aiShipsLeft.textContent = aiAlive;
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
    startGameBtn.disabled = true;
}

// Event listeners
randomizeBtn.addEventListener('click', randomizePlacement);
startGameBtn.addEventListener('click', startGame);
playAgainBtn.addEventListener('click', playAgain);

// Initialize
initializeGrids();
createGridUI(playerGridSetup, true, false);
updateCurrentShipDisplay();