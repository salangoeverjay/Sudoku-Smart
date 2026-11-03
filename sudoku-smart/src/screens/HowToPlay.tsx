import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Eraser, Lightbulb, Pause, PencilLine, Sparkles, Undo2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Board } from '../components/Board'
import { Button } from '../components/ui'
import { PRESENTATION } from '../lib/presentation'
import { play } from '../lib/sound'
import type { Screen, Settings } from '../lib/store'

// A well-known puzzle and its solution, used as the worked example.
const SOLUTION = [
  5, 3, 4, 6, 7, 8, 9, 1, 2, 6, 7, 2, 1, 9, 5, 3, 4, 8, 1, 9, 8, 3, 4, 2, 5, 6, 7, 8, 5, 9, 7, 6, 1, 4, 2, 3, 4, 2, 6, 8, 5,
  3, 7, 9, 1, 7, 1, 3, 9, 2, 4, 8, 5, 6, 9, 6, 1, 5, 3, 7, 2, 8, 4, 2, 8, 7, 4, 1, 9, 6, 3, 5, 3, 4, 5, 2, 8, 6, 1, 7, 9,
]
const PUZZLE = [
  5, 3, 0, 0, 7, 0, 0, 0, 0, 6, 0, 0, 1, 9, 5, 0, 0, 0, 0, 9, 8, 0, 0, 0, 0, 6, 0, 8, 0, 0, 0, 6, 0, 0, 0, 3, 4, 0, 0, 8, 0,
  3, 0, 0, 1, 7, 0, 0, 0, 2, 0, 0, 0, 6, 0, 6, 0, 0, 0, 0, 2, 8, 0, 0, 0, 0, 4, 1, 9, 0, 0, 5, 0, 0, 0, 0, 8, 0, 0, 7, 9,
]

const range = (n: number) => [...Array(n).keys()]
const ROW = range(9).map((c) => c) // row 1
const COL = range(9).map((r) => r * 9) // column 1
const BOX = [0, 1, 2, 9, 10, 11, 18, 19, 20] // top-left box

const STEPS = [
  {
    title: 'Fill the empty cells with numbers 1 through 9.',
    detail: 'The board starts with some numbers given. Your job is to fill every highlighted empty cell.',
    cells: PUZZLE.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0),
    fill: [] as number[],
  },
  {
    title: 'Each row must contain numbers 1–9 without repetition.',
    detail: 'Row 1 reads 5 3 4 6 7 8 9 1 2. Every digit appears once, none twice.',
    cells: ROW,
    fill: ROW,
  },
  {
    title: 'Each column must contain numbers 1–9 without repetition.',
    detail: 'Column 1 reads 5 6 1 8 4 7 9 2 3 from top to bottom. Again, each digit once.',
    cells: COL,
    fill: COL,
  },
  {
    title: 'Each 3×3 box must also contain numbers 1–9 without repetition.',
    detail: 'The thicker lines split the board into nine boxes. The top-left box holds 1 to 9 exactly once.',
    cells: BOX,
    fill: BOX,
  },
  {
    title: 'Complete the board correctly to win.',
    detail: 'When every row, column and box holds 1 to 9 once, the puzzle is solved. Each puzzle has one solution.',
    cells: [] as number[],
    fill: range(81),
  },
]

// The practice puzzle: 4×4 with 2×2 boxes, numbers 1–4.
const MINI_SOLUTION = [1, 2, 3, 4, 3, 4, 1, 2, 2, 1, 4, 3, 4, 3, 2, 1]
const MINI_GIVENS = [1, 0, 0, 4, 0, 4, 1, 0, 2, 0, 0, 3, 0, 3, 2, 0]

function miniClash(values: number[], i: number, d: number): string | null {
  const r = Math.floor(i / 4), c = i % 4
  const box = (k: number) => Math.floor(Math.floor(k / 4) / 2) * 2 + Math.floor((k % 4) / 2)
  for (let j = 0; j < 16; j++) {
    if (j === i || values[j] !== d) continue
    if (Math.floor(j / 4) === r) return `There is already a ${d} in this row.`
    if (j % 4 === c) return `There is already a ${d} in this column.`
    if (box(j) === box(i)) return `There is already a ${d} in this 2×2 box.`
  }
  return null
}

export function HowToPlay({ settings, onNavigate }: { settings: Settings; onNavigate: (s: Screen) => void }) {
  const [step, setStep] = useState(0)
  const s = STEPS[step]
  const exampleValues = useMemo(() => PUZZLE.map((v, i) => (s.fill.includes(i) ? SOLUTION[i] : v)), [s])

  const [mini, setMini] = useState(MINI_GIVENS)
  const [sel, setSel] = useState<number | null>(1)
  const [feedback, setFeedback] = useState<{ text: string; ok: boolean } | null>(null)
  const miniErrors = useMemo(() => new Set(mini.map((v, i) => (v && v !== MINI_SOLUTION[i] ? i : -1)).filter((i) => i >= 0)), [mini])
  const miniSolved = mini.every((v, i) => v === MINI_SOLUTION[i])

  const placeMini = (d: number) => {
    if (sel === null || MINI_GIVENS[sel] || miniSolved) return
    const next = mini.slice()
    next[sel] = d
    setMini(next)
    if (d === 0) {
      setFeedback(null)
      play('erase', settings.sound)
      return
    }
    if (d === MINI_SOLUTION[sel]) {
      const done = next.every((v, i) => v === MINI_SOLUTION[i])
      play(done ? 'win' : 'place', settings.sound)
      setFeedback({ text: done ? 'Solved. Every row, column and box holds 1 to 4 once.' : `Yes, ${d} fits here.`, ok: true })
      // Move on to the next empty cell, so the lesson keeps flowing.
      const after = next.findIndex((v, i) => i > sel && !v)
      const first = next.findIndex((v) => !v)
      if (!done) setSel(after !== -1 ? after : first !== -1 ? first : sel)
    } else {
      play('error', settings.sound)
      setFeedback({
        text: miniClash(next, sel, d) ?? `${d} does not clash yet, but another cell in this row needs it. Try a different number.`,
        ok: false,
      })
    }
  }

  const tools = [
    { icon: PencilLine, name: 'Notes', text: 'Pencil small candidate numbers into a cell while you think. Placing a number clears it from the notes around it.' },
    { icon: Lightbulb, name: 'Hint', text: 'Fills one correct number, preferring the cell that is easiest to deduce next. Three per puzzle.' },
    { icon: Undo2, name: 'Undo and redo', text: 'Step back through any move, including notes and erasing, then forward again.' },
    { icon: Eraser, name: 'Erase', text: 'Clears your number or notes from the selected cell. Given numbers cannot be erased.' },
    { icon: Pause, name: 'Pause', text: 'Stops the clock and covers the board. Leaving the tab pauses for you.' },
    { icon: Sparkles, name: 'Highlights', text: 'The selected row, column and box are tinted, and matching numbers stand out. Both can be turned off in Settings.' },
  ]

  return (
    <div className="mx-auto w-full max-w-[1132px] px-4 pt-6 pb-16 sm:px-6 lg:px-4 lg:pt-9">
      <h1 className="text-[1.375rem] font-semibold tracking-[-0.01em] text-ink lg:text-2xl">How to play</h1>
      <p className="mt-1 text-[0.9375rem] text-muted">Five rules, a practice board, and the tools that help. About two minutes.</p>

      {/* The walkthrough video: the whole game in under two minutes, narrated, with subtitles in the picture */}
      <section aria-labelledby="video-title" className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-12 lg:items-start lg:gap-4">
        <div className="lg:col-span-8">
          <video
            controls
            playsInline
            preload="none"
            poster={PRESENTATION.poster}
            aria-describedby="video-note"
            className="aspect-video w-full rounded-[20px] bg-panel ring-1 ring-border"
          >
            <source src={PRESENTATION.src} type="video/mp4" />
            <a href={PRESENTATION.src}>Download the walkthrough video</a>
          </video>
        </div>
        <div className="lg:col-span-4 lg:pl-4">
          <h2 id="video-title" className="text-lg font-semibold text-ink">
            Watch the walkthrough
          </h2>
          <p className="mt-1 text-[0.9375rem] leading-6 text-ink">
            Ever Jay Salango, BSIT 4E, plays a puzzle from start to finish: choosing a level, the rules, the tools, and the
            visual accessibility settings.
          </p>
          <p id="video-note" className="mt-2 text-sm text-muted">
            {PRESENTATION.duration} · narrated · subtitles are part of the picture
          </p>
          <details className="group mt-4 rounded-2xl bg-panel">
            <summary className="cursor-pointer rounded-2xl px-4 py-3 text-[0.9375rem] font-medium text-ink hover:bg-active/60">
              Read the transcript
            </summary>
            <div className="space-y-3 px-4 pb-4 text-sm leading-6 text-ink">
              {PRESENTATION.transcript.map((para, k) => (
                <p key={k}>{para}</p>
              ))}
            </div>
          </details>
        </div>
      </section>

      {/* The rules */}
      <section aria-labelledby="rules-title" className="mt-16 lg:mt-20 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-12 lg:gap-4">
        <div className="lg:col-span-5">
          <h2 id="rules-title" className="text-lg font-semibold text-ink">
            The rules
          </h2>
          <p className="mt-1 text-sm leading-5 text-muted">
            Shown on the 9×9 board of Easy, Medium and Hard. Beginner is 4×4 with numbers 1 to 4 and Starter is 6×6
            with 1 to 6; the rules are the same.
          </p>
          <ol className="mt-3 space-y-2">
            {STEPS.map((st, k) => {
              const on = k === step
              return (
                <li key={k}>
                  <button
                    type="button"
                    onClick={() => setStep(k)}
                    aria-current={on ? 'step' : undefined}
                    className={`flex w-full gap-3 rounded-2xl p-3.5 text-left transition-colors ${
                      on ? 'bg-accent-soft' : 'hover:bg-panel'
                    }`}
                  >
                    <span
                      className={`num flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                        on ? 'bg-accent text-surface' : 'bg-active text-muted'
                      }`}
                    >
                      {k + 1}
                    </span>
                    <span className="min-w-0 pt-0.5">
                      <span className={`block text-[0.9375rem] leading-6 ${on ? 'font-medium text-ink' : 'text-ink'}`}>{st.title}</span>
                      {on && <span className="mt-1 block text-sm leading-5 text-muted">{st.detail}</span>}
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => setStep((k) => Math.max(0, k - 1))} disabled={step === 0} aria-label="Previous rule">
              <ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />
              Back
            </Button>
            <Button variant="primary" onClick={() => setStep((k) => Math.min(STEPS.length - 1, k + 1))} disabled={step === STEPS.length - 1}>
              Next rule
              <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" />
            </Button>
          </div>
        </div>

        <figure data-ui className="rounded-[20px] bg-panel p-4 sm:p-6 lg:col-span-7">
          <div className="mx-auto max-w-[440px]">
            <Board
              values={exampleValues}
              givens={PUZZLE}
              spotlight={new Set(s.cells)}
              highlightMatching={false}
              label={`Example board, rule ${step + 1}`}
            />
          </div>
          <AnimatePresence mode="wait">
            <motion.figcaption
              key={step}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="mx-auto mt-4 max-w-[440px] text-sm leading-5 text-muted"
            >
              <span className="text-ink">Rule {step + 1} of 5.</span> {s.detail} Given numbers are dark; numbers filled in are blue.
            </motion.figcaption>
          </AnimatePresence>
        </figure>
      </section>

      {/* Practice */}
      <section aria-labelledby="try-title" className="mt-16 rounded-[20px] bg-panel p-4 sm:p-6 lg:mt-20">
        <div className="grid gap-6 md:grid-cols-[minmax(0,300px)_1fr] md:items-center md:gap-10">
          <div className="mx-auto w-full max-w-[300px]">
            <Board
              n={4}
              values={mini}
              givens={MINI_GIVENS}
              selected={sel}
              onSelect={setSel}
              errors={miniErrors}
              celebrate={miniSolved}
              label="Practice board, 4 by 4"
            />
          </div>
          <div>
            <h2 id="try-title" className="text-lg font-semibold text-ink">
              Try a small one
            </h2>
            <p className="mt-1 max-w-[52ch] text-[0.9375rem] leading-6 text-ink">
              Same rules on a 4×4 board: each row, column and 2×2 box holds 1 to 4 once. Select a cell, then pick a
              number.
            </p>
            <div className="mt-4 flex max-w-[360px] gap-2" role="group" aria-label="Practice numbers">
              {[1, 2, 3, 4].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => placeMini(d)}
                  disabled={miniSolved}
                  className="num h-14 flex-1 rounded-xl bg-surface text-2xl text-ink ring-1 ring-border transition-[background-color,transform] hover:bg-accent-soft active:scale-95 disabled:opacity-40"
                >
                  {d}
                </button>
              ))}
              <button
                type="button"
                onClick={() => placeMini(0)}
                disabled={miniSolved}
                aria-label="Erase"
                className="flex h-14 w-14 items-center justify-center rounded-xl text-muted transition-colors hover:bg-active disabled:opacity-40"
              >
                <Eraser size={20} strokeWidth={1.75} />
              </button>
            </div>
            <p
              aria-live="polite"
              className={`mt-4 min-h-6 text-[0.9375rem] ${feedback ? (feedback.ok ? 'text-positive' : 'text-negative') : 'text-muted'}`}
            >
              {feedback?.text ?? 'Start with the top row: it already has 1 and 4, so the gaps need 2 and 3.'}
            </p>
            {miniSolved && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="primary" onClick={() => onNavigate('difficulty')}>
                  Play a real puzzle
                </Button>
                <Button
                  onClick={() => {
                    setMini(MINI_GIVENS)
                    setSel(1)
                    setFeedback(null)
                  }}
                >
                  Try again
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Tools */}
      <section aria-labelledby="tools-title" className="mt-16 lg:mt-20">
        <h2 id="tools-title" className="text-lg font-semibold text-ink">
          Tools that help
        </h2>
        <dl className="mt-4 grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((t) => (
            <div key={t.name} className="flex gap-3">
              <t.icon size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-muted" aria-hidden="true" />
              <div>
                <dt className="text-[0.9375rem] font-medium text-ink">{t.name}</dt>
                <dd className="mt-1 text-sm leading-5 text-muted">{t.text}</dd>
              </div>
            </div>
          ))}
        </dl>
        <p className="mt-8 hidden text-sm text-muted lg:block">
          On a keyboard: arrow keys move, 1–9 place a number, Shift + number pencils a note, N toggles notes, H takes a
          hint, P pauses, Ctrl Z undoes and Ctrl Y redoes.
        </p>
      </section>
    </div>
  )
}
