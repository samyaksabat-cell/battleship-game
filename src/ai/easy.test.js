import { describe, expect, it } from 'vitest';
import { createRng } from '../rng.js';
import { createKnowledge, recordShot, isFired } from './knowledge.js';
import { chooseMove, createEasyAI } from './easy.js';

describe('easy AI', () => {
    it('returns a cell inside the grid', () => {
        const knowledge = createKnowledge();
        const move = chooseMove(knowledge, createRng(42));
        expect(move.row).toBeGreaterThanOrEqual(0);
        expect(move.row).toBeLessThan(knowledge.size);
        expect(move.col).toBeGreaterThanOrEqual(0);
        expect(move.col).toBeLessThan(knowledge.size);
    });

    it('never fires at the same cell twice', () => {
        const knowledge = createKnowledge();
        const ai = createEasyAI(createRng(7));
        const seen = new Set();

        for (let i = 0; i < 100; i++) {
            const move = ai.nextMove(knowledge);
            const key = `${move.row},${move.col}`;
            expect(seen.has(key)).toBe(false);
            expect(isFired(knowledge, move.row, move.col)).toBe(false);
            seen.add(key);
            recordShot(knowledge, { row: move.row, col: move.col, hit: false });
        }

        expect(seen.size).toBe(100);
    });

    it('returns null once the whole board has been fired at', () => {
        const knowledge = createKnowledge();
        for (let row = 0; row < knowledge.size; row++) {
            for (let col = 0; col < knowledge.size; col++) {
                recordShot(knowledge, { row, col, hit: false });
            }
        }
        expect(chooseMove(knowledge, createRng(1))).toBeNull();
    });

    it('is deterministic for a given seed', () => {
        const first = chooseMove(createKnowledge(), createRng(123));
        const second = chooseMove(createKnowledge(), createRng(123));
        expect(first).toEqual(second);
    });

    it('never chooses a blocked cell', () => {
        const blocked = Array.from({ length: 10 }, () => Array(10).fill(true));
        blocked[4][7] = false;
        const knowledge = createKnowledge(undefined, 10, blocked);
        expect(chooseMove(knowledge, createRng(123))).toEqual({ row: 4, col: 7 });
    });
});
