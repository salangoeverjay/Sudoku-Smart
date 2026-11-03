import { generatePuzzle, countSolutions, peersOf, LEVELS, sizeOf, DIFFICULTIES } from '../src/lib/sudoku.ts'
const valid = (g: number[]) => { const n = sizeOf(g), P = peersOf(n); return g.every((v, i) => v >= 1 && v <= n && P[i].every((j) => g[j] !== v)) }
for (const d of DIFFICULTIES) {
  const { size } = LEVELS[d]
  const times: number[] = [], clues: number[] = []
  for (let k = 0; k < 30; k++) {
    const t = performance.now()
    const { puzzle, solution } = generatePuzzle(d)
    times.push(performance.now() - t)
    if (puzzle.length !== size * size || solution.length !== size * size) throw new Error(`${d}: wrong board size`)
    if (!valid(solution)) throw new Error('bad solution')
    if (puzzle.some((v, i) => v && v !== solution[i])) throw new Error('puzzle mismatch')
    if (countSolutions(puzzle, 3) !== 1) throw new Error('not unique')
    clues.push(puzzle.filter(Boolean).length)
  }
  console.log(`${d} ${size}x${size}: clues ${Math.min(...clues)}-${Math.max(...clues)} of ${size * size} | ms max ${Math.max(...times).toFixed(1)} avg ${(times.reduce((a, b) => a + b) / times.length).toFixed(1)}`)
}
console.log('all puzzles valid and unique')
