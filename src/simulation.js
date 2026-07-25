import { SHIPS } from './constants.js';
import { createRandomFleet } from './board.js';
import { createRng } from './rng.js';
import { createAI } from './ai/index.js';
import { createKnowledge, recordShot } from './ai/knowledge.js';

// Fires at a fleet built by `createRandomFleet` and reports the outcome the
// same way the browser game does.
export function fireAt(fleet, row, col) {
    const cell = fleet.grid[row][col];
    if (typeof cell !== 'string') {
        fleet.grid[row][col] = { miss: true };
        return { row, col, hit: false, sunk: false, sunkShip: null };
    }

    fleet.grid[row][col] = { hit: true, ship: cell };
    const ship = fleet.ships.find((s) => s.name === cell);
    ship.hits++;
    const sunk = ship.hits === ship.positions.length;
    return { row, col, hit: true, sunk, sunkShip: sunk ? ship : null };
}

export function allShipsSunk(fleet) {
    return fleet.ships.every((ship) => ship.hits === ship.positions.length);
}

// Plays one headless game: the given difficulty fires at a randomly placed
// fleet until everything is sunk. Returns how many shots that took.
export function playGame({ difficulty = 'medium', rng = Math.random, fleetRng = rng, ships = SHIPS } = {}) {
    const fleet = createRandomFleet(fleetRng, ships);
    const ai = createAI(difficulty, rng);
    const knowledge = createKnowledge(ships);

    let shots = 0;
    const maxShots = knowledge.size * knowledge.size;
    while (!allShipsSunk(fleet) && shots < maxShots) {
        const move = ai.nextMove(knowledge);
        if (!move) break;
        const result = fireAt(fleet, move.row, move.col);
        shots++;
        recordShot(knowledge, result);
        ai.onShotResult(knowledge, result);
    }

    return { difficulty, shots, won: allShipsSunk(fleet) };
}

// Runs `games` games. The fleet and the AI draw from separate seeded streams
// derived from the game index, so every difficulty tier faces exactly the same
// sequence of boards and the comparison between tiers is paired.
export function runSimulations({ difficulty = 'medium', games = 200, seed = 1, ships = SHIPS } = {}) {
    const results = [];
    for (let i = 0; i < games; i++) {
        results.push(
            playGame({
                difficulty,
                fleetRng: createRng(seed + i * 7919),
                rng: createRng(seed + 1000003 + i * 104729),
                ships
            })
        );
    }
    const totalShots = results.reduce((sum, result) => sum + result.shots, 0);
    return {
        difficulty,
        games,
        results,
        wins: results.filter((result) => result.won).length,
        averageShots: totalShots / games
    };
}
