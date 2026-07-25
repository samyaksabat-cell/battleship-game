import { pickRandom } from '../rng.js';
import { unfiredCells } from './knowledge.js';

// Easy AI: uniformly random targeting among cells that were never fired at.
export function chooseMove(knowledge, rng = Math.random) {
    return pickRandom(rng, unfiredCells(knowledge));
}

export function createEasyAI(rng = Math.random) {
    return {
        difficulty: 'easy',
        nextMove: (knowledge) => chooseMove(knowledge, rng),
        onShotResult: () => {}
    };
}
