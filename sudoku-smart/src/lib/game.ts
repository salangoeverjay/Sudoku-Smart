import { candidatesAt, explainMistake, generatePuzzle, PEERS, type Difficulty } from './sudoku'
import { HINTS_PER_GAME, type Game, type Settings, type Snapshot } from './store'

export type MoveEvent = 'placed' | 'mistake' | 'won' | 'note' | 'erased' | 'hint' | 'none'

export interface MoveResult {
  game: Game
  event: MoveEvent
  message?: string
  cell?: number
}

const HISTORY_CAP = 300

export function newGame(
  difficulty: Difficulty,
  pre: { puzzle: number[]; solution: number[] } = generatePuzzle(difficulty),
): Game {
  const { puzzle, solution } = pre
  return {
    id: Math.random().toString(36).slice(2, 10),
    difficulty,
    puzzle,
    solution,
    values: puzzle.slice(),
    notes: new Array(81).fill(0),
    hinted: [],
    mistakes: 0,
    hintsLeft: HINTS_PER_GAME,
    elapsed: 0,
    status: 'playing',
    startedAt: Date.now(),
    history: [],
    future: [],
  }
}

const snap = (g: Game): Snapshot => ({ values: g.values.slice(), notes: g.notes.slice() })

function commit(g: Game, values: number[], notes: number[]): Game {
  const history = [...g.history, snap(g)].slice(-HISTORY_CAP)
  return { ...g, values, notes, history, future: [] }
}

export const isSolved = (g: Game) => g.values.every((v, i) => v === g.solution[i])
export const isWrong = (g: Game, i: number) => !!g.values[i] && g.values[i] !== g.solution[i]

/** Clear `digit` from the pencil marks of every peer of `i`. */
function clearPeerNotes(notes: number[], i: number, digit: number) {
  const bit = 1 << digit
  for (const j of PEERS[i]) notes[j] &= ~bit
}

export function placeValue(g: Game, i: number, digit: number, s: Settings): MoveResult {
  if (g.status !== 'playing' || g.puzzle[i] || g.values[i] === digit) return { game: g, event: 'none' }
  const values = g.values.slice()
  const notes = g.notes.slice()
  values[i] = digit
  notes[i] = 0
  const correct = digit === g.solution[i]
  if (correct && s.autoRemoveNotes) clearPeerNotes(notes, i, digit)

  let game = commit(g, values, notes)
  if (!correct && s.errorChecking) {
    game = { ...game, mistakes: game.mistakes + 1 }
    return { game, event: 'mistake', cell: i, message: explainMistake(values, i, digit) }
  }
  if (isSolved(game)) return { game: { ...game, status: 'won' }, event: 'won', cell: i }
  if (values.every(Boolean)) {
    const wrong = values.filter((v, k) => v !== g.solution[k]).length
    return {
      game,
      event: 'placed',
      cell: i,
      message: `Every cell is filled, but ${wrong} ${wrong === 1 ? 'number does' : 'numbers do'} not fit yet. Turn on error checking in Settings to see which.`,
    }
  }
  return { game, event: 'placed', cell: i }
}

export function toggleNote(g: Game, i: number, digit: number): MoveResult {
  if (g.status !== 'playing' || g.puzzle[i] || g.values[i]) return { game: g, event: 'none' }
  const notes = g.notes.slice()
  notes[i] ^= 1 << digit
  return { game: commit(g, g.values, notes), event: 'note', cell: i }
}

export function eraseCell(g: Game, i: number): MoveResult {
  if (g.status !== 'playing' || g.puzzle[i] || g.hinted.includes(i)) return { game: g, event: 'none' }
  if (!g.values[i] && !g.notes[i]) return { game: g, event: 'none' }
  const values = g.values.slice()
  const notes = g.notes.slice()
  values[i] = 0
  notes[i] = 0
  return { game: commit(g, values, notes), event: 'erased', cell: i }
}

/**
 * Reveal one cell. The selected cell if it is empty or wrong, otherwise the empty cell
 * with the fewest candidates, which is the one a person would most likely solve next.
 */
export function applyHint(g: Game, selected: number | null, s: Settings): MoveResult {
  if (g.status !== 'playing' || g.hintsLeft <= 0) return { game: g, event: 'none' }
  let target = -1
  if (selected !== null && !g.puzzle[selected] && g.values[selected] !== g.solution[selected]) target = selected
  if (target === -1) {
    let fewest = 10
    for (let i = 0; i < 81; i++) {
      if (g.values[i] === g.solution[i]) continue
      const n = g.values[i] ? 10 : candidatesAt(g.values, i).length
      if (n < fewest || target === -1) {
        fewest = n
        target = i
      }
    }
  }
  if (target === -1) return { game: g, event: 'none' }
  const digit = g.solution[target]
  const values = g.values.slice()
  const notes = g.notes.slice()
  values[target] = digit
  notes[target] = 0
  if (s.autoRemoveNotes) clearPeerNotes(notes, target, digit)
  let game: Game = {
    ...commit(g, values, notes),
    hintsLeft: g.hintsLeft - 1,
    hinted: [...g.hinted, target],
  }
  if (isSolved(game)) game = { ...game, status: 'won' }
  return {
    game,
    event: game.status === 'won' ? 'won' : 'hint',
    cell: target,
    message: `Hint: ${digit} goes in row ${Math.floor(target / 9) + 1}, column ${(target % 9) + 1}.`,
  }
}

export function undo(g: Game): Game {
  const prev = g.history.at(-1)
  if (!prev || g.status !== 'playing') return g
  return { ...g, ...prev, history: g.history.slice(0, -1), future: [snap(g), ...g.future] }
}

export function redo(g: Game): Game {
  const next = g.future[0]
  if (!next || g.status !== 'playing') return g
  return { ...g, ...next, history: [...g.history, snap(g)], future: g.future.slice(1) }
}

/** Back to the starting givens; timer, mistakes and hints start again too. */
export function restart(g: Game): Game {
  return {
    ...g,
    values: g.puzzle.slice(),
    notes: new Array(81).fill(0),
    hinted: [],
    mistakes: 0,
    hintsLeft: HINTS_PER_GAME,
    elapsed: 0,
    status: 'playing',
    history: [],
    future: [],
  }
}

/** How many of each digit are correctly placed, for the keypad's remaining counts. */
export function digitCounts(g: Game): number[] {
  const counts = new Array(10).fill(0)
  g.values.forEach((v, i) => {
    if (v && v === g.solution[i]) counts[v]++
  })
  return counts
}
