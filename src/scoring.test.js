import { describe, expect, it } from 'vitest';
import {
    BASE_POINTS, STORAGE_KEY, createStats, loadStats, recordGame,
    saveStats, streakMultiplier
} from './scoring.js';

function fakeStorage() {
    return {
        store: {},
        getItem(key) { return this.store[key] ?? null; },
        setItem(key, value) { this.store[key] = value; }
    };
}

describe('scoring', () => {
    it('defines base points for every difficulty', () => {
        expect(BASE_POINTS).toEqual({ easy: 2, medium: 5, hard: 10 });
    });

    it('progresses and caps streak multipliers', () => {
        expect(streakMultiplier(0)).toBe(1);
        expect([1, 1.5, 2, 2.5, 3, 3]).toEqual([1, 2, 3, 4, 5, 6].map(streakMultiplier));
    });

    it('rounds points and tracks wins, streaks, and best streak', () => {
        let stats = createStats();
        let result = recordGame(stats, { difficulty: 'easy', won: true });
        expect(result.pointsEarned).toBe(2);
        stats = result.stats;
        result = recordGame(stats, { difficulty: 'hard', won: true });
        expect(result.pointsEarned).toBe(15);
        expect(result.stats.currentStreak).toBe(2);
        expect(result.stats.bestStreak).toBe(2);
        expect(recordGame(result.stats, { difficulty: 'easy', won: true }).pointsEarned).toBe(4);
    });

    it('returns unrounded raw points alongside rounded points', () => {
        const result = recordGame(createStats(), { difficulty: 'hard', won: true });
        expect(result.rawPoints).toBe(10);
        expect(result.pointsEarned).toBe(Math.round(result.rawPoints));
    });

    it('resets current streak on loss while preserving best streak', () => {
        let stats = createStats();
        stats = recordGame(stats, { difficulty: 'medium', won: true }).stats;
        stats = recordGame(stats, { difficulty: 'medium', won: true }).stats;
        const result = recordGame(stats, { difficulty: 'medium', won: false });
        expect(result.pointsEarned).toBe(0);
        expect(result.multiplier).toBe(1);
        expect(result.basePoints).toBe(5);
        expect(result.stats.currentStreak).toBe(0);
        expect(result.stats.bestStreak).toBe(2);
    });

    it('does not mutate input and tracks per-difficulty tallies', () => {
        const stats = createStats();
        const result = recordGame(stats, { difficulty: 'hard', won: false });
        expect(stats).toEqual(createStats());
        expect(result.stats.byDifficulty.hard.losses).toBe(1);
        expect(result.stats.byDifficulty.easy).toEqual({ wins: 0, losses: 0 });
    });

    it('loads fresh defaults for empty or corrupt storage', () => {
        const storage = fakeStorage();
        expect(loadStats(storage)).toEqual(createStats());
        storage.store[STORAGE_KEY] = '{bad json';
        expect(loadStats(storage)).toEqual(createStats());
        storage.store[STORAGE_KEY] = JSON.stringify({ wins: 2, byDifficulty: { hard: { wins: 2 } } });
        expect(loadStats(storage).wins).toBe(2);
        expect(loadStats(storage).byDifficulty.medium).toEqual({ wins: 0, losses: 0 });
    });

    it('saves and loads a round trip', () => {
        const storage = fakeStorage();
        const stats = recordGame(createStats(), { difficulty: 'hard', won: true }).stats;
        expect(saveStats(storage, stats)).toBe(true);
        expect(loadStats(storage)).toEqual(stats);
    });
});
