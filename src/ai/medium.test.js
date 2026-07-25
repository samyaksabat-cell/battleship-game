import { describe, expect, it } from 'vitest';
import { createRng } from '../rng.js';
import { getAdjacentCells } from '../board.js';
import { createKnowledge, recordShot, isFired } from './knowledge.js';
import { chooseMove, createMediumAI, createMediumState, updateState, pruneState } from './medium.js';

function isAdjacent(cell, target) {
    return getAdjacentCells(target.row, target.col).some(
        (adj) => adj.row === cell.row && adj.col === cell.col
    );
}

describe('medium AI', () => {
    it('hunts randomly while nothing is wounded', () => {
        const state = createMediumState();
        expect(state.mode).toBe('hunt');
        const move = chooseMove(createKnowledge(), state, createRng(3));
        expect(move).not.toBeNull();
    });

    it('switches to target mode after a hit and probes adjacent cells', () => {
        const knowledge = createKnowledge();
        const state = createMediumState();
        const hit = { row: 4, col: 6, hit: true };

        recordShot(knowledge, hit);
        updateState(state, hit);
        pruneState(state, knowledge);

        expect(state.mode).toBe('target');

        for (let i = 0; i < 4; i++) {
            const move = chooseMove(knowledge, state, createRng(9));
            expect(isAdjacent(move, hit)).toBe(true);
            recordShot(knowledge, { row: move.row, col: move.col, hit: false });
            updateState(state, { row: move.row, col: move.col, hit: false });
            pruneState(state, knowledge);
        }

        // All four neighbours are exhausted, so the lead is dropped.
        expect(state.mode).toBe('hunt');
        expect(state.hits).toEqual([]);
    });

    it('returns to hunt mode once the wounded ship is sunk', () => {
        const knowledge = createKnowledge();
        const state = createMediumState();
        const shot = { row: 0, col: 0, hit: true, sunk: true };
        recordShot(knowledge, {
            ...shot,
            sunkShip: { size: 2, positions: [{ row: 0, col: 0 }, { row: 0, col: 1 }] }
        });
        updateState(state, shot);
        expect(state.mode).toBe('hunt');
        expect(state.hits).toEqual([]);
    });

    it('never fires at the same cell twice over a full board', () => {
        const knowledge = createKnowledge();
        const ai = createMediumAI(createRng(11));
        const seen = new Set();

        for (let i = 0; i < 100; i++) {
            const move = ai.nextMove(knowledge);
            const key = `${move.row},${move.col}`;
            expect(seen.has(key)).toBe(false);
            expect(isFired(knowledge, move.row, move.col)).toBe(false);
            seen.add(key);
            // Pretend every other shot is a hit so target mode is exercised.
            const result = { row: move.row, col: move.col, hit: i % 2 === 0 };
            recordShot(knowledge, result);
            ai.onShotResult(knowledge, result);
        }

        expect(seen.size).toBe(100);
    });
});
