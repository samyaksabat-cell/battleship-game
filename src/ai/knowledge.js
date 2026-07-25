import { GRID_SIZE, SHIPS } from '../constants.js';
import { createGrid } from '../board.js';

export const HIT = 'hit';
export const MISS = 'miss';

// Everything an AI is allowed to know about the board it is firing at:
// which cells were fired upon and their outcome, which hits belong to a ship
// that is already sunk, and the sizes of the ships still afloat.
export function createKnowledge(ships = SHIPS, size = GRID_SIZE, blocked = null) {
    return {
        size,
        shots: createGrid(size), // null | HIT | MISS
        sunkCells: createGrid(size, false),
        blocked: blocked ?? createGrid(size, false),
        remainingShipSizes: ships.map((ship) => ship.size)
    };
}

export function isBlocked(knowledge, row, col) {
    return Boolean(knowledge.blocked?.[row]?.[col]);
}

export function isFired(knowledge, row, col) {
    return knowledge.shots[row][col] !== null;
}

export function unfiredCells(knowledge) {
    const cells = [];
    for (let row = 0; row < knowledge.size; row++) {
        for (let col = 0; col < knowledge.size; col++) {
            if (!isFired(knowledge, row, col) && !isBlocked(knowledge, row, col)) {
                cells.push({ row, col });
            }
        }
    }
    return cells;
}

// Hits that do not (yet) belong to a sunk ship: the AI still has a wounded
// ship to finish off around these cells.
export function unresolvedHits(knowledge) {
    const cells = [];
    for (let row = 0; row < knowledge.size; row++) {
        for (let col = 0; col < knowledge.size; col++) {
            if (knowledge.shots[row][col] === HIT && !knowledge.sunkCells[row][col]) {
                cells.push({ row, col });
            }
        }
    }
    return cells;
}

// Records the outcome of a shot. `sunkShip` is `{ size, positions }` when the
// shot sank a ship, so the AI can retire that ship and resolve its hits.
export function recordShot(knowledge, { row, col, hit, sunkShip = null }) {
    knowledge.shots[row][col] = hit ? HIT : MISS;

    if (sunkShip) {
        for (const pos of sunkShip.positions) {
            knowledge.sunkCells[pos.row][pos.col] = true;
        }
        const index = knowledge.remainingShipSizes.indexOf(sunkShip.size);
        if (index !== -1) knowledge.remainingShipSizes.splice(index, 1);
    }

    return knowledge;
}

export function cloneKnowledge(knowledge) {
    return {
        size: knowledge.size,
        shots: knowledge.shots.map((row) => row.slice()),
        sunkCells: knowledge.sunkCells.map((row) => row.slice()),
        blocked: knowledge.blocked?.map((row) => row.slice()) ?? createGrid(knowledge.size, false),
        remainingShipSizes: knowledge.remainingShipSizes.slice()
    };
}
