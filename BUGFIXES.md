# Bug Fixes

A summary of the bugs found in the Battleship game and how they were resolved. The first entry
comes from the original debugging notes in `DEBUG.md`; the rest were found and fixed while adding
the stats, analysis and end-game features, and are traceable in the git history.

## 1. Player grid not showing AI hits/misses

**Description**: When the AI attacked the player's fleet, the player's grid kept showing only ship
positions — no hit (✗) or miss (○) markers appeared.

**Root cause**: `updateGameGrids()` only handled cells containing a ship name (a string) and ignored
cells holding an object with `hit` / `miss` attack results.

**Fix**: Branch on `typeof cellData` so object cells render the `hit` / `miss` classes and the
`✗` / `○` glyphs. See `game.js` and `DEBUG.md`.

## 2. `.hidden` utility overridden by component `display` rules

**Description**: Screens and panels marked `.hidden` stayed visible because component rules set an
explicit `display` value with equal or higher specificity.

**Root cause**: `.hidden { display: none }` lost the cascade to those component rules.

**Fix**: Made the utility authoritative with `display: none !important` in `style.css`
(commit `7d40d00`).

## 3. Turn banner not reset on (re)initialization

**Description**: Starting a new game could leave the turn banner showing the previous game's state
(e.g. "Enemy Turn" or a defeat colour).

**Root cause**: `initializeGrids()` reset the grids but not the turn indicator.

**Fix**: `initializeGrids()` in `game.js` now resets `turnIndicator.textContent` to `'Your Turn'`
along with its colour (commit `b9de121`).

## 4. Stats screen always returned to the setup screen

**Description**: Opening stats from the game-over screen and pressing Back dropped the player onto a
stale setup screen.

**Root cause**: The back handler had a single hardcoded destination.

**Fix**: `game.js` records a `statsOrigin` when the stats screen is opened (setup vs. game-over), and
`statsBackBtn` returns to that origin (commit `bf26f03`).

## 5. Islands treated as valid cells in post-game analysis and replay

**Description**: Island (blocked) cells were scored as playable in the post-game analysis and drawn
as ordinary cells during replay, distorting accuracy metrics.

**Root cause**: The analysis and replay builders had no knowledge of the map's blocked cells.

**Fix**: `analyzeShots()` and `buildReplay()` in `src/analysis.js` now take a `blocked` grid, and
`renderReplayFrame()` in `game.js` skips island cells, so islands score 0 (commit `52ba012`).

## 6. Mobile replay grid horizontal overflow

**Description**: On narrow screens the replay grid overflowed horizontally and the last columns were
cut off.

**Root cause**: The replay grid used fixed cell sizing that did not shrink below the viewport width.

**Fix**: Responsive rules for `#replay-grid` in `style.css` use `aspect-ratio` with
`minmax(0, 1fr)` columns and rows so all ten columns fit (commit `868edcd`).

## Environment note: git unavailable in the original build environment

The machine used for the initial development had no working git (macOS reported
`xcode-select: note: No developer tools were found`), which blocked automatic commits and pushes.
This was a known limitation documented in `DEBUG.md`, not a defect in the game itself; the
workaround was installing the Xcode command line tools or uploading files through the GitHub UI.
