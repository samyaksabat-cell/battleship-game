import { describe, expect, it } from 'vitest';
import { createRng } from '../rng.js';
import { getAdjacentCells } from '../board.js';
import { createKnowledge, recordShot, isFired } from './knowledge.js';
import { chooseMove, computeProbabilityMap, bestCells, createHardAI } from './hard.js';

describe('hard AI probability map', () => {
    it('produces a 10x10 grid of non-negative scores', () => {
        const map = computeProbabilityMap(createKnowledge());
        expect(map).toHaveLength(10);
        for (const row of map) {
            expect(row).toHaveLength(10);
            for (const score of row) {
                expect(Number.isFinite(score)).toBe(true);
                expect(score).toBeGreaterThanOrEqual(0);
            }
        }
    });

    it('scores central cells above corners on an empty board', () => {
        const map = computeProbabilityMap(createKnowledge());
        expect(map[4][4]).toBeGreaterThan(map[0][0]);
    });

    it('gives fired cells a score of zero', () => {
        const knowledge = createKnowledge();
        recordShot(knowledge, { row: 2, col: 3, hit: false });
        recordShot(knowledge, { row: 7, col: 7, hit: true });
        const map = computeProbabilityMap(knowledge);
        expect(map[2][3]).toBe(0);
        expect(map[7][7]).toBe(0);
    });

    it('zeroes cells that no remaining ship can occupy', () => {
        const knowledge = createKnowledge();
        // Box in (5,5) with misses so no ship placement can cover it.
        for (const cell of getAdjacentCells(5, 5)) {
            recordShot(knowledge, { row: cell.row, col: cell.col, hit: false });
        }
        const map = computeProbabilityMap(knowledge);
        expect(map[5][5]).toBe(0);
    });

    it('boosts cells adjacent to an unresolved hit', () => {
        const knowledge = createKnowledge();
        recordShot(knowledge, { row: 5, col: 5, hit: true });
        const map = computeProbabilityMap(knowledge);

        for (const cell of getAdjacentCells(5, 5)) {
            expect(map[cell.row][cell.col]).toBeGreaterThan(map[1][1]);
            expect(map[cell.row][cell.col]).toBeGreaterThan(map[5][8]);
        }
    });

    it('does not boost cells around a hit belonging to a sunk ship', () => {
        const knowledge = createKnowledge();
        const positions = [
            { row: 5, col: 5 },
            { row: 5, col: 6 }
        ];
        recordShot(knowledge, { row: 5, col: 5, hit: true });
        recordShot(knowledge, { row: 5, col: 6, hit: true, sunkShip: { size: 2, positions } });

        const map = computeProbabilityMap(knowledge);
        expect(knowledge.remainingShipSizes).toEqual([5, 4, 3, 3]);
        expect(map[5][4]).toBeLessThan(map[4][4]);
    });

    it('picks the highest scoring un-fired cell', () => {
        const knowledge = createKnowledge();
        recordShot(knowledge, { row: 3, col: 3, hit: true });
        const map = computeProbabilityMap(knowledge);
        const move = chooseMove(knowledge, createRng(5));
        expect(map[move.row][move.col]).toBe(bestCells(knowledge, map).score);
        expect(getAdjacentCells(3, 3).some((c) => c.row === move.row && c.col === move.col)).toBe(true);
    });

    it('does not score or choose blocked cells', () => {
        const blocked = Array.from({ length: 10 }, () => Array(10).fill(false));
        blocked[4][4] = true;
        const knowledge = createKnowledge(undefined, 10, blocked);
        const map = computeProbabilityMap(knowledge);
        expect(map[4][4]).toBe(0);
        expect(chooseMove(knowledge, createRng(4))).not.toEqual({ row: 4, col: 4 });
    });
});

describe('hard AI targeting', () => {
    it('never fires at the same cell twice', () => {
        const knowledge = createKnowledge();
        const ai = createHardAI(createRng(21));
        const seen = new Set();

        for (let i = 0; i < 100; i++) {
            const move = ai.nextMove(knowledge);
            const key = `${move.row},${move.col}`;
            expect(seen.has(key)).toBe(false);
            expect(isFired(knowledge, move.row, move.col)).toBe(false);
            seen.add(key);
            recordShot(knowledge, { row: move.row, col: move.col, hit: i % 3 === 0 });
        }

        expect(seen.size).toBe(100);
    });

    it('exposes the probability map through the AI wrapper', () => {
        const ai = createHardAI(createRng(1));
        const map = ai.probabilityMap(createKnowledge());
        expect(map[0]).toHaveLength(10);
    });
});
