import { describe, expect, it } from 'vitest';
import { buildReplay } from './replay.js';
import { createGrid } from './board.js';

describe('replay', () => {
    it('builds chronological frames with maps and biggest-mistake flags', () => {
        const scores = [10, 1, 10, 3, 10, 0, 6];
        const shots = scores.map((_, row) => ({ row, col: 0, hit: row % 2 === 0 }));
        const mapFn = () => {
            const map = createGrid(10, 0);
            scores.forEach((score, row) => { map[row][0] = score; });
            map[0][5] = 10;
            return map;
        };
        const { frames } = buildReplay(shots, { probabilityMapFn: mapFn });
        expect(frames).toHaveLength(shots.length);
        expect(frames.map((frame) => frame.turn)).toEqual([1, 2, 3, 4, 5, 6, 7]);
        expect(frames.filter((frame) => frame.isMistake).map((frame) => frame.turn).sort((a, b) => a - b))
            .toEqual([2, 4, 6]);
        frames.forEach((frame) => {
            expect(frame.map).toHaveLength(10);
            expect(frame.map.every((row) => row.length === 10)).toBe(true);
            expect(frame.playerScore).toBe(frame.map[frame.row][frame.col]);
        });
    });

    it('scores a repeated fired choice as zero and identifies the map argmax', () => {
        const shots = [
            { row: 1, col: 1, hit: false },
            { row: 1, col: 1, hit: false }
        ];
        const { frames } = buildReplay(shots);
        expect(frames[1].playerScore).toBe(0);
        const best = frames[0].map.reduce((bestCell, row, r) => row.reduce(
            (cell, score, col) => score > cell.score ? { row: r, col, score } : cell,
            bestCell
        ), { row: 0, col: 0, score: -Infinity });
        expect(frames[0].bestCell).toEqual({ row: best.row, col: best.col });
    });
});
