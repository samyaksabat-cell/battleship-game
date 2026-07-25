import { describe, expect, it } from 'vitest';
import { createRng } from './rng.js';
import { playGame, runSimulations } from './simulation.js';

const GAMES = 200;
const SEED = 20240607;
// Average-shot gap required between neighbouring tiers. The observed gaps are
// far larger than this, so the ordering assertion is not sensitive to noise.
const MARGIN = 3;

describe('simulation harness', () => {
    it('plays a game to completion and is deterministic for a seed', () => {
        const first = playGame({ difficulty: 'hard', rng: createRng(5), fleetRng: createRng(6) });
        const second = playGame({ difficulty: 'hard', rng: createRng(5), fleetRng: createRng(6) });

        expect(first.won).toBe(true);
        expect(first.shots).toBeGreaterThanOrEqual(17);
        expect(first.shots).toBeLessThanOrEqual(100);
        expect(second.shots).toBe(first.shots);
    });
});

describe(`difficulty ordering over ${GAMES} games per tier`, () => {
    it('hard needs fewer shots than medium, medium fewer than easy', { timeout: 120000 }, () => {
        const easy = runSimulations({ difficulty: 'easy', games: GAMES, seed: SEED });
        const medium = runSimulations({ difficulty: 'medium', games: GAMES, seed: SEED });
        const hard = runSimulations({ difficulty: 'hard', games: GAMES, seed: SEED });

        for (const run of [easy, medium, hard]) {
            expect(run.wins).toBe(GAMES);
        }

        expect(hard.averageShots + MARGIN).toBeLessThan(medium.averageShots);
        expect(medium.averageShots + MARGIN).toBeLessThan(easy.averageShots);
    });
});
