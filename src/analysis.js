import { SHIPS } from './constants.js';
import { createKnowledge, recordShot, isFired } from './ai/knowledge.js';
import { computeProbabilityMap, bestCells } from './ai/hard.js';

// Replays the player's shots and grades each one against the Hard AI's
// probability engine: how good was the chosen cell compared with the best cell
// available at that point of the match?
//
// `shots` is the recorded shot history, oldest first:
//   { row, col, hit, sunkShip: { size, positions } | null }
export function analyzeShots(shots, options = {}) {
    const {
        ships = SHIPS,
        probabilityMapFn = computeProbabilityMap,
        worstCount = 3,
        includeMap = false
    } = options;

    const knowledge = createKnowledge(ships);
    const turns = [];

    shots.forEach((shot, index) => {
        const map = probabilityMapFn(knowledge);
        const best = bestCells(knowledge, map);
        const playerScore = isFired(knowledge, shot.row, shot.col) ? 0 : map[shot.row][shot.col];
        const bestScore = best.score;
        const ratio = bestScore > 0 ? playerScore / bestScore : 1;

        const turn = {
            turn: index + 1,
            row: shot.row,
            col: shot.col,
            hit: Boolean(shot.hit),
            playerScore,
            bestScore,
            bestCell: best.cells[0] ?? null,
            gap: bestScore - playerScore,
            ratio
        };
        if (includeMap) turn.map = map;
        turns.push(turn);

        recordShot(knowledge, shot);
    });

    const efficiency = turns.length
        ? (turns.reduce((sum, turn) => sum + turn.ratio, 0) / turns.length) * 100
        : 0;

    const worstTurns = turns
        .filter((turn) => turn.gap > 0)
        .sort((a, b) => b.gap - a.gap || a.turn - b.turn)
        .slice(0, worstCount);

    return { turns, efficiency, worstTurns };
}

export function formatCell({ row, col }) {
    return `${String.fromCharCode(65 + col)}${row + 1}`;
}
