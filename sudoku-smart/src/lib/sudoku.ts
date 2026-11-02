// Sudoku engine: a bitmask solver, a solution counter and a generator that
// removes clues only while the puzzle keeps exactly one solution.

export type Grid = number[] // 81 cells, row-major, 0 = empty
export type Difficulty = 'easy' | 'medium' | 'hard'

const ALL = 0b1111111110 // bits 1..9

export const rowOf = (i: number) => Math.floor(i / 9)
export const colOf = (i: number) => i % 9
export const boxOf = (i: number) => Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3)

/** Indices of every cell that shares a row, column or box with `i` (excluding `i`). */
export const PEERS: number[][] = Array.from({ length: 81 }, (_, i) => {
  const out: number[] = []
  for (let j = 0; j < 81; j++) {
    if (j === i) continue
    if (rowOf(j) === rowOf(i) || colOf(j) === colOf(i) || boxOf(j) === boxOf(i)) out.push(j)
  }
  return out
})

function popcount(n: number) {
  let c = 0
  while (n) {
    n &= n - 1
    c++
  }
  return c
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Depth-first search with the most-constrained cell first.
 * Calls `onSolution` for each solution found; stops when it returns true.
 */
function search(start: Grid, onSolution: (g: Grid) => boolean, randomise = false): void {
  const g = start.slice()
  const rows = new Array(9).fill(0)
  const cols = new Array(9).fill(0)
  const boxes = new Array(9).fill(0)
  for (let i = 0; i < 81; i++) {
    const v = g[i]
    if (!v) continue
    const bit = 1 << v
    const r = rowOf(i), c = colOf(i), b = boxOf(i)
    if (rows[r] & bit || cols[c] & bit || boxes[b] & bit) return // contradiction: no solutions
    rows[r] |= bit
    cols[c] |= bit
    boxes[b] |= bit
  }

  const rec = (): boolean => {
    let best = -1
    let bestMask = 0
    let bestCount = 10
    for (let i = 0; i < 81; i++) {
      if (g[i]) continue
      const mask = ALL & ~(rows[rowOf(i)] | cols[colOf(i)] | boxes[boxOf(i)])
      const n = popcount(mask)
      if (n === 0) return false
      if (n < bestCount) {
        best = i
        bestMask = mask
        bestCount = n
        if (n === 1) break
      }
    }
    if (best === -1) return onSolution(g.slice())

    const r = rowOf(best), c = colOf(best), b = boxOf(best)
    let digits: number[] = []
    for (let d = 1; d <= 9; d++) if (bestMask & (1 << d)) digits.push(d)
    if (randomise) digits = shuffle(digits)
    for (const d of digits) {
      const bit = 1 << d
      g[best] = d
      rows[r] |= bit
      cols[c] |= bit
      boxes[b] |= bit
      const stop = rec()
      g[best] = 0
      rows[r] &= ~bit
      cols[c] &= ~bit
      boxes[b] &= ~bit
      if (stop) return true
    }
    return false
  }
  rec()
}

export function solve(grid: Grid): Grid | null {
  let found: Grid | null = null
  search(grid, (g) => {
    found = g
    return true
  })
  return found
}

export function countSolutions(grid: Grid, limit = 2): number {
  let n = 0
  search(grid, () => ++n >= limit)
  return n
}

export function generateSolved(): Grid {
  let out: Grid = []
  search(new Array(81).fill(0), (g) => {
    out = g
    return true
  }, true)
  return out
}

/** Givens left on the board for each level. Hard stops early if uniqueness forbids going lower. */
export const CLUES: Record<Difficulty, number> = { easy: 40, medium: 32, hard: 26 }

export function generatePuzzle(difficulty: Difficulty): { puzzle: Grid; solution: Grid } {
  // Some solved grids cannot lose as many clues; Hard keeps the sparsest of a few tries.
  const tries = difficulty === 'hard' ? 6 : 1
  let best = carve(difficulty)
  for (let t = 1; t < tries; t++) {
    const next = carve(difficulty)
    if (next.puzzle.filter(Boolean).length < best.puzzle.filter(Boolean).length) best = next
  }
  return best
}

function carve(difficulty: Difficulty): { puzzle: Grid; solution: Grid } {
  const solution = generateSolved()
  const puzzle = solution.slice()
  const target = CLUES[difficulty]
  let clues = 81
  // Remove in symmetric pairs (cell and its 180° twin) so the board looks balanced.
  for (const i of shuffle([...Array(41).keys()])) {
    if (clues <= target) break
    const twin = 80 - i
    const pair = i === twin ? [i] : [i, twin]
    const saved = pair.map((k) => puzzle[k])
    pair.forEach((k) => (puzzle[k] = 0))
    if (countSolutions(puzzle, 2) !== 1) {
      pair.forEach((k, n) => (puzzle[k] = saved[n]))
    } else {
      clues -= pair.length
    }
  }
  return { puzzle, solution }
}

/** Cells (other than `i`) whose value conflicts with `value` placed at `i`. */
export function conflictsAt(values: Grid, i: number, value: number): number[] {
  if (!value) return []
  return PEERS[i].filter((j) => values[j] === value)
}

/** Digits still possible at `i` given the values on the board. */
export function candidatesAt(values: Grid, i: number): number[] {
  const used = new Set(PEERS[i].map((j) => values[j]))
  return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => !used.has(d))
}

/** Plain-language reason why `value` at `i` is wrong. */
export function explainMistake(values: Grid, i: number, value: number): string {
  const r = rowOf(i), c = colOf(i), b = boxOf(i)
  const clash = conflictsAt(values, i, value)
  if (clash.some((j) => rowOf(j) === r)) return `${value} is already in row ${r + 1}.`
  if (clash.some((j) => colOf(j) === c)) return `${value} is already in column ${c + 1}.`
  if (clash.some((j) => boxOf(j) === b)) return `${value} is already in this 3×3 box.`
  return `${value} does not break a rule yet, but it is not the number this cell needs.`
}
