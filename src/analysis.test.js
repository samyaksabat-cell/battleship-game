import { describe, expect, it } from 'vitest';
import { analyzeShots, formatCell } from './analysis.js';
import { createKnowledge } from './ai/knowledge.js';
import { createGrid } from './board.js';

// A stub engine keeps the arithmetic of the scoring readable: every cell scores
// 10 except (0, 0) which scores 4 and (9, 9) which scores 0.
function stubMap() {
    const map = createGrid(10, 10);
    map[0][0] = 4;
    map[9][9] = 0;
    return map;
}

describe('post-game analysis', () => {
    it('reports 100% efficiency when every shot was an optimal cell', () => {
        const shots = [
            { row: 5, col: 5, hit: true },
            { row: 3, col: 2, hit: false }
        ];
        const { efficiency, worstTurns } = analyzeShots(shots, { probabilityMapFn: stubMap });

        expect(efficiency).toBe(100);
        expect(worstTurns).toEqual([]);
    });

    it('computes efficiency as the average ratio of chosen to optimal score', () => {
        const shots = [
            { row: 5, col: 5, hit: false }, // 10 / 10
            { row: 0, col: 0, hit: false }, // 4 / 10
            { row: 9, col: 9, hit: false } // 0 / 10
        ];
        const { turns, efficiency } = analyzeShots(shots, { probabilityMapFn: stubMap });

        expect(turns.map((turn) => turn.playerScore)).toEqual([10, 4, 0]);
        expect(turns.every((turn) => turn.bestScore === 10)).toBe(true);
        expect(efficiency).toBeCloseTo(((1 + 0.4 + 0) / 3) * 100, 10);
    });

    it('identifies the three turns with the largest gap to the optimal cell', () => {
        const scores = [10, 1, 10, 3, 10, 0, 6];
        const shots = scores.map((_, index) => ({ row: index, col: 0, hit: false }));
        const mapFn = () => {
            const map = createGrid(10, 0);
            scores.forEach((score, index) => {
                map[index][0] = score;
            });
            map[0][5] = 10; // always available as an optimal alternative
            return map;
        };

        const { worstTurns } = analyzeShots(shots, { probabilityMapFn: mapFn });

        expect(worstTurns).toHaveLength(3);
        expect(worstTurns.map((turn) => turn.turn)).toEqual([6, 2, 4]);
        expect(worstTurns.map((turn) => turn.gap)).toEqual([10, 9, 7]);
        expect(worstTurns[0].bestCell).toEqual({ row: 0, col: 5 });
    });

    it('grades a real shot history with the hard probability engine', () => {
        const shots = [
            { row: 0, col: 0, hit: false },
            { row: 4, col: 4, hit: true },
            { row: 9, col: 0, hit: false } // ignores the wounded ship next door
        ];
        const { turns, efficiency, worstTurns } = analyzeShots(shots);

        expect(turns).toHaveLength(3);
        expect(efficiency).toBeGreaterThan(0);
        expect(efficiency).toBeLessThan(100);
        // Turn 3 walks away from an unresolved hit, so it is the worst call.
        expect(worstTurns[0].turn).toBe(3);
        expect(worstTurns[0].bestCell).not.toBeNull();
    });

    it('scores an already-fired cell as zero value', () => {
        const shots = [
            { row: 1, col: 1, hit: false },
            { row: 1, col: 1, hit: false }
        ];
        const { turns } = analyzeShots(shots, { probabilityMapFn: stubMap });
        expect(turns[1].playerScore).toBe(0);
    });

    it('formats cells as battleship coordinates', () => {
        expect(formatCell({ row: 0, col: 0 })).toBe('A1');
        expect(formatCell({ row: 9, col: 9 })).toBe('J10');
    });

    it('starts from a fresh knowledge state', () => {
        const knowledge = createKnowledge();
        expect(knowledge.remainingShipSizes).toEqual([5, 4, 3, 3, 2]);
    });
});
