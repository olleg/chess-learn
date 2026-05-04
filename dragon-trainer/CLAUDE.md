# Dragon Trainer — Architecture Reference

A client-side chess opening trainer for practicing the Sicilian Dragon (Yugoslav Attack) as Black. Designed for a single user on a tablet.

## Running the project

```bash
npm install
npm run dev        # Vite dev server → http://localhost:5173
npm run build      # production build → dist/
npm run validate   # verify all moves in data/dragon-main-line.json
```

## Stack

| Library | Version | Role |
|---|---|---|
| chessground | 9.2.1 | Board rendering and piece interaction |
| chess.js | 1.4.0 | Chess rules, move validation, FEN/SAN |
| Vite | 8 | Dev server and bundler |

No frameworks (no React/Vue/Svelte). No TypeScript. No backend. Vanilla JS ES modules throughout.

## File structure

```
dragon-trainer/
├── index.html                  # app shell
├── src/
│   ├── main.js                 # trainer state and all game logic
│   ├── style.css               # layout, touch polish, animations
│   ├── audio.js                # Web Audio API sound effects
│   └── chess/
│       └── board.js            # chessground init + setPosition wrapper
├── data/
│   └── dragon-main-line.json   # 30 half-moves, Yugoslav Attack Dragon
└── scripts/
    └── validate-line.js        # Node.js script: verifies JSON against chess.js
```

## How the trainer works

The board is always oriented with Black at the bottom. White's moves play automatically; the user plays Black.

**Flow:**
1. Page loads → 700 ms delay → White plays `1.e4` automatically.
2. Black's legal destinations are shown (via `movable.dests` from chess.js).
3. User drags or taps a piece. `movable.events.after(from, to)` fires.
4. `handleUserMove` checks `from`/`to` against `moves[state.moveIndex]`.
   - **Correct:** apply to chess.js, advance `moveIndex`, play sound, schedule White's reply in 700 ms.
   - **Wrong:** lock board, red flash, "Wrong move — restarting..." status, call `resetGame()` after 1.2 s.
5. After all 30 half-moves, `handleComplete()` fires — "Well done! Line complete!".

**State (all in `main.js`):**

```js
state = { moveIndex, chess, hintLevel }
runComplete  // boolean, module-level flag
```

chess.js is the single source of truth for position. chessground is always synced to `chess.fen()`.

## Key architectural decisions

**Wrong move = full restart.** The trainer resets to the starting position on any mistake. There is no "try again from here". This keeps the loop tight and reinforces memorisation.

**No persistence.** localStorage saving was removed when the restart-on-mistake behaviour was adopted — saving mid-run progress no longer made sense.

**Move validation via `after` callback + FEN revert.** chessground fires `after(from, to)` after the piece has already moved visually. On a wrong move we immediately call `setPosition(cg, {fen: chess.fen(), ...})` which animates the piece back. No pre-move hook is needed.

**`movable.dests` shows all legal moves, not just the correct one.** The kid can attempt any legal move; wrong ones snap back. This lets them explore without being told which piece to move (unless they ask for a hint).

**Hint button hidden by default; visible at `?admin`.** Navigate to `http://localhost:5173/?admin` to show the Hint button. Three stages: (1) blue circle on the from-square, (2) blue arrow from→to, (3) auto-play.

**chessground FEN note.** `cg.set({fen: chess.fen()})` works correctly — chessground stops parsing at the first space in the FEN string, so the full chess.js FEN can be passed directly.

## Opening data

`data/dragon-main-line.json` — 30 half-moves of the Yugoslav Attack Dragon:

```
1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 g6
6.Be3 Bg7 7.f3 O-O 8.Qd2 Nc6 9.O-O-O d5
10.exd5 Nxd5 11.Nxc6 bxc6 12.Bd4 e5 13.Bc5 Be6
14.Ne4 Re8 15.Be2 h6
```

Each entry: `{ moveIndex, player, from, to, san }`. `san` strings are authoritative — they were verified against chess.js. `from`/`to` coordinates are derived from them.

Run `npm run validate` any time after editing the JSON.

## Hard rules

- **No new frameworks** — vanilla JS, vanilla CSS, ES modules only.
- **No backend** — everything runs client-side.
- **No TypeScript migration** — plain JS is sufficient.
- **No telemetry** — this is a private tool.
- **No big refactors without discussion** — the architecture is intentional; propose changes in a comment here before touching structure.
- **Code in English** — UI text is also English.
- **Never commit `node_modules/` or `dist/`.**

## Future work (do not start without explicit ask)

- White-side variations after move 7 (Be2 classical, Bc4 Yugoslav alternative).
- Training as White against the Dragon.
- A library of multiple games / lines on a start screen.
- Spaced-repetition scheduling based on mistake history.
- PGN import — paste a PGN, get a trainer for that line.
