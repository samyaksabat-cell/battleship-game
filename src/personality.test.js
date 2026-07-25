import { describe, expect, it } from 'vitest';
import { outcomeBucket, personalityLine } from './personality.js';
import { createRng } from './rng.js';

describe('personality lines', () => {
    it('selects blowout, close, and normal buckets at their boundaries', () => {
        expect(outcomeBucket({ won: true, playerShipsLeft: 4, aiShipsLeft: 0 })).toBe('blowout');
        expect(outcomeBucket({ won: true, playerShipsLeft: 3, aiShipsLeft: 0 })).toBe('normal');
        expect(outcomeBucket({ won: true, playerShipsLeft: 1, aiShipsLeft: 2 })).toBe('close');
        expect(outcomeBucket({ won: false, playerShipsLeft: 0, aiShipsLeft: 4 })).toBe('blowout');
        expect(outcomeBucket({ won: false, playerShipsLeft: 0, aiShipsLeft: 3 })).toBe('normal');
        expect(outcomeBucket({ won: false, playerShipsLeft: 2, aiShipsLeft: 1 })).toBe('close');
    });

    it('selects a deterministic line with a supplied rng', () => {
        const context = { won: true, playerShipsLeft: 4, aiShipsLeft: 0 };
        expect(personalityLine(context, createRng(42))).toBe(personalityLine(context, createRng(42)));
        expect(personalityLine(context, () => 0.999999)).not.toBe(personalityLine(context, () => 0));
    });

    it('returns a non-empty string for every outcome bucket', () => {
        const contexts = [
            { won: true, playerShipsLeft: 4, aiShipsLeft: 0 },
            { won: true, playerShipsLeft: 1, aiShipsLeft: 2 },
            { won: true, playerShipsLeft: 3, aiShipsLeft: 1 },
            { won: false, playerShipsLeft: 0, aiShipsLeft: 4 },
            { won: false, playerShipsLeft: 2, aiShipsLeft: 1 },
            { won: false, playerShipsLeft: 1, aiShipsLeft: 3 }
        ];
        contexts.forEach((context) => {
            expect(personalityLine(context, () => 0)).toEqual(expect.any(String));
            expect(personalityLine(context, () => 0).length).toBeGreaterThan(0);
        });
    });
});
