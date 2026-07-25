import { describe, expect, it } from 'vitest';
import { dailyChallenge, dailySeed } from './daily.js';
import { getMap } from './maps.js';

describe('daily challenge', () => {
    it('is deterministic for a date', () => {
        const first = dailyChallenge('2026-07-25');
        const second = dailyChallenge('2026-07-25');
        expect(first).toEqual(second);
        expect(first.seed).toBe(dailySeed('2026-07-25'));
    });

    it('generally changes for a different date', () => {
        expect(dailyChallenge('2026-07-25')).not.toEqual(dailyChallenge('2026-07-26'));
    });

    it('keeps an archipelago challenge fleet off the islands', () => {
        let challenge;
        for (let day = 1; day <= 31; day++) {
            const date = `2026-07-${String(day).padStart(2, '0')}`;
            const candidate = dailyChallenge(date);
            if (candidate.mapId === 'archipelago') {
                challenge = candidate;
                break;
            }
        }
        expect(challenge).toBeDefined();
        const islands = getMap('archipelago').islands;
        const occupied = challenge.fleet.ships.flatMap((ship) => ship.positions);
        expect(occupied.some((cell) => islands.some((island) =>
            island.row === cell.row && island.col === cell.col
        ))).toBe(false);
    });
});
