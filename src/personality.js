const LINES = {
    victory: {
        blowout: [
            'A decisive convoy victory — your fleet barely gave them a chance.',
            'The waters are yours. That was a commanding operation.'
        ],
        close: [
            'A hard-fought victory — your last ships held the line.',
            'You prevailed by the narrowest margin. Excellent seamanship.'
        ],
        normal: [
            'Victory secured. Your fleet kept steady pressure throughout.',
            'The convoy made it through. A well-earned win.'
        ]
    },
    defeat: {
        blowout: [
            'The convoy was intercepted today. Regroup and chart a new course.',
            'A tough patrol, but every engagement is a chance to learn.'
        ],
        close: [
            'That was a close engagement. Your fleet nearly broke through.',
            'A hard-fought loss — the next convoy may have the edge.'
        ],
        normal: [
            'The waters were unforgiving today. Review the engagement and try again.',
            'The fleet came up short, but the campaign continues.'
        ]
    }
};

export function outcomeBucket({ won, playerShipsLeft, aiShipsLeft }) {
    const winnerShips = won ? playerShipsLeft : aiShipsLeft;
    const loserShips = won ? aiShipsLeft : playerShipsLeft;
    if (winnerShips <= 1) return 'close';
    if (loserShips === 0 && winnerShips >= 4) return 'blowout';
    return 'normal';
}

export function personalityLine(context, rng = Math.random) {
    const outcome = context.won ? 'victory' : 'defeat';
    const bucket = outcomeBucket(context);
    const lines = LINES[outcome][bucket];
    const index = Math.min(lines.length - 1, Math.floor(rng() * lines.length));
    return lines[index];
}
