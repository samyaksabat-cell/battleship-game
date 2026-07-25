import { describe, expect, it } from 'vitest';
import { GRID_SIZE, SHIPS } from './constants.js';
import { canPlaceShip, createGrid, createRandomFleet, getAdjacentCells, placeShip } from './board.js';
import { createRng } from './rng.js';

describe('board helpers', () => {
    it('creates an empty square grid', () => {
        const grid = createGrid();
        expect(grid).toHaveLength(GRID_SIZE);
        expect(grid.every((row) => row.length === GRID_SIZE && row.every((cell) => cell === null))).toBe(true);
    });

    it('validates placements against the board edges and other ships', () => {
        const grid = createGrid();
        expect(canPlaceShip(grid, 0, 0, 5, true)).toBe(true);
        expect(canPlaceShip(grid, 0, 8, 5, true)).toBe(false);
        expect(canPlaceShip(grid, 8, 0, 5, false)).toBe(false);

        placeShip(grid, 0, 0, 3, true, 'Cruiser');
        expect(canPlaceShip(grid, 0, 2, 2, true)).toBe(false);
        expect(canPlaceShip(grid, 0, 3, 2, true)).toBe(true);
    });

    it('places ships horizontally and vertically', () => {
        const grid = createGrid();
        expect(placeShip(grid, 0, 0, 3, true, 'Cruiser')).toEqual([
            { row: 0, col: 0 },
            { row: 0, col: 1 },
            { row: 0, col: 2 }
        ]);
        expect(placeShip(grid, 4, 4, 2, false, 'Destroyer')).toEqual([
            { row: 4, col: 4 },
            { row: 5, col: 4 }
        ]);
        expect(grid[5][4]).toBe('Destroyer');
    });

    it('returns orthogonal neighbours, clipped at the edges', () => {
        expect(getAdjacentCells(5, 5)).toHaveLength(4);
        expect(getAdjacentCells(0, 0)).toEqual([
            { row: 1, col: 0 },
            { row: 0, col: 1 }
        ]);
    });

    it('places a full fleet without overlaps and deterministically for a seed', () => {
        const fleet = createRandomFleet(createRng(99));
        expect(fleet.ships).toHaveLength(SHIPS.length);

        const occupied = new Set();
        for (const ship of fleet.ships) {
            expect(ship.positions).toHaveLength(ship.size);
            for (const pos of ship.positions) {
                const key = `${pos.row},${pos.col}`;
                expect(occupied.has(key)).toBe(false);
                occupied.add(key);
                expect(fleet.grid[pos.row][pos.col]).toBe(ship.name);
            }
        }

        const again = createRandomFleet(createRng(99));
        expect(again.ships).toEqual(fleet.ships);
    });

    it('keeps blocked cells clear while placing around them', () => {
        const blocked = [{ row: 0, col: 0 }, { row: 9, col: 9 }];
        const fleet = createRandomFleet(createRng(12), SHIPS, GRID_SIZE, blocked);
        expect(fleet.grid[0][0]).toBeNull();
        expect(fleet.grid[9][9]).toBeNull();
        expect(fleet.ships.flatMap((ship) => ship.positions).some((cell) =>
            blocked.some((island) => island.row === cell.row && island.col === cell.col)
        )).toBe(false);
    });
});
