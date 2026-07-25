const ARCHIPELAGO_CELLS = [
    { row: 1, col: 1 },
    { row: 1, col: 2 },
    { row: 2, col: 1 },
    { row: 4, col: 7 },
    { row: 5, col: 7 },
    { row: 7, col: 7 },
    { row: 7, col: 8 },
    { row: 8, col: 7 }
];

export function islandCells(size = 10) {
    return ARCHIPELAGO_CELLS
        .filter(({ row, col }) => row < size && col < size)
        .map((cell) => ({ ...cell }));
}

export function fogCells(turn, size = 10) {
    const count = Math.min(12, Math.max(0, size * 2));
    const cells = [];
    for (let index = 0; index < count; index++) {
        cells.push({
            row: (turn * 3 + index * 2) % size,
            col: (turn * 5 + index * 3) % size
        });
    }
    return cells.filter((cell, index, all) =>
        all.findIndex((other) => other.row === cell.row && other.col === cell.col) === index
    );
}

const noFog = () => [];

export const MAPS = {
    classic: {
        id: 'classic',
        name: 'Classic Waters',
        description: 'Open waters with no islands or fog.',
        islands: [],
        hasFog: false,
        fogCells: noFog
    },
    archipelago: {
        id: 'archipelago',
        name: 'Archipelago',
        description: 'Navigate around scattered island cells.',
        islands: islandCells(),
        hasFog: false,
        fogCells: noFog
    },
    fog: {
        id: 'fog',
        name: 'Rolling Fog',
        description: 'A drifting fog obscures part of the waters.',
        islands: [],
        hasFog: true,
        fogCells
    }
};

export function getMap(id) {
    return MAPS[id] ?? null;
}
