import { DEFAULT_A11Y, normaliseA11y, type A11y } from './a11y'
import { DIFFICULTIES, sizeOf, type Difficulty, type Grid } from './sudoku'

export type Screen = 'home' | 'difficulty' | 'game' | 'howto' | 'settings'
export type Theme = 'light' | 'dark' | 'system'

export interface Settings {
  theme: Theme
  sound: boolean
  vibration: boolean
  highlightMatching: boolean
  highlightPeers: boolean
  errorChecking: boolean
  autoRemoveNotes: boolean
  a11y: A11y
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  sound: true,
  vibration: true,
  highlightMatching: true,
  highlightPeers: true,
  errorChecking: true,
  autoRemoveNotes: true,
  a11y: DEFAULT_A11Y,
}

export interface Snapshot {
  values: Grid
  notes: number[] // bitmask of pencil marks per cell (bit d = digit d)
}

export interface Game {
  id: string
  difficulty: Difficulty
  puzzle: Grid
  solution: Grid
  values: Grid
  notes: number[]
  hinted: number[] // cells filled by a hint
  mistakes: number
  hintsLeft: number
  elapsed: number // seconds
  status: 'playing' | 'won'
  startedAt: number
  history: Snapshot[]
  future: Snapshot[]
}

export interface Result {
  id: string
  difficulty: Difficulty
  seconds: number
  mistakes: number
  hints: number
  finishedAt: number
  /** Board side the win was played on (wins recorded before sizes existed leave it out). */
  size?: number
}

export interface Stats {
  started: Record<Difficulty, number>
  won: Record<Difficulty, number>
  best: Record<Difficulty, number | null> // seconds
  streak: number
  bestStreak: number
  recent: Result[] // newest first, capped
  lastDifficulty: Difficulty
}

export const EMPTY_STATS: Stats = {
  started: { beginner: 0, starter: 0, easy: 0, medium: 0, hard: 0 },
  won: { beginner: 0, starter: 0, easy: 0, medium: 0, hard: 0 },
  best: { beginner: null, starter: null, easy: null, medium: null, hard: null },
  streak: 0,
  bestStreak: 0,
  recent: [],
  lastDifficulty: 'beginner',
}

export const HINTS_PER_GAME = 3

const KEY = {
  settings: 'sudoku-smart:settings',
  game: 'sudoku-smart:game',
  stats: 'sudoku-smart:stats',
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full or blocked (private mode): the app keeps working in memory.
  }
}

export function loadSettings(): Settings {
  const saved = read<Partial<Settings> & { animations?: boolean }>(KEY.settings, {})
  const { animations, ...rest } = saved
  const a11y = normaliseA11y(saved.a11y)
  // Earlier versions had an "Animations" switch; having turned it off carries over as Reduce Motion.
  if (!saved.a11y && animations === false) a11y.reduceMotion = true
  return { ...DEFAULT_SETTINGS, ...rest, a11y }
}
export const saveSettings = (s: Settings) => write(KEY.settings, s)

// Stats saved before a level existed get zeros for it, so every level always has a count.
export function loadStats(): Stats {
  const s = read(KEY.stats, EMPTY_STATS)
  return {
    ...s,
    started: { ...EMPTY_STATS.started, ...s.started },
    won: { ...EMPTY_STATS.won, ...s.won },
    best: { ...EMPTY_STATS.best, ...s.best },
    lastDifficulty: DIFFICULTIES.includes(s.lastDifficulty) ? s.lastDifficulty : 'beginner',
  }
}
export const saveStats = (s: Stats) => write(KEY.stats, s)

export function loadGame(): Game | null {
  try {
    const raw = localStorage.getItem(KEY.game)
    if (!raw) return null
    const g = JSON.parse(raw) as Game
    // A board of 16, 36 or 81 cells: 4×4, 6×6 or 9×9 (games saved before the sizes existed are 9×9).
    return g.status === 'playing' && [16, 36, 81].includes(g.values?.length) && g.puzzle?.length === g.values.length ? g : null
  } catch {
    return null
  }
}
// Undo history is not persisted: it can be long, and a resumed game starts a fresh history.
export const saveGame = (g: Game | null) =>
  write(KEY.game, g && g.status === 'playing' ? { ...g, history: [], future: [] } : null)

export const DIFFICULTY_LABEL: Record<Difficulty, string> = { beginner: 'Beginner', starter: 'Starter', easy: 'Easy', medium: 'Medium', hard: 'Hard' }
/** The board each level plays on. */
export const SIZE_LABEL: Record<Difficulty, string> = { beginner: '4×4', starter: '6×6', easy: '9×9', medium: '9×9', hard: '9×9' }
/** A board's size as shown, read from the grid itself (a saved game keeps the size it was played on). */
export const boardLabel = (g: Grid) => `${sizeOf(g)}×${sizeOf(g)}`

export function formatTime(total: number): string {
  const s = Math.max(0, Math.floor(total))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = h ? String(m).padStart(2, '0') : String(m)
  return `${h ? h + ':' : ''}${mm}:${String(sec).padStart(2, '0')}`
}

export function progressOf(g: Game): { filled: number; total: number; pct: number } {
  let total = 0
  let filled = 0
  for (let i = 0; i < g.puzzle.length; i++) {
    if (g.puzzle[i]) continue
    total++
    if (g.values[i] && g.values[i] === g.solution[i]) filled++
  }
  return { filled, total, pct: total ? Math.round((filled / total) * 100) : 100 }
}
