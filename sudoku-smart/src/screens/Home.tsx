import { BookOpen, ChevronRight, Grid3x3, Play, Settings as Cog } from 'lucide-react'
import { Board } from '../components/Board'
import { Button } from '../components/ui'
import { sizeOf, type Difficulty } from '../lib/sudoku'
import { DIFFICULTY_LABEL, SIZE_LABEL, formatTime, HINTS_PER_GAME, progressOf, type Game, type Screen, type Stats } from '../lib/store'

const LEVELS: Difficulty[] = ['easy', 'medium', 'hard']

function partOfDay(d: Date) {
  const h = d.getHours()
  return h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

function when(ts: number) {
  const d = new Date(ts)
  const days = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(ts).setHours(0, 0, 0, 0)) / 86400000)
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (days === 0) return `Today, ${time}`
  if (days === 1) return `Yesterday, ${time}`
  if (days < 7) return `${days} days ago`
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' })
}

export function Home({
  game,
  stats,
  onNavigate,
}: {
  game: Game | null
  stats: Stats
  onNavigate: (s: Screen) => void
}) {
  const now = new Date()
  const won = LEVELS.reduce((n, d) => n + stats.won[d], 0)
  const started = LEVELS.reduce((n, d) => n + stats.started[d], 0)
  const progress = game ? progressOf(game) : null
  const level = game?.difficulty ?? stats.lastDifficulty
  const best = stats.best[level]

  const greeting = game
    ? `${partOfDay(now)}. Your ${DIFFICULTY_LABEL[game.difficulty]} puzzle is ${progress!.pct}% solved.`
    : won
      ? `${partOfDay(now)}. ${won} ${won === 1 ? 'puzzle' : 'puzzles'} solved so far.`
      : `${partOfDay(now)}. Ready for your first puzzle?`

  const tiles = [
    { label: 'Puzzles solved', value: String(won), caption: started ? `${started} started in total` : 'None started yet' },
    {
      label: 'Win rate',
      value: started ? `${Math.round((won / started) * 100)}` : '—',
      unit: started ? '%' : '',
      caption: started ? `${won} of ${started} finished` : 'Shown after your first game',
    },
    { label: 'Current streak', value: String(stats.streak), caption: `Best streak ${stats.bestStreak}` },
    {
      label: `Best ${DIFFICULTY_LABEL[level]} time`,
      value: best !== null ? formatTime(best) : '—',
      caption: best !== null ? 'Your fastest solve' : `Solve ${level === 'easy' ? 'an' : 'a'} ${DIFFICULTY_LABEL[level]} puzzle to set it`,
    },
  ]

  const shortcuts = [
    { label: 'New game', note: 'Easy, Medium or Hard', icon: Grid3x3, to: 'difficulty' as Screen },
    { label: 'How to play', note: 'Video, rules, practice', icon: BookOpen, to: 'howto' as Screen },
    { label: 'Settings', note: 'Theme, sound, help', icon: Cog, to: 'settings' as Screen },
  ]

  const recent = stats.recent.slice(0, 3)

  return (
    <div className="mx-auto w-full max-w-[1132px] px-4 pt-7 pb-16 sm:px-6 lg:px-4 lg:pt-[72px]">
      <header>
        <h1 className="max-w-[22ch] font-serif text-[2.125rem] leading-[1.05] tracking-[-0.01em] text-ink sm:text-[2.75rem] lg:text-5xl">
          {greeting}
        </h1>
        <p className="mt-3 text-[0.9375rem] text-muted">
          {now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
          {stats.streak > 1 && ` · ${stats.streak} wins in a row`}
        </p>
      </header>

      <div className="mt-8 grid grid-cols-[repeat(2,minmax(0,1fr))] gap-4 lg:mt-[50px] lg:grid-cols-12">
        {/* Puzzle in progress, the screen's answer: where did I leave off? */}
        <section
          aria-labelledby="continue-title"
          className="col-span-2 rounded-[20px] bg-panel p-4 sm:p-5 lg:order-2 lg:col-span-9 big-text:lg:col-span-12"
        >
          <div className="grid gap-5 sm:grid-cols-[minmax(0,232px)_1fr] sm:items-center sm:gap-7">
            <button
              type="button"
              onClick={() => onNavigate(game ? 'game' : 'difficulty')}
              className="mx-auto w-full max-w-[232px] rounded-2xl transition-transform duration-150 active:scale-[0.98]"
              aria-label={game ? 'Open the puzzle in progress' : 'Start a new game'}
            >
              <Board
                n={(game ? sizeOf(game.puzzle) : 9) as 4 | 6 | 9}
                values={game?.values ?? new Array(81).fill(0)}
                givens={game?.puzzle ?? new Array(81).fill(0)}
                notes={game?.notes}
                errors={new Set()}
                decorative
                label={game ? 'Preview of your puzzle in progress' : 'Empty board'}
              />
            </button>
            <div className="min-w-0">
              <h2 id="continue-title" className="text-sm font-semibold text-ink">
                {game ? 'Puzzle in progress' : 'No puzzle in progress'}
              </h2>
              {game && progress ? (
                <>
                  <p className="mt-2 text-2xl text-ink">
                    {DIFFICULTY_LABEL[game.difficulty]} {SIZE_LABEL[game.difficulty]} · <span className="num">{progress.filled}</span>
                    <span className="text-muted"> of </span>
                    <span className="num">{progress.total}</span>
                    <span className="text-muted"> cells</span>
                  </p>
                  <div className="mt-3 h-2 max-w-[420px] overflow-hidden rounded-full bg-active">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${progress.pct}%` }} />
                  </div>
                  <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    <div className="flex gap-1.5">
                      <dt className="text-muted">Time</dt>
                      <dd className="num text-ink">{formatTime(game.elapsed)}</dd>
                    </div>
                    <div className="flex gap-1.5">
                      <dt className="text-muted">Mistakes</dt>
                      <dd className="num text-ink">{game.mistakes}</dd>
                    </div>
                    <div className="flex gap-1.5">
                      <dt className="text-muted">Hints left</dt>
                      <dd className="num text-ink">
                        {game.hintsLeft} of {HINTS_PER_GAME}
                      </dd>
                    </div>
                  </dl>
                </>
              ) : (
                <p className="mt-2 max-w-[46ch] text-[0.9375rem] leading-6 text-ink">
                  Pick a level and a fresh board is generated for you, checked to have exactly one solution. Your
                  progress saves as you play.
                </p>
              )}
              <div className="mt-5 flex flex-wrap gap-2">
                {game ? (
                  <>
                    <Button variant="primary" onClick={() => onNavigate('game')}>
                      <Play size={16} strokeWidth={2} aria-hidden="true" />
                      Continue game
                    </Button>
                    <Button onClick={() => onNavigate('difficulty')}>Start new game</Button>
                  </>
                ) : (
                  <>
                    <Button variant="primary" onClick={() => onNavigate('difficulty')}>
                      <Play size={16} strokeWidth={2} aria-hidden="true" />
                      Start game
                    </Button>
                    <Button onClick={() => onNavigate('howto')}>How to play</Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Shortcuts */}
        <nav aria-labelledby="more-title" className="col-span-2 rounded-[20px] bg-panel p-4 sm:p-5 lg:order-3 lg:col-span-3 big-text:lg:col-span-12">
          <h2 id="more-title" className="text-sm font-semibold text-ink">
            Play and learn
          </h2>
          <ul className="mt-3 space-y-2">
            {shortcuts.map((s) => (
              <li key={s.label}>
                <button
                  type="button"
                  onClick={() => onNavigate(s.to)}
                  className="group flex min-h-[3.9375rem] w-full items-center gap-3 rounded-[14px] bg-surface px-3.5 text-left ring-1 ring-border transition-colors hover:bg-accent-soft"
                >
                  <s.icon size={18} strokeWidth={1.75} className="shrink-0 text-muted" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.9375rem] font-medium text-ink">{s.label}</span>
                    <span className="block truncate text-[0.8125rem] text-muted big-text:whitespace-normal">{s.note}</span>
                  </span>
                  <ChevronRight size={16} className="text-faint transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Statistics */}
        <section aria-label="Your statistics" className="col-span-2 grid grid-cols-2 gap-4 lg:order-1 lg:col-span-12 lg:grid-cols-4 big-text:lg:grid-cols-2">
          {tiles.map((t) => (
            <div key={t.label} className="flex min-h-[8rem] flex-col rounded-[20px] bg-panel p-4">
              <p className="text-[0.8125rem] text-muted">{t.label}</p>
              <p className="num mt-2 text-[1.75rem] leading-none text-ink lg:text-[2rem]">
                {t.value}
                {t.unit && <span className="text-lg text-faint">{t.unit}</span>}
              </p>
              <p className="mt-auto pt-3 text-[0.8125rem] leading-5 text-muted">{t.caption}</p>
            </div>
          ))}
        </section>

        {/* Best times by level */}
        <section aria-labelledby="levels-title" className="col-span-2 min-w-0 rounded-[20px] bg-panel p-4 sm:p-5 lg:order-4 lg:col-span-6 big-text:lg:col-span-12">
          <h2 id="levels-title" className="text-sm font-semibold text-ink">
            By level
          </h2>
          <div className="mt-2 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="py-2 font-normal">Level</th>
                <th className="py-2 text-right font-normal max-sm:big-text:hidden">Board</th>
                <th className="py-2 text-right font-normal">Solved</th>
                <th className="py-2 text-right font-normal">Best time</th>
              </tr>
            </thead>
            <tbody>
              {LEVELS.map((d) => (
                <tr key={d} className="border-t border-rule">
                  <td className="h-12 text-[0.9375rem] text-ink">{DIFFICULTY_LABEL[d]}</td>
                  <td className="num text-right text-muted max-sm:big-text:hidden">{SIZE_LABEL[d]}</td>
                  <td className="num text-right text-ink">{stats.won[d]}</td>
                  <td className={`num text-right ${stats.best[d] !== null ? 'text-ink' : 'text-faint'}`}>
                    {stats.best[d] !== null ? formatTime(stats.best[d]!) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </section>

        {/* Recent games */}
        <section aria-labelledby="recent-title" className="col-span-2 flex min-w-0 flex-col rounded-[20px] bg-panel p-4 sm:p-5 lg:order-5 lg:col-span-6 big-text:lg:col-span-12">
          <div className="flex items-baseline justify-between">
            <h2 id="recent-title" className="text-sm font-semibold text-ink">
              Recent wins
            </h2>
            {stats.recent.length > 0 && <span className="num text-xs text-muted">{stats.recent.length} recorded</span>}
          </div>
          {recent.length ? (
            <ul className="mt-2">
              {recent.map((r) => (
                <li key={r.id} className="flex min-h-[3.25rem] items-center justify-between gap-4 border-t border-rule first:border-t-0">
                  <span className="min-w-0">
                    <span className="block text-[0.9375rem] text-ink">
                      {DIFFICULTY_LABEL[r.difficulty]} {SIZE_LABEL[r.difficulty]} in <span className="num">{formatTime(r.seconds)}</span>
                    </span>
                    <span className="block text-[0.8125rem] text-muted">
                      {r.mistakes} {r.mistakes === 1 ? 'mistake' : 'mistakes'} · {r.hints} {r.hints === 1 ? 'hint' : 'hints'}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-[0.8125rem] text-muted">{when(r.finishedAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-3 flex flex-1 flex-col items-start justify-center gap-3 rounded-xl border border-dashed border-control px-4 py-4">
              <p className="text-sm leading-5 text-muted">
                No puzzles solved yet. Each one you finish is listed here with its time, mistakes and hints.
              </p>
              <Button className="h-10 px-4 text-sm" onClick={() => onNavigate('difficulty')}>
                Choose a level
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
