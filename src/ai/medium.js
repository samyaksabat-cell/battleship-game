import { getAdjacentCells } from '../board.js';
import { pickRandom } from '../rng.js';
import { isFired, unfiredCells } from './knowledge.js';

// Medium AI: hunt/target. Fires randomly until it hits something, then probes
// the orthogonally adjacent cells of the most recent unresolved hit until the
// wounded ship sinks or the leads run out.
export function createMediumState() {
    return { mode: 'hunt', hits: [] };
}

export function chooseMove(knowledge, state = createMediumState(), rng = Math.random) {
    if (state.mode === 'target') {
        for (let i = state.hits.length - 1; i >= 0; i--) {
            const hit = state.hits[i];
            const candidates = getAdjacentCells(hit.row, hit.col, knowledge.size).filter(
                (cell) => !isFired(knowledge, cell.row, cell.col)
            );
            if (candidates.length > 0) return candidates[0];
        }
    }
    return pickRandom(rng, unfiredCells(knowledge));
}

// Updates the hunt/target state after the outcome of a shot is known.
export function updateState(state, { row, col, hit, sunk = false }) {
    if (hit) {
        if (sunk) {
            state.hits = [];
            state.mode = 'hunt';
        } else {
            state.hits.push({ row, col });
            state.mode = 'target';
        }
    }
    return state;
}

// Drops leads whose adjacent cells have all been fired at; called once the
// knowledge has been updated with the latest shot.
export function pruneState(state, knowledge) {
    state.hits = state.hits.filter((hit) =>
        getAdjacentCells(hit.row, hit.col, knowledge.size).some(
            (cell) => !isFired(knowledge, cell.row, cell.col)
        )
    );
    if (state.hits.length === 0) state.mode = 'hunt';
    return state;
}

export function createMediumAI(rng = Math.random) {
    const state = createMediumState();
    return {
        difficulty: 'medium',
        state,
        nextMove: (knowledge) => chooseMove(knowledge, state, rng),
        onShotResult: (knowledge, result) => {
            updateState(state, result);
            pruneState(state, knowledge);
        }
    };
}
