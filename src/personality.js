export const AI_WIN_LINES = {
    blowout: {
        easy: 'Well, that happened. GG!',
        medium: 'Called every shot. Every. Single. One.',
        hard: "Statistically, that wasn't even close."
    },
    close: {
        easy: 'Whew — that was way too close!',
        medium: 'One more shot and it\'s a different story.',
        hard: 'You made me work for that. Respect.'
    },
    comeback: {
        easy: 'I thought I was sunk! Literally!',
        medium: 'Never count me out.',
        hard: 'The odds said I was losing. The odds were wrong.'
    }
};

export const AI_LOSS_LINES = {
    blowout: {
        easy: "You're really good at this!",
        medium: 'Okay. That was embarrassing.',
        hard: 'Recalculating... everything.'
    },
    close: {
        easy: 'So close! Rematch?',
        medium: 'One shot. ONE shot away.',
        hard: "The math was on my side. Chaos wasn't."
    }
};

export const WILDCARD_LINES = [
    "Cry 'Havoc!' and let slip the dogs of war. — Shakespeare, Julius Caesar",
    'Give me liberty, or give me death! — Patrick Henry',
    'All warfare is based on deception. — Sun Tzu, The Art of War',
    "Nuts! — Gen. McAuliffe's real reply when the Germans demanded surrender at Bastogne, 1944",
    'Come and take it.',
    'Fortune favors the bold.',
    'He who fights and runs away lives to fight another day.'
];

const recentLines = [];
const RECENT_LIMIT = 5;

export function outcomeBucket({ won, playerShipsLeft, aiShipsLeft, aiWasBehind }) {
    if (won) return playerShipsLeft >= 4 ? 'blowout' : 'close';
    if (aiWasBehind) return 'comeback';
    return aiShipsLeft >= 4 ? 'blowout' : 'close';
}

function normalizeTier(difficulty) {
    return ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'medium';
}

export function personalityLine(context, options = {}) {
    const {
        rng = Math.random,
        recent = recentLines,
        wildcardChance = 0.25,
        remember = true
    } = options;
    const tier = normalizeTier(context.difficulty);
    const bucket = outcomeBucket(context);
    const lines = context.won ? AI_LOSS_LINES : AI_WIN_LINES;
    const contextualLine = lines[bucket]?.[tier];
    const useWildcard = rng() < wildcardChance || !contextualLine;
    const pool = useWildcard ? WILDCARD_LINES : [contextualLine];
    const available = pool.filter((line) => !recent.includes(line));
    const candidates = available.length ? available : pool;
    const chosen = candidates[Math.min(candidates.length - 1, Math.floor(rng() * candidates.length))];

    if (remember) {
        recent.push(chosen);
        if (recent.length > RECENT_LIMIT) recent.shift();
    }
    return chosen;
}

export function resetPersonalityHistory() {
    recentLines.length = 0;
}
