import { newGame, placeValue, toggleNote, eraseCell, applyHint, undo, redo, restart, digitCounts } from '../src/lib/game.ts'
import { DEFAULT_SETTINGS, progressOf } from '../src/lib/store.ts'
const ok = (c: unknown, m: string) => { if (!c) { console.error('FAIL', m); process.exitCode = 1 } else console.log('ok  ', m) }
const S = DEFAULT_SETTINGS
let g = newGame('easy')
const empties = g.values.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0)
const [a, b] = empties
ok(placeValue(g, g.values.findIndex(Boolean), 5, S).event === 'none', 'cannot overwrite a given')
let r = placeValue(g, a, g.solution[a], S); g = r.game
ok(r.event === 'placed' && g.values[a] === g.solution[a], 'correct value placed')
const wrong = (g.solution[b] % 9) + 1
r = placeValue(g, b, wrong, S); g = r.game
ok(r.event === 'mistake' && g.mistakes === 1 && !!r.message, `mistake counted with reason: "${r.message}"`)
g = undo(g); ok(g.values[b] === 0 && g.mistakes === 1, 'undo clears value, mistake count stays')
g = redo(g); ok(g.values[b] === wrong, 'redo restores value')
g = eraseCell(g, b).game; ok(g.values[b] === 0, 'erase clears value')
g = toggleNote(g, b, 3).game; g = toggleNote(g, b, 7).game
ok(g.notes[b] === ((1 << 3) | (1 << 7)), 'notes toggle as bitmask')
// auto-remove: place correct digit in a peer of b that has note == that digit
const peerRowEmpty = empties.find((i) => i !== b && i !== a && Math.floor(i / 9) === Math.floor(b / 9))
if (peerRowEmpty !== undefined) {
  const d = g.solution[peerRowEmpty]
  g = toggleNote(g, b, d).game
  g = placeValue(g, peerRowEmpty, d, S).game
  ok(!(g.notes[b] & (1 << d)), 'placing a number clears it from peer notes')
}
r = applyHint(g, b, S); g = r.game
ok(r.event === 'hint' && g.values[b] === g.solution[b] && g.hintsLeft === 2, 'hint fills selected cell, uses one hint')
ok(eraseCell(g, b).event === 'none', 'hinted cell cannot be erased')
const off = { ...S, errorChecking: false }
const c = empties.find((i) => !g.values[i])!
r = placeValue(g, c, (g.solution[c] % 9) + 1, off)
ok(r.event === 'placed' && r.game.mistakes === g.mistakes, 'error checking off: wrong value not counted')
// solve everything
for (const i of empties) if (g.values[i] !== g.solution[i]) { r = placeValue(g, i, g.solution[i], S); g = r.game }
ok(g.status === 'won' && r.event === 'won', 'filling the solution wins')
ok(progressOf(g).pct === 100 && digitCounts(g).slice(1).every((n) => n === 9), 'progress 100% and every digit counted 9 times')
ok(placeValue(g, empties[0], 1, S).event === 'none', 'no moves after win')
const rs = restart({ ...g, status: 'playing' })
ok(rs.values.every((v, i) => v === rs.puzzle[i]) && rs.hintsLeft === 3 && rs.mistakes === 0, 'restart returns to the givens')
