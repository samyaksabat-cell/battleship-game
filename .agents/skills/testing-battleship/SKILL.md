---
name: testing-battleship
description: Serve and test the Battleship game end-to-end in a browser — difficulty tiers, the Hard AI reasoning heatmap, and the post-game analysis screen. Use when verifying gameplay, AI, or UI changes in this repo.
---

# Testing the Battleship game

## Devin Secrets Needed

None. The game is a static, no-backend, no-auth page.

## Running it

```bash
npm install      # only dev dep is Vitest
npm test         # unit tests + the 200-game simulation test (~2s)
npx serve -l 3000 .
```

Open `http://localhost:3000/index.html`. **`file://` will not work** — `index.html` loads
`<script type="module">` and the `src/**` modules, which browsers block over `file://`.
If the page renders but nothing responds to clicks, that is almost always the symptom.
There is no lint or typecheck script in this repo; `npm test` is the only check.

## Clicking the grids reliably

Both boards are 10x10 with ~24px cells at the default 1024x768 window (maximize first with
`wmctrl -r :ACTIVE: -b add,maximized_vert,maximized_horz`). Measure the top-left cell centre once from a
screenshot, then compute `x = x0 + 24*col`, `y = y0 + 24*row` rather than eyeballing every cell. Re-measure
after any layout change (e.g. the heatmap legend appearing shifts the boards down by ~15px).

The AI replies on a ~1s timer and clicks during the AI's turn are silently ignored, so batch player shots
with a ~2s wait between them. Playing a parity sweep (every other cell, alternating offset per row) against
the Hard AI ends a game in ~45 shots, which is the fastest reliable way to reach the game-over screen.

## Verifying the heatmap without eyeballing colours

Each un-fired cell of `#player-grid-game` gets `title="AI interest: N%"`, so the annotated DOM gives you
numeric assertions instead of colour judgements. Useful, falsifiable checks:

- Fresh board: centre cells read ~100%, corners ~30% (a uniform map means the probability engine is not wired up).
- After the AI scores an unresolved hit: its four orthogonal neighbours jump to ~100% while the rest of the
  board drops to ~10-20%. After that ship is *sunk*, the map flattens again.
- A miss on one side of a wounded ship should leave only the opposite extension in the top band.

The overlay is applied as `heat-1..5` classes on top of ship/hit/miss classes; check that ✗/○ marks stay
visible. The heatmap is gated on Hard difficulty — on Easy/Medium the toggle shows a note instead, and the
note/legend are the parts most likely to break.

## Post-game analysis

The game-over screen grades the player's shots with the same Hard engine. To test it meaningfully, keep your
own log of the cells you clicked in order, then check the reported shot count and the listed turn
numbers/coordinates against that log — coordinates are `columnLetter + (row+1)`, so row 5 / col 9 is `J6`.
Percentages use `Math.round`, so a shot worth <0.5% of the optimal cell prints as `0%`; do not read that as a
literal zero. The "biggest missed opportunities" list ranks by raw score gap, which grows late in the game, so
a deliberately bad early shot may legitimately not appear.

## Gotchas seen before (may already be fixed)

- CSS utility classes can lose the cascade: a generic `.hidden { display: none }` declared before a component
  rule like `.heatmap-legend { display: flex }` does nothing. If an element that should be hidden is visible,
  check declaration order/specificity before suspecting the JS.
- The turn banner may read "AI's Turn" on the first turn after **Play Again**: `initializeGrids()` resets
  `isPlayerTurn` but not the banner text. Cosmetic, and it self-corrects after one shot.
- Always hard-reload (Ctrl+Shift+R) after editing `src/**` — module scripts are cached aggressively.
