# Sudoku Smart

A beginner-friendly Sudoku prototype for HCI 2. React 19 + TypeScript, Tailwind CSS 4, Lucide icons,
Motion, Vite. Progress, settings and statistics are saved in LocalStorage.

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # puzzle generator + game rules
npm run build    # production build in dist/
```

## Deploy

`npm run build` makes a static site in `dist/`. Asset paths are relative and screens use hash
addresses (`#/settings`), so `dist/` works on any static host, at a domain root or in a subfolder, with
no rewrite rules.

- **Netlify Drop:** open https://app.netlify.com/drop and drag the `dist` folder onto the page.
- **Vercel or Netlify from GitHub:** root directory `sudoku-smart`, build command `npm run build`,
  output directory `dist`.
- **GitHub Pages (set up):** `.github/workflows/deploy.yml` at the repository root tests, builds and
  publishes on every push to `main`. One-time: in the repository on GitHub, Settings > Pages >
  Source: GitHub Actions.

## Screens

| Screen | Address | What it does |
| --- | --- | --- |
| Home | `/` | Greeting set from your data, the saved board as a preview, Continue / Start, statistics, best times by level, recent wins |
| Difficulty | `#/difficulty` | Easy, Medium, Hard. Each card previews the **actual** puzzle you will play |
| Game | `#/game` | 9×9 board, keypad with remaining counts, notes, hint, undo/redo, erase, pause, timer, mistakes, progress, win dialog |
| How to play | `#/howto` | The five rules on a highlighted example board, a 4×4 practice puzzle that explains each mistake, the tools |
| Settings | `#/settings` | Theme, highlight matching numbers, highlight row/column/box, error checking, auto-clear notes, sound, animations, reset |

Links for presenting: `?theme=light` or `?theme=dark` sets the theme; `#/new/easy` (or `medium`, `hard`) opens a fresh game.

## Puzzle generation

`src/lib/sudoku.ts` fills a grid with a randomised backtracking solver, then removes clues in symmetric
pairs, keeping a removal only if a solution counter still finds exactly one solution. Every puzzle is
valid, solvable and unique. Easy keeps about 40 givens, Medium 32, Hard 26–28.

## HCI decisions worth presenting

- **Errors explain themselves.** A wrong number says why ("7 is already in row 8"), not just turns red.
- **Forgiving by default.** No game-over on mistakes; undo covers every move; restart and clearing
  statistics ask for confirmation.
- **Recognition over recall.** The keypad shows how many of each number are left and dims finished ones;
  notes highlight the selected number; the selected row, column and box are tinted.
- **What you see is what you get.** The level previews are the real boards.
- **Fair clock.** Leaving the tab pauses the game; pausing covers the board.
- **Keyboard and screen readers.** Arrows move, 1–9 place, Shift + number notes, N notes, H hint,
  P pause, Ctrl Z / Ctrl Y. Every cell has a spoken label ("Row 3, column 5: empty, notes 2 7").
- **Phone first.** On a 390px phone, the board, tools and keypad all fit on one screen.
- **Reduced motion.** Animations can be turned off and follow the device's reduced-motion setting.
