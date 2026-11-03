import { Check, RefreshCw } from 'lucide-react'
import { useRef, useState, type KeyboardEvent } from 'react'
import { Board } from '../components/Board'
import { Button } from '../components/ui'
import { DIFFICULTIES, generatePuzzle, sizeOf, type Difficulty, type Grid } from '../lib/sudoku'
import { DIFFICULTY_LABEL, SIZE_LABEL, formatTime, type Game, type Screen, type Stats } from '../lib/store'

const BLURB: Record<Difficulty, string> = {
  beginner: 'A 4×4 board with numbers 1 to 4 and four 2×2 boxes. Learn the rules in a minute.',
  starter: 'A 6×6 board with numbers 1 to 6; each box is 2 rows by 3 columns. A step towards the full game.',
  easy: 'The full 9×9 board with plenty of numbers given. Most cells follow from a single row, column or box.',
  medium: 'Fewer numbers given. Compare rows and columns together and use notes now and then.',
  hard: 'The fewest numbers. Expect to pencil in notes and work through several steps.',
}

// Two small boards teach the rules; the classic board then gets harder by giving fewer numbers.
const GROUPS: { title: string; note: string; levels: Difficulty[] }[] = [
  { title: 'Learn the rules', note: 'Smaller boards, the same rules.', levels: ['beginner', 'starter'] },
  { title: 'Classic 9×9', note: 'The full board; each level gives fewer numbers.', levels: ['easy', 'medium', 'hard'] },
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
  const [puzzles, setPuzzles] = useState<Puzzles>(
    () => Object.fromEntries(DIFFICULTIES.map((d) => [d, generatePuzzle(d)])) as Puzzles,
  )
  const refs = useRef<Partial<Record<Difficulty, HTMLButtonElement | null>>>({})

  // Arrow keys move through all five levels in order, across both groups.
  const onKey = (e: KeyboardEvent, d: Difficulty) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const k = DIFFICULTIES.indexOf(d)
    const next = DIFFICULTIES[(k + step + DIFFICULTIES.length) % DIFFICULTIES.length]
    setChoice(next)
    refs.current[next]?.focus()
  }

  const inProgress = game && game.values.some((v, i) => v !== game.puzzle[i])

  const card = (d: Difficulty, wide: boolean) => {
    const on = choice === d
    const p = puzzles[d]
    const given = p.puzzle.filter(Boolean).length
    const best = stats.best[d]
    return (
      <button
        key={d}
        ref={(el) => {
          refs.current[d] = el
        }}
        type="button"
        role="radio"
        aria-checked={on}
        tabIndex={on ? 0 : -1}
        onClick={() => setChoice(d)}
        onDoubleClick={() => onStart(d, p)}
        onKeyDown={(e) => onKey(e, d)}
        className={`group relative flex flex-col rounded-[20px] p-4 text-left outline-2 -outline-offset-2 transition-[background-color,outline-color] duration-150 sm:p-5 ${
          wide ? 'md:grid md:grid-cols-[minmax(0,1fr)_200px] md:items-start md:gap-5' : ''
        } ${on ? 'bg-accent-soft outline-accent' : 'bg-panel outline-transparent hover:outline-control'}`}
      >
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <span>
              <span className="block text-xl font-semibold text-ink">
                {DIFFICULTY_LABEL[d]} <span className="num font-normal text-muted">{SIZE_LABEL[d]}</span>
              </span>
              <span className="num mt-0.5 block text-sm text-muted">
                {given} of {p.puzzle.length} numbers given
              </span>
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
          <span className={`mt-3 block text-[0.9375rem] leading-6 text-ink ${wide ? '' : 'md:min-h-[72px]'}`}>{BLURB[d]}</span>
          {wide && <Best best={best} won={stats.won[d]} className="mt-3 hidden md:block" />}
        </div>
        <div className={`mt-4 grid grid-cols-[96px_1fr] items-end gap-4 md:block ${wide ? 'md:mt-0' : ''}`}>
          <Board
            decorative
            n={sizeOf(p.puzzle) as 4 | 6 | 9}
            values={p.puzzle}
            givens={p.puzzle}
            label={`${DIFFICULTY_LABEL[d]} puzzle preview`}
            className={wide ? 'md:max-w-[200px]' : 'md:mx-auto md:max-w-[240px]'}
          />
          <Best best={best} won={stats.won[d]} className={wide ? 'md:hidden' : 'md:mt-3 md:block'} />
        </div>
      </button>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[1132px] px-4 pt-6 sm:px-6 lg:px-4 lg:pt-9">
      <h1 className="text-[1.375rem] font-semibold tracking-[-0.01em] text-ink lg:text-2xl">Choose a level</h1>
      <p className="mt-1 text-[0.9375rem] text-muted">Each board below is the actual puzzle you will play, with exactly one solution.</p>

      <div role="radiogroup" aria-label="Level" className="mt-6 space-y-8">
        {GROUPS.map((g) => (
          <div key={g.title} role="group" aria-labelledby={`group-${g.levels[0]}`}>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 id={`group-${g.levels[0]}`} className="text-base font-semibold text-ink">
                {g.title}
              </h2>
              <p className="text-sm text-muted">{g.note}</p>
            </div>
            <div className={`mt-3 grid gap-4 ${g.levels.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
              {g.levels.map((d) => card(d, g.levels.length === 2))}
            </div>
          </div>
        ))}
      </div>

      {/* Stays at the bottom of the screen, so Start is always in reach on a long list of levels */}
      <div className="sticky bottom-0 z-10 -mx-4 mt-6 flex flex-col gap-3 border-t border-border bg-ground px-4 py-3 sm:-mx-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:-mx-4 lg:px-4">
        <p className={`text-sm text-muted ${inProgress ? '' : 'max-sm:hidden'}`}>
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
            Start {DIFFICULTY_LABEL[choice]} {SIZE_LABEL[choice]} game
          </Button>
        </div>
      </div>
    </div>
  )
}

function Best({ best, won, className }: { best: number | null; won: number; className: string }) {
  return (
    <span className={`text-[0.8125rem] text-muted ${className}`}>
      {best !== null ? (
        <>
          Your best: <span className="num text-ink">{formatTime(best)}</span> · {won} solved
        </>
      ) : (
        'Not solved yet'
      )}
    </span>
  )
}
