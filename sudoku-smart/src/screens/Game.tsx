import { motion } from 'motion/react'
import { Check, Eraser, Lightbulb, Pause, PencilLine, Play, Redo2, RotateCcw, Undo2, Volume2, VolumeX } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useA11y } from '../components/A11yProvider'
import { Board } from '../components/Board'
import { Dialog } from '../components/Dialog'
import { Button } from '../components/ui'
import {
  applyHint,
  digitCounts,
  eraseCell,
  isWrong,
  placeValue,
  redo,
  restart,
  toggleNote,
  undo,
  type MoveResult,
} from '../lib/game'
import { vibrate } from '../lib/haptics'
import { play } from '../lib/sound'
import { speak, stopSpeech } from '../lib/speech'
import { sizeOf, type Difficulty } from '../lib/sudoku'
import { DIFFICULTY_LABEL, boardLabel, formatTime, progressOf, type Game, type Screen, type Settings, type Stats } from '../lib/store'
import { Celebration } from './Celebration'

type Tone = 'info' | 'error' | 'hint'

/** "3:20" read aloud as "3 minutes 20 seconds". */
function spokenTime(total: number) {
  const m = Math.floor(total / 60)
  const sec = total % 60
  return [m && `${m} ${m === 1 ? 'minute' : 'minutes'}`, `${sec} ${sec === 1 ? 'second' : 'seconds'}`].filter(Boolean).join(' ')
}

export function GameScreen({
  game,
  setGame,
  settings,
  stats,
  onWin,
  onNewGame,
  onNavigate,
}: {
  game: Game
  setGame: (fn: (g: Game | null) => Game | null) => void
  settings: Settings
  stats: Stats
  onWin: (g: Game) => { best: boolean; first: boolean }
  onNewGame: (d: Difficulty) => void
  onNavigate: (s: Screen) => void
}) {
  const [selected, setSelected] = useState<number | null>(() => {
    const first = game.values.findIndex((v) => !v)
    return first === -1 ? null : first
  })
  const [notesMode, setNotesMode] = useState(false)
  const [paused, setPaused] = useState(false)
  const [message, setMessage] = useState<{ text: string; tone: Tone } | null>(null)
  const [confirmRestart, setConfirmRestart] = useState(false)
  const [won, setWon] = useState<{ best: boolean; first: boolean } | null>(null)
  // Short screen-reader announcements for moves the board's own labels cannot report.
  const [announce, setAnnounce] = useState('')
  const { a11y, motionOk, muted, setMuted } = useA11y()
  const playing = game.status === 'playing'
  // Board side: 4, 6 or 9, read from the puzzle itself.
  const n = sizeOf(game.puzzle)

  // Timer: counts while the puzzle is open, unpaused and the tab is visible.
  useEffect(() => {
    if (paused || !playing) return
    const id = setInterval(() => {
      if (document.visibilityState !== 'visible') return
      setGame((g) => (g && g.status === 'playing' ? { ...g, elapsed: g.elapsed + 1 } : g))
    }, 1000)
    return () => clearInterval(id)
  }, [paused, playing, setGame])

  // Leaving the tab pauses the game, so the clock is fair.
  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && playing && setPaused(true)
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  }, [playing])

  const apply = useCallback(
    (r: MoveResult) => {
      if (r.event === 'none') return
      // Keep the clock from the latest state; the move was computed from this render's game.
      setGame((prev) => ({ ...r.game, elapsed: prev?.elapsed ?? r.game.elapsed }))
      const cue = r.event === 'mistake' ? 'error' : r.event === 'won' ? 'win' : r.event === 'erased' ? 'erase' : r.event === 'note' ? 'note' : r.event === 'hint' ? 'hint' : 'place'
      play(cue, settings.sound)
      vibrate(cue, settings.vibration)
      const left = r.game.values.filter((v, i) => v !== r.game.solution[i]).length
      if (r.event === 'placed' && r.cell !== undefined) {
        const text = `${r.game.values[r.cell]} placed. ${left} ${left === 1 ? 'cell' : 'cells'} left.`
        setAnnounce(text)
        speak(r.message ?? text)
      } else if (r.event === 'erased') {
        setAnnounce('Cell cleared.')
        speak('Cleared.')
      } else if (r.event === 'note' && r.cell !== undefined) {
        const marks = notesText(r.game.notes[r.cell])
        setAnnounce(`Notes: ${marks || 'none'}.`)
        speak(`Notes ${marks || 'cleared'}.`)
      } else if (r.event === 'won') {
        speak(`Puzzle solved in ${spokenTime(r.game.elapsed)}, with ${r.game.mistakes} ${r.game.mistakes === 1 ? 'mistake' : 'mistakes'}.`)
      } else if (r.message) speak(r.message)
      if (r.event === 'mistake') setMessage({ text: r.message!, tone: 'error' })
      else if (r.event === 'hint') setMessage({ text: r.message!, tone: 'hint' })
      else if (r.message) setMessage({ text: r.message, tone: 'info' })
      else setMessage(null)
      if (r.cell !== undefined && r.event === 'hint') setSelected(r.cell)
      if (r.event === 'won') {
        const result = onWin(r.game)
        setSelected(null)
        // Let the board's wave finish before the dialog covers it.
        setTimeout(() => setWon(result), motionOk ? 900 : 0)
      }
    },
    [setGame, settings.sound, settings.vibration, motionOk, onWin],
  )

  const input = useCallback(
    (digit: number, asNote = notesMode) => {
      if (selected === null || paused) return
      apply(asNote ? toggleNote(game, selected, digit) : placeValue(game, selected, digit, settings))
    },
    [selected, paused, notesMode, game, settings, apply],
  )

  const erase = useCallback(() => {
    if (selected === null || paused) return
    if (game.hinted.includes(selected)) setMessage({ text: 'Numbers from hints stay on the board.', tone: 'info' })
    apply(eraseCell(game, selected))
  }, [selected, paused, game, apply])

  const hint = useCallback(() => {
    if (paused) return
    if (game.hintsLeft <= 0) {
      setMessage({ text: 'No hints left for this puzzle. Try notes: pencil in what each cell could be.', tone: 'info' })
      return
    }
    apply(applyHint(game, selected, settings))
  }, [paused, game, selected, settings, apply])

  const doUndo = useCallback(() => {
    if (paused || !game.history.length) return
    setGame((g) => (g ? undo(g) : g))
    play('tap', settings.sound)
    setMessage(null)
  }, [paused, game.history.length, setGame, settings.sound])

  const doRedo = useCallback(() => {
    if (paused || !game.future.length) return
    setGame((g) => (g ? redo(g) : g))
    play('tap', settings.sound)
  }, [paused, game.future.length, setGame, settings.sound])

  const togglePause = useCallback(() => {
    if (!playing) return
    speak(paused ? 'Resumed.' : 'Paused. The clock is stopped.')
    setPaused((p) => !p)
    play('tap', settings.sound)
  }, [playing, paused, settings.sound])

  // Spoken guidance reads the selected cell, after a short pause so fast arrowing only reads the
  // cell where the player stops. Changes to the cell's value are spoken by the move itself.
  const gameRef = useRef(game)
  useEffect(() => {
    gameRef.current = game
  })
  useEffect(() => {
    if (!a11y.speech || selected === null || paused) return
    const t = setTimeout(() => speak(cellText(gameRef.current, selected)), 220)
    return () => clearTimeout(t)
  }, [selected, a11y.speech, paused])

  // Keyboard: arrows move, digits place (Shift + digit pencils a note), N notes, H hint, P pause.
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {})
  useEffect(() => {
    keyRef.current = (e: KeyboardEvent) => {
      if (document.querySelector('[role="dialog"]')) return
      const t = e.target as HTMLElement
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) doRedo()
        else doUndo()
        return
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        doRedo()
        return
      }
      if (mod || e.altKey) return
      if (e.key === 'p' || e.key === 'P') return togglePause()
      if (paused) return
      const digit = /^(Digit|Numpad)([1-9])$/.exec(e.code)
      if (digit && Number(digit[2]) <= n) {
        e.preventDefault()
        return input(Number(digit[2]), e.shiftKey ? !notesMode : notesMode)
      }
      const move: Record<string, [number, number]> = {
        ArrowUp: [-1, 0],
        ArrowDown: [1, 0],
        ArrowLeft: [0, -1],
        ArrowRight: [0, 1],
      }
      if (move[e.key]) {
        e.preventDefault()
        const cur = selected ?? Math.floor((n * n) / 2)
        const r = (Math.floor(cur / n) + move[e.key][0] + n) % n
        const c = ((cur % n) + move[e.key][1] + n) % n
        setSelected(r * n + c)
        return
      }
      if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        e.preventDefault()
        return erase()
      }
      if (e.key === 'n' || e.key === 'N') {
        speak(notesMode ? 'Notes off.' : 'Notes on.')
        return setNotesMode((m) => !m)
      }
      if (e.key === 'h' || e.key === 'H') return hint()
      if (e.key === 'Escape') {
        stopSpeech()
        setSelected(null)
      }
    }
  })
  useEffect(() => {
    const h = (e: KeyboardEvent) => keyRef.current(e)
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const errors = useMemo(() => {
    const s = new Set<number>()
    if (settings.errorChecking) game.values.forEach((_, i) => isWrong(game, i) && s.add(i))
    return s
  }, [game, settings.errorChecking])

  const counts = useMemo(() => digitCounts(game), [game])
  const progress = progressOf(game)
  const label = DIFFICULTY_LABEL[game.difficulty]
  const guidance = notesMode
    ? 'Notes are on. Numbers you choose are pencilled in as reminders. Press N or the Notes button to switch back.'
    : selected === null
      ? 'Select a cell, then choose a number.'
      : game.puzzle[selected]
        ? 'This number was given at the start. Choose an empty cell to fill.'
        : 'Choose a number for the selected cell. Use Notes to pencil in options first.'

  const tools = [
    { id: 'undo', label: 'Undo', icon: Undo2, onClick: doUndo, disabled: !game.history.length, keys: 'Ctrl Z' },
    { id: 'redo', label: 'Redo', icon: Redo2, onClick: doRedo, disabled: !game.future.length, keys: 'Ctrl Y' },
    { id: 'erase', label: 'Erase', icon: Eraser, onClick: erase, disabled: false, keys: 'Delete' },
    { id: 'notes', label: notesMode ? 'Notes on' : 'Notes', icon: PencilLine, onClick: () => setNotesMode((m) => !m), disabled: false, pressed: notesMode, keys: 'N' },
    { id: 'hint', label: 'Hint', icon: Lightbulb, onClick: hint, disabled: false, badge: game.hintsLeft, keys: 'H' },
  ]

  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 pt-5 pb-10 sm:px-6 lg:px-10 lg:pt-9">
      <div className="grid gap-x-10 gap-y-3 lg:grid-cols-[minmax(0,1fr)_344px] lg:items-start lg:gap-y-4">
        {/* Title row */}
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 lg:col-span-2">
          <div className="min-w-0">
            <h1 className="text-[1.375rem] leading-tight font-semibold tracking-[-0.01em] text-ink lg:text-2xl">{label} puzzle</h1>
            <p className="mt-1 text-sm text-muted">
              {boardLabel(game.puzzle)} board · {progress.total - progress.filled} of {progress.total} cells left to fill
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="num text-[1.375rem] text-ink lg:text-2xl" aria-label={`Time ${formatTime(game.elapsed)}`} role="timer">
              {formatTime(game.elapsed)}
            </span>
            {a11y.speech && (
              <button
                type="button"
                onClick={() => {
                  stopSpeech()
                  setMuted(!muted)
                }}
                aria-pressed={muted}
                aria-label={muted ? 'Turn spoken guidance back on' : 'Mute spoken guidance'}
                title={muted ? 'Unmute voice' : 'Mute voice'}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-control bg-surface text-ink transition-colors hover:bg-panel active:scale-95"
              >
                {muted ? <VolumeX size={18} strokeWidth={1.75} /> : <Volume2 size={18} strokeWidth={1.75} />}
              </button>
            )}
            <button
              type="button"
              onClick={togglePause}
              disabled={!playing}
              aria-label={paused ? 'Resume game' : 'Pause game'}
              aria-keyshortcuts="P"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-control bg-surface text-ink transition-colors hover:bg-panel active:scale-95 disabled:opacity-50"
            >
              {paused ? <Play size={18} strokeWidth={1.75} /> : <Pause size={18} strokeWidth={1.75} />}
            </button>
          </div>
        </div>

        {/* Phone: one compact line of status so board, tools and keypad share the first screen */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm whitespace-nowrap lg:hidden" aria-hidden="true">
          <span className="text-muted">
            Mistakes <span className={`num ${game.mistakes ? 'text-negative' : 'text-ink'}`}>{game.mistakes}</span>
          </span>
          <span className="text-muted">
            Hints <span className="num text-ink">{game.hintsLeft}</span>
          </span>
          <span className="flex min-w-[8rem] flex-1 items-center gap-2">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-active">
              <span className="block h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${progress.pct}%` }} />
            </span>
            <span className="num text-ink">{progress.pct}%</span>
          </span>
        </div>

        {/* Board */}
        <div className="relative w-full max-w-[600px] justify-self-center lg:row-span-4 lg:justify-self-stretch">
          {/* Board zoom: the frame keeps the board's place in the layout; a zoomed board scrolls inside it */}
          <div
            className={a11y.boardZoom > 1 ? 'aspect-square overflow-auto overscroll-contain rounded-2xl' : undefined}
            role={a11y.boardZoom > 1 ? 'region' : undefined}
            aria-label={a11y.boardZoom > 1 ? `Board zoomed to ${a11y.boardZoom * 100}%, scroll to see every cell` : undefined}
          >
            <div style={a11y.boardZoom > 1 ? { width: `${a11y.boardZoom * 100}%` } : undefined}>
          <Board
            n={n as 4 | 6 | 9}
            values={game.values}
            givens={game.puzzle}
            notes={game.notes}
            selected={paused ? null : selected}
            onSelect={(i) => {
              setSelected(i)
              if (paused) setPaused(false)
            }}
            errors={errors}
            hinted={game.hinted}
            highlightPeers={settings.highlightPeers}
            highlightMatching={settings.highlightMatching}
            celebrate={game.status === 'won'}
            hidden={paused}
            label={`${label} Sudoku board`}
          />
            </div>
          </div>
          {paused && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-2xl bg-panel p-6 text-center">
              <p className="font-serif text-4xl text-ink">Paused</p>
              <p className="num text-sm text-muted">
                {formatTime(game.elapsed)} on the clock · {progress.pct}% solved
              </p>
              <Button variant="primary" onClick={togglePause} data-autofocus>
                <Play size={16} strokeWidth={2} aria-hidden="true" />
                Resume
              </Button>
            </div>
          )}
        </div>

        {/* Status: mistakes, hints, progress */}
        <section aria-label="Game status" className="rounded-[20px] bg-panel p-5 max-lg:sr-only">
          <dl className="grid grid-cols-3 divide-x divide-border">
            <div className="pr-3">
              <dt className="text-xs text-muted">Mistakes</dt>
              <dd className={`num mt-1 text-xl ${game.mistakes ? 'text-negative' : 'text-ink'}`}>{game.mistakes}</dd>
            </div>
            <div className="px-3">
              <dt className="text-xs text-muted">Hints left</dt>
              <dd className="num mt-1 text-xl text-ink">
                {game.hintsLeft}
                <span className="text-sm text-faint"> /3</span>
              </dd>
            </div>
            <div className="pl-3">
              <dt className="text-xs text-muted">Solved</dt>
              <dd className="num mt-1 text-xl text-ink">
                {progress.pct}
                <span className="text-sm text-faint">%</span>
              </dd>
            </div>
          </dl>
          <div
            className="mt-4 h-2 overflow-hidden rounded-full bg-active"
            role="progressbar"
            aria-label="Puzzle progress"
            aria-valuenow={progress.filled}
            aria-valuemin={0}
            aria-valuemax={progress.total}
          >
            <motion.div
              className="h-full rounded-full bg-accent"
              initial={false}
              animate={{ width: `${progress.pct}%` }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            />
          </div>
        </section>

        {/* Live message */}
        <p
          aria-live="polite"
          className={`min-h-10 text-sm leading-5 ${
            message?.tone === 'error' ? 'text-negative' : message?.tone === 'hint' ? 'text-accent' : 'text-muted'
          }`}
        >
          {message?.text ?? guidance}
        </p>
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {announce}
        </p>

        {/* Tools and keypad */}
        <div className="space-y-3">
          <div className="grid grid-cols-5 gap-1.5 big-text:grid-cols-3" role="toolbar" aria-label="Game tools">
            {tools.map((t) => {
              const Icon = t.icon
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={t.onClick}
                  disabled={t.disabled || paused || !playing}
                  aria-pressed={t.pressed}
                  aria-keyshortcuts={t.keys}
                  title={`${t.label} (${t.keys})`}
                  className={`relative flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-xs font-medium transition-[background-color,color,transform] duration-150 active:scale-95 disabled:opacity-40 ${
                    t.pressed ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-active hover:text-ink'
                  }`}
                >
                  <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
                  {t.label}
                  {t.badge !== undefined && (
                    <span className="num absolute top-1.5 right-[calc(50%-22px)] flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-accent px-1 text-[0.6875rem] font-semibold text-on-accent">
                      {t.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <div className={`grid gap-1 lg:gap-2 ${KEYPAD_COLS[n]}`} role="group" aria-label={notesMode ? 'Pencil a note' : 'Place a number'}>
            {Array.from({ length: n }, (_, k) => k + 1).map((d) => {
              const left = n - counts[d]
              const done = left <= 0
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => input(d)}
                  disabled={paused || !playing || (done && !notesMode)}
                  aria-label={`${notesMode ? 'Note' : 'Place'} ${d}, ${done ? 'all placed' : `${left} left`}`}
                  className={`flex min-h-14 flex-col items-center justify-center rounded-xl bg-surface py-1 text-ink ring-1 ring-border transition-[background-color,transform] duration-150 hover:bg-accent-soft active:scale-95 disabled:opacity-35 contrast-high:ring-2 lg:min-h-[4.5rem] lg:rounded-2xl ${
                    notesMode ? 'text-accent' : ''
                  }`}
                >
                  <span className={`num leading-none ${notesMode ? 'text-lg lg:text-xl' : 'text-2xl lg:text-[1.75rem]'}`}>{d}</span>
                  {done ? (
                    <Check size={12} strokeWidth={2.25} className="mt-1 text-positive" aria-hidden="true" />
                  ) : (
                    <span className="num mt-1 text-[0.6875rem] leading-none text-faint">{left}</span>
                  )}
                </button>
              )
            })}
          </div>

          <div className="flex items-center justify-between pt-1">
            <Button variant="ghost" className="-ml-3 min-h-10 px-3 text-sm" onClick={() => setConfirmRestart(true)} disabled={!playing}>
              <RotateCcw size={15} strokeWidth={1.75} aria-hidden="true" />
              Restart puzzle
            </Button>
            <Button variant="ghost" className="-mr-3 min-h-10 px-3 text-sm" onClick={() => onNavigate('difficulty')}>
              New game
            </Button>
          </div>
          <p className="hidden text-xs leading-5 text-faint lg:block">
            Keyboard: arrows to move, 1–{n} to place, Shift + number for a note, N notes, H hint, P pause.
          </p>
        </div>
      </div>

      <Dialog open={confirmRestart} onClose={() => setConfirmRestart(false)} labelledBy="restart-title">
        <h2 id="restart-title" className="text-xl font-semibold text-ink">
          Restart this puzzle?
        </h2>
        <p className="mt-2 text-[0.9375rem] leading-6 text-muted">
          Your numbers and notes are cleared and the clock goes back to 0:00. The given numbers stay the same.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button onClick={() => setConfirmRestart(false)} data-autofocus>
            Keep playing
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setGame((g) => (g ? restart(g) : g))
              setConfirmRestart(false)
              setPaused(false)
              setMessage(null)
            }}
          >
            Restart
          </Button>
        </div>
      </Dialog>

      <Dialog open={!!won} onClose={() => setWon(null)} labelledBy="win-title" wide>
        {motionOk && <Celebration />}
        <div className="relative">
          <h2 id="win-title" className="font-serif text-[2.75rem] leading-none text-ink">
            Solved.
          </h2>
          <p className="mt-3 text-[0.9375rem] leading-6 text-muted">
            {won?.first
              ? `Your first ${label} puzzle is done. That time is now your best.`
              : won?.best
                ? `A new best time for ${label}.`
                : `Your best ${label} time is ${formatTime(stats.best[game.difficulty] ?? game.elapsed)}.`}
          </p>
          <dl className="mt-6 grid grid-cols-3 divide-x divide-border rounded-2xl bg-panel py-4">
            <div className="px-4">
              <dt className="text-xs text-muted">Time</dt>
              <dd className="num mt-1 text-xl text-ink">{formatTime(game.elapsed)}</dd>
            </div>
            <div className="px-4">
              <dt className="text-xs text-muted">Mistakes</dt>
              <dd className="num mt-1 text-xl text-ink">{game.mistakes}</dd>
            </div>
            <div className="px-4">
              <dt className="text-xs text-muted">Hints used</dt>
              <dd className="num mt-1 text-xl text-ink">{3 - game.hintsLeft}</dd>
            </div>
          </dl>
          <div className="mt-6 flex flex-col gap-2">
            <Button variant="primary" onClick={() => onNewGame(game.difficulty)} data-autofocus>
              Play another {label} puzzle
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => onNavigate('difficulty')}>Change level</Button>
              <Button onClick={() => onNavigate('home')}>Home</Button>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  )
}

// Keypad columns for each board size: one row on a phone, a square-ish block beside the board on desktop,
// and fewer, wider keys on a phone when the text is set large.
const KEYPAD_COLS: Record<number, string> = {
  4: 'grid-cols-4 lg:grid-cols-2',
  6: 'grid-cols-6 max-lg:big-text:grid-cols-3 lg:grid-cols-3',
  9: 'grid-cols-9 max-lg:big-text:grid-cols-5 lg:grid-cols-3',
}

function notesText(mask: number) {
  const out: number[] = []
  for (let d = 1; d <= 9; d++) if (mask & (1 << d)) out.push(d)
  return out.join(', ')
}

/** What spoken guidance reads for a cell: where it is, what it holds, and whether it can change. */
function cellText(g: Game, i: number) {
  const n = sizeOf(g.puzzle)
  const where = `Row ${Math.floor(i / n) + 1}, column ${(i % n) + 1}`
  const v = g.values[i]
  if (g.puzzle[i]) return `${where}, ${v}, fixed.`
  if (v) return `${where}, ${v}${v !== g.solution[i] ? ', incorrect' : ''}.`
  const notes = notesText(g.notes[i])
  return `${where}, empty${notes ? `, notes ${notes}` : ''}.`
}
