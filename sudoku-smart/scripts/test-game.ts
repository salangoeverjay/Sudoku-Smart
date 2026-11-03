import { newGame, placeValue, toggleNote, eraseCell, applyHint, undo, redo, restart, digitCounts } from '../src/lib/game.ts'
import { DEFAULT_SETTINGS, progressOf } from '../src/lib/store.ts'
import { sizeOf, DIFFICULTIES } from '../src/lib/sudoku.ts'
const ok = (c: unknown, m: string) => { if (!c) { console.error('FAIL', m); process.exitCode = 1 } else console.log('ok  ', m) }
const S = DEFAULT_SETTINGS
for (const level of DIFFICULTIES) {
  let g = newGame(level)
  const n = sizeOf(g.puzzle)
  const tag = `${level} ${n}x${n}:`
  const empties = g.values.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0)
  const [a, b] = empties
  ok(g.notes.length === n * n, `${tag} notes sized to the board`)
  ok(placeValue(g, g.values.findIndex(Boolean), 1, S).event === 'none', `${tag} cannot overwrite a given`)
  let r = placeValue(g, a, g.solution[a], S); g = r.game
  ok(r.event === 'placed' && g.values[a] === g.solution[a], `${tag} correct value placed`)
  const wrong = (g.solution[b] % n) + 1
  r = placeValue(g, b, wrong, S); g = r.game
  ok(r.event === 'mistake' && g.mistakes === 1 && !!r.message, `${tag} mistake counted with reason: "${r.message}"`)
  g = undo(g); ok(g.values[b] === 0 && g.mistakes === 1, `${tag} undo clears value, mistake count stays`)
  g = redo(g); ok(g.values[b] === wrong, `${tag} redo restores value`)
  g = eraseCell(g, b).game; ok(g.values[b] === 0, `${tag} erase clears value`)
  g = toggleNote(g, b, 1).game; g = toggleNote(g, b, n).game
  ok(g.notes[b] === ((1 << 1) | (1 << n)), `${tag} notes toggle as bitmask`)
  r = applyHint(g, b, S); g = r.game
  ok(r.event === 'hint' && g.values[b] === g.solution[b] && g.hintsLeft === 2, `${tag} hint fills selected cell, uses one hint`)
  ok(eraseCell(g, b).event === 'none', `${tag} hinted cell cannot be erased`)
  for (const i of empties) if (g.values[i] !== g.solution[i]) { r = placeValue(g, i, g.solution[i], S); g = r.game }
  ok(g.status === 'won' && r.event === 'won', `${tag} filling the solution wins`)
  ok(progressOf(g).pct === 100 && digitCounts(g).slice(1, n + 1).every((c) => c === n), `${tag} progress 100% and every digit counted ${n} times`)
  const rs = restart({ ...g, status: 'playing' })
  ok(rs.values.every((v, i) => v === rs.puzzle[i]) && rs.hintsLeft === 3 && rs.notes.length === n * n, `${tag} restart returns to the givens`)
}
