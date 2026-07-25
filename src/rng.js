// Deterministic pseudo-random number generator (mulberry32).
// Returns a function producing floats in [0, 1).
export function createRng(seed = 1) {
    let state = seed >>> 0;
    return function rng() {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function randomInt(rng, max) {
    return Math.floor(rng() * max);
}

export function pickRandom(rng, items) {
    if (items.length === 0) return null;
    return items[randomInt(rng, items.length)];
}
