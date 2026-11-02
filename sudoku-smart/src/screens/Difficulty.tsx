import { Check, RefreshCw } from 'lucide-react'
import { useRef, useState, type KeyboardEvent } from 'react'
import { Board } from '../components/Board'
import { Button } from '../components/ui'
import { generatePuzzle, type Difficulty, type Grid } from '../lib/sudoku'
import { DIFFICULTY_LABEL, formatTime, type Game, type Screen, type Stats } from '../lib/store'

const LEVELS: { id: Difficulty; blurb: string }[] = [
  {
    id: 'easy',
    blurb: 'More numbers already filled. Most empty cells can be found by checking a single row, column or box.',
  },
  {
    id: 'medium',
    blurb: 'Balanced difficulty. You will compare rows and columns together and use notes now and then.',
  },
  {
    id: 'hard',
    blurb: 'Fewer numbers provided. Expect to pencil in notes and work through several steps before a cell is certain.',
  },
]

type Puzzles = Record<Difficulty, { puzzle: Grid; solution: Grid }>

export function DifficultyScreen({
  stats,
  game,
  onStart,
  onNavigate,
}: {
  stats: Stats
  game: Game | null
  onStart: (d: Difficulty, pre: { puzzle: Grid; solution: Grid }) => void
  onNavigate: (s: Screen) => void
}) {
  const [choice, setChoice] = useState<Difficulty>(stats.lastDifficulty)
  // The previews are the real puzzles: the board you pick is the board you play.
  const [puzzles, setPuzzles] = useState<Puzzles>(() => ({
    easy: generatePuzzle('easy'),
    medium: generatePuzzle('medium'),
    hard: generatePuzzle('hard'),
  }))
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const onKey = (e: KeyboardEvent, k: number) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = (k + step + LEVELS.length) % LEVELS.length
    setChoice(LEVELS[next].id)
    refs.current[next]?.focus()
  }

  const inProgress = game && game.values.some((v, i) => v !== game.puzzle[i])

  return (
    <div className="mx-auto w-full max-w-[1132px] px-4 pt-6 pb-16 sm:px-6 lg:px-4 lg:pt-9">
      <h1 className="text-[1.375rem] font-semibold tracking-[-0.01em] text-ink lg:text-2xl">Choose a level</h1>
      <p className="mt-1 text-[0.9375rem] text-muted">Each board below is the actual puzzle you will play, with exactly one solution.</p>

      <div role="radiogroup" aria-label="Difficulty" className="mt-6 grid gap-4 md:grid-cols-3">
        {LEVELS.map((lvl, k) => {
          const on = choice === lvl.id
          const p = puzzles[lvl.id]
          const given = p.puzzle.filter(Boolean).length
          const best = stats.best[lvl.id]
          return (
            <button
              key={lvl.id}
              ref={(el) => {
                refs.current[k] = el
              }}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              onClick={() => setChoice(lvl.id)}
              onDoubleClick={() => onStart(lvl.id, p)}
              onKeyDown={(e) => onKey(e, k)}
              className={`group relative flex flex-col rounded-[20px] p-4 text-left outline-2 -outline-offset-2 transition-[background-color,outline-color] duration-150 sm:p-5 ${
                on ? 'bg-accent-soft outline-accent' : 'bg-panel outline-transparent hover:outline-control'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span>
                  <span className="block text-xl font-semibold text-ink">{DIFFICULTY_LABEL[lvl.id]}</span>
                  <span className="num mt-0.5 block text-sm text-muted">{given} of 81 numbers given</span>
                </span>
                <span
                  aria-hidden="true"
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors ${
                    on ? 'bg-accent text-surface' : 'ring-1 ring-control'
                  }`}
                >
                  {on && <Check size={14} strokeWidth={2.5} />}
                </span>
              </div>
              <span className="mt-3 block text-[0.9375rem] leading-6 text-ink md:min-h-[72px]">{lvl.blurb}</span>
              <div className="mt-4 grid grid-cols-[96px_1fr] items-end gap-4 md:block">
                <Board decorative values={p.puzzle} givens={p.puzzle} label={`${DIFFICULTY_LABEL[lvl.id]} puzzle preview`} className="md:mx-auto md:max-w-[260px]" />
                <span className="text-[0.8125rem] text-muted md:mt-3 md:block">
                  {best !== null ? (
                    <>
                      Your best: <span className="num text-ink">{formatTime(best)}</span> · {stats.won[lvl.id]} solved
                    </>
                  ) : (
                    'Not solved yet'
                  )}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          {inProgress
            ? 'Starting a new game replaces the puzzle in progress and resets your win streak.'
            : 'Tip: double-click a level to start it straight away.'}
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button
            onClick={() => setPuzzles((p) => ({ ...p, [choice]: generatePuzzle(choice) }))}
            aria-label={`Show a different ${DIFFICULTY_LABEL[choice]} puzzle`}
          >
            <RefreshCw size={15} strokeWidth={1.75} aria-hidden="true" />
            Another board
          </Button>
          {game && (
            <Button className="sm:hidden" onClick={() => onNavigate('game')}>
              Back to my puzzle
            </Button>
          )}
          <Button variant="primary" onClick={() => onStart(choice, puzzles[choice])}>
            Start {DIFFICULTY_LABEL[choice]} game
          </Button>
        </div>
      </div>
    </div>
  )
}
