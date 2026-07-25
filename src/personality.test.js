import { describe, expect, it } from 'vitest';
import {
    AI_LOSS_LINES, AI_WIN_LINES, WILDCARD_LINES,
    outcomeBucket, personalityLine, resetPersonalityHistory
} from './personality.js';

const fixed = (value) => () => value;

describe('personality lines', () => {
    it('classifies victory and defeat boundaries', () => {
        expect(outcomeBucket({ won: true, playerShipsLeft: 4, aiShipsLeft: 0 })).toBe('blowout');
        expect(outcomeBucket({ won: true, playerShipsLeft: 3, aiShipsLeft: 0 })).toBe('close');
        expect(outcomeBucket({ won: false, playerShipsLeft: 0, aiShipsLeft: 3, aiWasBehind: true }))
            .toBe('comeback');
        expect(outcomeBucket({ won: false, playerShipsLeft: 0, aiShipsLeft: 4, aiWasBehind: false }))
            .toBe('blowout');
        expect(outcomeBucket({ won: false, playerShipsLeft: 0, aiShipsLeft: 3, aiWasBehind: false }))
            .toBe('close');
    });

    it('selects exact tiered contextual lines without wildcards', () => {
        expect(personalityLine(
            { won: true, playerShipsLeft: 4, aiShipsLeft: 0, difficulty: 'hard' },
            { wildcardChance: 0, remember: false, recent: [], rng: fixed(0) }
        )).toBe(AI_LOSS_LINES.blowout.hard);
        expect(personalityLine(
            { won: false, playerShipsLeft: 0, aiShipsLeft: 2, aiWasBehind: true, difficulty: 'medium' },
            { wildcardChance: 0, remember: false, recent: [], rng: fixed(0) }
        )).toBe(AI_WIN_LINES.comeback.medium);
        expect(personalityLine(
            { won: false, playerShipsLeft: 0, aiShipsLeft: 5, difficulty: 'easy' },
            { wildcardChance: 0, remember: false, recent: [], rng: fixed(0) }
        )).toBe(AI_WIN_LINES.blowout.easy);
    });

    it('can select a wildcard line', () => {
        const line = personalityLine(
            { won: true, playerShipsLeft: 1, aiShipsLeft: 0, difficulty: 'easy' },
            { wildcardChance: 1, remember: false, recent: [], rng: fixed(0) }
        );
        expect(WILDCARD_LINES).toContain(line);
    });

    it('avoids a recent line when another candidate is available', () => {
        const line = personalityLine(
            { won: true, playerShipsLeft: 1, aiShipsLeft: 0, difficulty: 'easy' },
            {
                wildcardChance: 1,
                remember: false,
                recent: [WILDCARD_LINES[0]],
                rng: fixed(0)
            }
        );
        expect(line).not.toBe(WILDCARD_LINES[0]);
    });

    it('returns a non-empty line for every outcome and tier', () => {
        ['easy', 'medium', 'hard'].forEach((difficulty) => {
            [
                { won: true, playerShipsLeft: 4, aiShipsLeft: 0 },
                { won: true, playerShipsLeft: 1, aiShipsLeft: 0 },
                { won: false, playerShipsLeft: 0, aiShipsLeft: 5 },
                { won: false, playerShipsLeft: 0, aiShipsLeft: 2, aiWasBehind: true },
                { won: false, playerShipsLeft: 0, aiShipsLeft: 2 }
            ].forEach((context) => {
                expect(personalityLine(
                    { ...context, difficulty },
                    { wildcardChance: 0, remember: false, recent: [], rng: fixed(0) }
                )).toEqual(expect.any(String));
            });
        });
    });

    it('resets remembered history', () => {
        resetPersonalityHistory();
        personalityLine(
            { won: true, playerShipsLeft: 4, aiShipsLeft: 0, difficulty: 'easy' },
            { wildcardChance: 0, rng: fixed(0) }
        );
        resetPersonalityHistory();
        expect(personalityLine(
            { won: true, playerShipsLeft: 4, aiShipsLeft: 0, difficulty: 'easy' },
            { wildcardChance: 0, rng: fixed(0) }
        )).toBe(AI_LOSS_LINES.blowout.easy);
    });
});
