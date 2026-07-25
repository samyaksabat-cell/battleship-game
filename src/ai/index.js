import { createEasyAI } from './easy.js';
import { createMediumAI } from './medium.js';
import { createHardAI } from './hard.js';

export { createKnowledge, recordShot, isFired, unresolvedHits, unfiredCells } from './knowledge.js';

// Uniform wrapper around the three difficulty modules:
//   nextMove(knowledge)                -> { row, col }
//   onShotResult(knowledge, result)    -> lets the tier update its own state
//   probabilityMap(knowledge)          -> hard only, used by the heatmap
export function createAI(difficulty = 'medium', rng = Math.random) {
    switch (difficulty) {
        case 'easy':
            return createEasyAI(rng);
        case 'hard':
            return createHardAI(rng);
        case 'medium':
        default:
            return createMediumAI(rng);
    }
}
