// Sudoku engine for 4×4, 6×6 and 9×9 boards: a bitmask solver, a solution counter and a generator
// that removes clues only while the puzzle keeps exactly one solution.
// A grid is row-major, 0 = empty; its side length comes from its own length (16, 36 or 81 cells).

export type Grid = number[]
export type Difficulty = 'beginner' | 'starter' | 'easy' | 'medium' | 'hard'

/** Every level, gentlest first. */
export const DIFFICULTIES: Difficulty[] = ['beginner', 'starter', 'easy', 'medium', 'hard']

/** A board shape: side length, and the height and width of one box. */
export interface Shape {
  n: number
  bh: number
  bw: number
}

const SHAPES: Record<number, Shape> = {
  4: { n: 4, bh: 2, bw: 2 },
  6: { n: 6, bh: 2, bw: 3 },
  9: { n: 9, bh: 3, bw: 3 },
}

/**
 * Two small boards teach the rules, then three 9×9 levels get harder by giving fewer numbers.
 * `clues` is how many numbers the generator aims to leave.
 */
export const LEVELS: Record<Difficulty, { size: 4 | 6 | 9; clues: number }> = {
  beginner: { size: 4, clues: 8 },
  starter: { size: 6, clues: 16 },
  easy: { size: 9, clues: 40 },
  medium: { size: 9, clues: 32 },
  hard: { size: 9, clues: 26 },
}

export const shapeOf = (size: number): Shape => SHAPES[size] ?? SHAPES[9]
export const sizeOf = (g: Grid) => Math.round(Math.sqrt(g.length))

export const rowOf = (i: number, n: number) => Math.floor(i / n)
export const colOf = (i: number, n: number) => i % n
export const boxOf = (i: number, s: Shape) => Math.floor(rowOf(i, s.n) / s.bh) * (s.n / s.bw) + Math.floor(colOf(i, s.n) / s.bw)

const peerCache = new Map<number, number[][]>()
/** For each cell, every other cell that shares its row, column or box. */
export function peersOf(size: number): number[][] {
  let p = peerCache.get(size)
  if (!p) {
    const s = shapeOf(size)
    const N = size * size
    p = Array.from({ length: N }, (_, i) => {
      const out: number[] = []
      for (let j = 0; j < N; j++) {
        if (j === i) continue
        if (rowOf(j, size) === rowOf(i, size) || colOf(j, size) === colOf(i, size) || boxOf(j, s) === boxOf(i, s)) out.push(j)
      }
      return out
    })
    peerCache.set(size, p)
  }
  return p
}

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
  const n = sizeOf(start)
  const s = shapeOf(n)
  const N = n * n
  const ALL = ((1 << (n + 1)) - 1) & ~1 // bits 1..n
  const g = start.slice()
  const rows = new Array(n).fill(0)
  const cols = new Array(n).fill(0)
  const boxes = new Array(n).fill(0)
  const R = Array.from({ length: N }, (_, i) => rowOf(i, n))
  const C = Array.from({ length: N }, (_, i) => colOf(i, n))
  const B = Array.from({ length: N }, (_, i) => boxOf(i, s))
  for (let i = 0; i < N; i++) {
    const v = g[i]
    if (!v) continue
    const bit = 1 << v
    if (rows[R[i]] & bit || cols[C[i]] & bit || boxes[B[i]] & bit) return // contradiction: no solutions
    rows[R[i]] |= bit
    cols[C[i]] |= bit
    boxes[B[i]] |= bit
  }

  const rec = (): boolean => {
    let best = -1
    let bestMask = 0
    let bestCount = n + 1
    for (let i = 0; i < N; i++) {
      if (g[i]) continue
      const mask = ALL & ~(rows[R[i]] | cols[C[i]] | boxes[B[i]])
      const c = popcount(mask)
      if (c === 0) return false
      if (c < bestCount) {
        best = i
        bestMask = mask
        bestCount = c
        if (c === 1) break
      }
    }
    if (best === -1) return onSolution(g.slice())

    const r = R[best], c = C[best], b = B[best]
    let digits: number[] = []
    for (let d = 1; d <= n; d++) if (bestMask & (1 << d)) digits.push(d)
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

export function generateSolved(size: number = 9): Grid {
  let out: Grid = []
  search(new Array(size * size).fill(0), (g) => {
    out = g
    return true
  }, true)
  return out
}

export function generatePuzzle(difficulty: Difficulty): { puzzle: Grid; solution: Grid } {
  // Some solved grids cannot lose as many clues; the 9×9 level keeps the sparsest of a few tries.
  const tries = difficulty === 'hard' ? 6 : 3
  let best = carve(difficulty)
  for (let t = 1; t < tries; t++) {
    const next = carve(difficulty)
    if (next.puzzle.filter(Boolean).length < best.puzzle.filter(Boolean).length) best = next
  }
  return best
}

function carve(difficulty: Difficulty): { puzzle: Grid; solution: Grid } {
  const { size, clues: target } = LEVELS[difficulty]
  const N = size * size
  const solution = generateSolved(size)
  const puzzle = solution.slice()
  let clues = N
  // Remove in symmetric pairs (cell and its 180° twin) so the board looks balanced.
  for (const i of shuffle([...Array(Math.ceil(N / 2)).keys()])) {
    if (clues <= target) break
    const twin = N - 1 - i
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
  return peersOf(sizeOf(values))[i].filter((j) => values[j] === value)
}

/** Digits still possible at `i` given the values on the board. */
export function candidatesAt(values: Grid, i: number): number[] {
  const n = sizeOf(values)
  const used = new Set(peersOf(n)[i].map((j) => values[j]))
  return Array.from({ length: n }, (_, k) => k + 1).filter((d) => !used.has(d))
}

/** Plain-language reason why `value` at `i` is wrong. */
export function explainMistake(values: Grid, i: number, value: number): string {
  const n = sizeOf(values)
  const s = shapeOf(n)
  const r = rowOf(i, n), c = colOf(i, n), b = boxOf(i, s)
  const clash = conflictsAt(values, i, value)
  if (clash.some((j) => rowOf(j, n) === r)) return `${value} is already in row ${r + 1}.`
  if (clash.some((j) => colOf(j, n) === c)) return `${value} is already in column ${c + 1}.`
  if (clash.some((j) => boxOf(j, s) === b)) return `${value} is already in this ${s.bh}×${s.bw} box.`
  return `${value} does not break a rule yet, but it is not the number this cell needs.`
}
