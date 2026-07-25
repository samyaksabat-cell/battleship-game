import { createGrid, getAdjacentCells } from '../board.js';
import { pickRandom } from '../rng.js';
import { HIT, MISS, isBlocked, isFired, unfiredCells, unresolvedHits } from './knowledge.js';

export const DEFAULT_OPTIONS = {
    // Multiplier applied per unresolved hit a candidate placement covers, so
    // placements that explain a wounded ship dominate the map.
    hitMultiplier: 12,
    // Flat bonus added to un-fired cells orthogonally adjacent to a hit on a
    // ship that has not been sunk yet.
    adjacencyBonus: 20
};

function placementCells(row, col, size, horizontal) {
    const cells = [];
    for (let i = 0; i < size; i++) {
        cells.push({
            row: horizontal ? row : row + i,
            col: horizontal ? col + i : col
        });
    }
    return cells;
}

// Probability density map: for every un-fired cell, how many valid placements
// of the remaining ships would occupy it, weighted so that placements
// consistent with unresolved hits count for much more.
export function computeProbabilityMap(knowledge, options = {}) {
    const { hitMultiplier, adjacencyBonus } = { ...DEFAULT_OPTIONS, ...options };
    const size = knowledge.size;
    const map = createGrid(size, 0);

    for (const shipSize of knowledge.remainingShipSizes) {
        for (const horizontal of [true, false]) {
            const maxRow = horizontal ? size : size - shipSize + 1;
            const maxCol = horizontal ? size - shipSize + 1 : size;
            for (let row = 0; row < maxRow; row++) {
                for (let col = 0; col < maxCol; col++) {
                    const cells = placementCells(row, col, shipSize, horizontal);
                    let hitsCovered = 0;
                    let valid = true;
                    for (const cell of cells) {
                        if (isBlocked(knowledge, cell.row, cell.col)) {
                            valid = false;
                            break;
                        }
                        const shot = knowledge.shots[cell.row][cell.col];
                        if (shot === MISS || knowledge.sunkCells[cell.row][cell.col]) {
                            valid = false;
                            break;
                        }
                        if (shot === HIT) hitsCovered++;
                    }
                    if (!valid) continue;

                    const weight = hitsCovered > 0 ? Math.pow(hitMultiplier, hitsCovered) : 1;
                    for (const cell of cells) {
                        if (!isFired(knowledge, cell.row, cell.col)) {
                            map[cell.row][cell.col] += weight;
                        }
                    }
                }
            }
        }
    }

    for (const hit of unresolvedHits(knowledge)) {
        for (const cell of getAdjacentCells(hit.row, hit.col, size)) {
            if (!isFired(knowledge, cell.row, cell.col) && map[cell.row][cell.col] > 0) {
                map[cell.row][cell.col] += adjacencyBonus;
            }
        }
    }

    return map;
}

// Highest scoring un-fired cell; ties are broken with `rng`.
export function bestCells(knowledge, map) {
    let best = -Infinity;
    let cells = [];
    for (let row = 0; row < knowledge.size; row++) {
        for (let col = 0; col < knowledge.size; col++) {
            if (isFired(knowledge, row, col)) continue;
            if (isBlocked(knowledge, row, col)) continue;
            const score = map[row][col];
            if (score > best) {
                best = score;
                cells = [{ row, col }];
            } else if (score === best) {
                cells.push({ row, col });
            }
        }
    }
    return { score: best === -Infinity ? 0 : best, cells };
}

export function chooseMove(knowledge, rng = Math.random, options = {}) {
    const map = computeProbabilityMap(knowledge, options);
    const { score, cells } = bestCells(knowledge, map);
    if (cells.length === 0) return null;
    if (score <= 0) return pickRandom(rng, unfiredCells(knowledge));
    return pickRandom(rng, cells);
}

export function createHardAI(rng = Math.random, options = {}) {
    return {
        difficulty: 'hard',
        nextMove: (knowledge) => chooseMove(knowledge, rng, options),
        probabilityMap: (knowledge) => computeProbabilityMap(knowledge, options),
        onShotResult: () => {}
    };
}
