import { GRID_SIZE, SHIPS } from './constants.js';
import { randomInt } from './rng.js';

export function createGrid(size = GRID_SIZE, fill = null) {
    return Array(size)
        .fill(null)
        .map(() => Array(size).fill(fill));
}

export function canPlaceShip(grid, row, col, size, horizontal) {
    const gridSize = grid.length;
    if (row < 0 || col < 0) return false;
    if (horizontal) {
        if (col + size > gridSize) return false;
        for (let i = 0; i < size; i++) {
            if (grid[row][col + i] !== null) return false;
        }
    } else {
        if (row + size > gridSize) return false;
        for (let i = 0; i < size; i++) {
            if (grid[row + i][col] !== null) return false;
        }
    }
    return true;
}

export function placeShip(grid, row, col, size, horizontal, shipName) {
    const positions = [];
    for (let i = 0; i < size; i++) {
        const r = horizontal ? row : row + i;
        const c = horizontal ? col + i : col;
        grid[r][c] = shipName;
        positions.push({ row: r, col: c });
    }
    return positions;
}

export function getAdjacentCells(row, col, gridSize = GRID_SIZE) {
    const adjacent = [];
    if (row > 0) adjacent.push({ row: row - 1, col });
    if (row < gridSize - 1) adjacent.push({ row: row + 1, col });
    if (col > 0) adjacent.push({ row, col: col - 1 });
    if (col < gridSize - 1) adjacent.push({ row, col: col + 1 });
    return adjacent;
}

// Places the whole fleet at random on a fresh grid. `rng` makes it deterministic.
export function createRandomFleet(rng = Math.random, ships = SHIPS, size = GRID_SIZE) {
    const grid = createGrid(size);
    const placed = ships.map((ship) => {
        for (;;) {
            const row = randomInt(rng, size);
            const col = randomInt(rng, size);
            const horizontal = rng() < 0.5;
            if (canPlaceShip(grid, row, col, ship.size, horizontal)) {
                const positions = placeShip(grid, row, col, ship.size, horizontal, ship.name);
                return { name: ship.name, size: ship.size, positions, hits: 0 };
            }
        }
    });
    return { grid, ships: placed };
}
