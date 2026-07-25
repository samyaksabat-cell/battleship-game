export const BASE_POINTS = { easy: 2, medium: 5, hard: 10 };
export const MAX_MULTIPLIER = 3;
export const STORAGE_KEY = 'battleship-stats-v1';

export function streakMultiplier(streak) {
    if (streak <= 0) return 1;
    return Math.min(1 + 0.5 * (streak - 1), MAX_MULTIPLIER);
}

export function createStats() {
    return {
        totalPoints: 0,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        currentStreak: 0,
        bestStreak: 0,
        byDifficulty: {
            easy: { wins: 0, losses: 0 },
            medium: { wins: 0, losses: 0 },
            hard: { wins: 0, losses: 0 }
        }
    };
}

export function recordGame(stats, { difficulty, won }) {
    const newStats = {
        ...stats,
        byDifficulty: Object.fromEntries(
            Object.entries(stats.byDifficulty).map(([key, value]) => [key, { ...value }])
        )
    };
    const basePoints = BASE_POINTS[difficulty] ?? 0;
    let multiplier = 1;
    let rawPoints = 0;
    let pointsEarned = 0;

    newStats.gamesPlayed++;
    if (!newStats.byDifficulty[difficulty]) {
        newStats.byDifficulty[difficulty] = { wins: 0, losses: 0 };
    }
    if (won) {
        newStats.wins++;
        newStats.byDifficulty[difficulty].wins++;
        newStats.currentStreak = stats.currentStreak + 1;
        newStats.bestStreak = Math.max(stats.bestStreak, newStats.currentStreak);
        multiplier = streakMultiplier(newStats.currentStreak);
        rawPoints = basePoints * multiplier;
        pointsEarned = Math.round(rawPoints);
        newStats.totalPoints += pointsEarned;
    } else {
        newStats.losses++;
        newStats.byDifficulty[difficulty].losses++;
        newStats.currentStreak = 0;
    }

    return { stats: newStats, pointsEarned, rawPoints, multiplier, basePoints };
}

function isValidStats(value) {
    return value && typeof value === 'object' && !Array.isArray(value);
}

export function loadStats(storage = globalThis.localStorage) {
    const defaults = createStats();
    try {
        const parsed = JSON.parse(storage?.getItem(STORAGE_KEY) ?? 'null');
        if (!isValidStats(parsed)) return defaults;
        const numbers = ['totalPoints', 'gamesPlayed', 'wins', 'losses', 'currentStreak', 'bestStreak'];
        return {
            ...defaults,
            ...Object.fromEntries(numbers.map((key) => [
                key,
                typeof parsed[key] === 'number' && Number.isFinite(parsed[key]) ? parsed[key] : defaults[key]
            ])),
            byDifficulty: Object.fromEntries(
                Object.keys(defaults.byDifficulty).map((difficulty) => [
                    difficulty,
                    {
                        wins: typeof parsed.byDifficulty?.[difficulty]?.wins === 'number'
                            ? parsed.byDifficulty[difficulty].wins : 0,
                        losses: typeof parsed.byDifficulty?.[difficulty]?.losses === 'number'
                            ? parsed.byDifficulty[difficulty].losses : 0
                    }
                ])
            )
        };
    } catch {
        return defaults;
    }
}

export function saveStats(storage = globalThis.localStorage, stats) {
    try {
        storage?.setItem(STORAGE_KEY, JSON.stringify(stats));
        return true;
    } catch {
        return false;
    }
}
