import { describe, expect, it } from 'vitest';
import { SHIPS } from './constants.js';
import { createRandomFleet } from './board.js';
import { createRng } from './rng.js';
import { getMap, islandCells, MAPS } from './maps.js';

describe('maps', () => {
    it('defines classic, archipelago, and fog maps', () => {
        expect(Object.keys(MAPS)).toEqual(['classic', 'archipelago', 'fog']);
        expect(getMap('classic').hasFog).toBe(false);
        expect(getMap('fog').hasFog).toBe(true);
    });

    it('keeps archipelago islands distinct and leaves room for the fleet', () => {
        const islands = islandCells();
        expect(islands.every(({ row, col }) => row >= 0 && row < 10 && col >= 0 && col < 10)).toBe(true);
        expect(new Set(islands.map(({ row, col }) => `${row},${col}`)).size).toBe(islands.length);
        const fleet = createRandomFleet(createRng(42), SHIPS, 10, islands);
        const occupied = fleet.ships.flatMap((ship) => ship.positions);
        expect(occupied.some((cell) => islands.some((island) =>
            island.row === cell.row && island.col === cell.col
        ))).toBe(false);
    });

    it('generates deterministic fog that changes by turn', () => {
        expect(getMap('fog').fogCells(3)).toEqual(getMap('fog').fogCells(3));
        expect(getMap('fog').fogCells(3)).not.toEqual(getMap('fog').fogCells(4));
        expect(getMap('fog').fogCells(3).every(({ row, col }) =>
            row >= 0 && row < 10 && col >= 0 && col < 10
        )).toBe(true);
    });
});
