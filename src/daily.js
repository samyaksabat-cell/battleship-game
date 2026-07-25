import { SHIPS } from './constants.js';
import { createRandomFleet } from './board.js';
import { createRng } from './rng.js';
import { getMap, MAPS } from './maps.js';

const MAP_IDS = Object.keys(MAPS);

export function dailySeed(dateStr) {
    let hash = 2166136261;
    for (const character of dateStr) {
        hash ^= character.charCodeAt(0);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

export function dailyChallenge(dateStr) {
    const seed = dailySeed(dateStr);
    const mapId = MAP_IDS[seed % MAP_IDS.length];
    const map = getMap(mapId);
    const fleet = createRandomFleet(createRng(seed), SHIPS, 10, map.islands);
    return { dateStr, seed, mapId, fleet };
}
