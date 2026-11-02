import { generatePuzzle, countSolutions, PEERS, type Difficulty } from '../src/lib/sudoku.ts'
const valid = (g: number[]) => g.every((v, i) => v >= 1 && v <= 9 && PEERS[i].every(j => g[j] !== v))
for (const d of ['easy', 'medium', 'hard'] as Difficulty[]) {
  const times: number[] = [], clues: number[] = []
  for (let k = 0; k < 30; k++) {
    const t = performance.now()
    const { puzzle, solution } = generatePuzzle(d)
    times.push(performance.now() - t)
    if (!valid(solution)) throw new Error('bad solution')
    if (puzzle.some((v, i) => v && v !== solution[i])) throw new Error('puzzle mismatch')
    if (countSolutions(puzzle, 3) !== 1) throw new Error('not unique')
    clues.push(puzzle.filter(Boolean).length)
  }
  console.log(d, 'clues', Math.min(...clues), '-', Math.max(...clues), '| ms max', Math.max(...times).toFixed(1), 'avg', (times.reduce((a,b)=>a+b)/times.length).toFixed(1))
}
console.log('all puzzles valid and unique')
