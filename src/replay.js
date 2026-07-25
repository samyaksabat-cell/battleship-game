import { analyzeShots } from './analysis.js';

export function buildReplay(shots, options = {}) {
    const { turns, worstTurns, efficiency } = analyzeShots(shots, {
        includeMap: true,
        worstCount: 3,
        ...options
    });
    const worstTurnNumbers = new Set(worstTurns.map((turn) => turn.turn));
    const frames = turns.map((turn) => ({
        turn: turn.turn,
        row: turn.row,
        col: turn.col,
        hit: turn.hit,
        map: turn.map,
        bestCell: turn.bestCell,
        ratio: turn.ratio,
        gap: turn.gap,
        playerScore: turn.playerScore,
        bestScore: turn.bestScore,
        isMistake: worstTurnNumbers.has(turn.turn)
    }));
    return { frames, worstTurns, efficiency };
}
