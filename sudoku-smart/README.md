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
  P pause, Ctrl Z / Ctrl Y. Every cell has a spoken label ("Row 3, column 5, empty, editable, notes 2 7").
- **Phone first.** On a 390px phone, the board, tools and keypad all fit on one screen.
- **Reduced motion.** Motion can be turned off and always follows the device's reduced-motion setting.

## Accessibility Enhancements for Visually Impaired Users

Settings > Visual Accessibility gathers every visual aid in one place. All of them start at the
standard setting, save the moment they change (LocalStorage, `sudoku-smart:settings`), apply on every
screen, and can be put back with **Reset accessibility settings** after a confirmation. A live board
preview beside the controls shows each change before you play.

| Feature | What it changes |
| --- | --- |
| Colour vision mode | Normal, Protanopia, Deuteranopia, Tritanopia or Monochrome. Each is a separate palette for light and dark (not a filter over the page). In any mode other than Normal, errors also get a hatch and a cross, the selected cell a thick ink outline, and hinted numbers a corner notch, so no state depends on colour alone. |
| Font size | 100%, 125%, 150% or 200% of the browser's text size, so the operating system's own text scaling still applies. Text, buttons, menus and instructions grow; at 150% and above the keypad and tools rearrange into wider keys instead of clipping. |
| High contrast | Black and white text and surfaces, dark grid lines and borders, outlines on panels and buttons, a 3px focus ring with a gap, the selection outline and the error, hint and match marks. |
| Thick grid lines | Cell lines go from 1px to 2px, box boundaries from 2px to 4px. |
| Highlight selected row and column | A stronger band across the selected row and down its column, on top of the box tint. |
| Enhanced number highlighting | Matching numbers get an outline and a bar under the number; matching notes are bold and underlined. |
| Large number mode | Numbers fill about three quarters of a cell; the rest of the interface keeps its size. |
| Board zoom | 100%, 125% or 150%. The board grows inside a square frame that keeps its place; the frame scrolls, and the selected cell is always scrolled into view, so the keypad and arrow keys keep working. |
| Reduce motion | Stops number pops, screen fades, the board wave and the celebration; the win dialog opens at once. The device's reduced-motion setting is followed whether or not this is on. |
| Screen reader assistance | Optional spoken guidance through the browser's speech synthesis: the selected cell, each move, mistakes with their reason, pause and the finish. A mute button sits on the board while it is on, and Escape stops speech. |

Screen reader support works with spoken guidance off: the board is an ARIA grid of 9 rows and 81
cells with one cell in the tab order; each cell is named with its row, column, number and whether it
is fixed or editable, incorrect or from a hint; placements are announced in a polite live region and
mistakes with their reason.

### How it helps

- **Readability.** Text scales to 200%, numbers can fill their cells, and the board can be zoomed.
- **Visual clarity.** Thicker lines, a row and column band, high contrast and stronger focus rings
  make the structure of the board and the current position easy to find.
- **User control.** Every aid is optional, independent, previewed live and reversible in one step.
- **Error recognition.** Mistakes are marked by shape (hatch and cross) and explained in words, so
  they are found without seeing red.
- **Accessibility.** Keyboard play, screen reader labels and spoken guidance serve players who
  cannot rely on the screen.
- **Inclusive design.** Colour vision palettes and the operating system's text and motion settings
  are respected rather than overridden.

### HCI principles addressed

- **Perceivable information (WCAG principle 1)** through contrast, non-colour cues and text scaling.
- **User control and freedom** (Nielsen): optional settings, a mute button, reset with confirmation.
- **Visibility of system status:** the live preview, the "Saved" stamp, announcements of each move.
- **Error prevention and recovery:** errors are recognisable without colour and explained in words.
- **Flexibility and efficiency of use:** keyboard shortcuts and zoom serve both novices and experts.
- **Consistency:** one set of preferences applies to every screen and every board, previews included.
- **Recognition rather than recall:** row and column bands and match markers show what to compare.

### Testing done, and what is not claimed

These were tested; they are not a certification of WCAG compliance.

- **Contrast (automated, `npm test`).** 700 checks across all five colour modes, light and dark,
  with and without high contrast: text at 4.5:1 and board lines, switch tracks and the selection
  outline at 3:1. Every colour vision mode and every high contrast combination passes. The original
  default palette is kept as it was and has three known shortfalls, all of the player's blue numbers
  on highlighted cells (3.29:1 on the selected cell, 4.25:1 on a matching cell in light mode, 4.26:1 on
  the selected cell in dark mode); High Contrast fixes them.
- **In a real browser (headless Chrome, scripted), 65 checks, all passing on the final build:**
  - Every colour vision mode, and high contrast in light and dark: the mode is applied; error cells
    carry the cross, hatch and `aria-invalid`; hinted cells the notch; the selected cell a 3px outline.
  - Font size 125%, 150% and 200% at 390px and 1440px on every screen: no sideways scrolling and no
    clipped text. (The first runs found clipped captions, a sidebar label breaking letter by letter,
    and three screens wider than a phone; all were fixed and re-tested.)
  - 200% text with 150% zoom, large numbers and thick lines on a phone: arrow keys reach the far
    corner, the frame scrolls it into view, and the keypad places a number.
  - Keyboard and screen reader semantics: a grid of 9 rows and 81 cells, one cell in the tab order,
    focus following the arrow keys, fixed and editable cells labelled, placements and mistakes
    announced, wrong cells labelled incorrect.
  - Reduce motion: the win dialog opens at once with no celebration.
  - Settings changed through the Settings screen persist after a reload; Reset accessibility settings
    asks first and restores only the accessibility defaults; an old saved "Animations off" carries
    over as Reduce Motion; a saved game survives.
- **Gameplay unchanged:** the puzzle generator and game rule tests (`npm test`) pass as before.
- **Not yet tested:** with real screen readers (NVDA, JAWS, VoiceOver, TalkBack), with people who have
  colour vision deficiencies or low vision, and with Windows High Contrast (forced colours) themes.
  The colour vision palettes were chosen for separation by type, not verified with users.
