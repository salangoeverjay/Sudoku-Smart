import type { Difficulty, Grid } from './sudoku'

export type Screen = 'home' | 'difficulty' | 'game' | 'howto' | 'settings'
export type Theme = 'light' | 'dark' | 'system'

export interface Settings {
  theme: Theme
  sound: boolean
  animations: boolean
  highlightMatching: boolean
  highlightPeers: boolean
  errorChecking: boolean
  autoRemoveNotes: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  sound: true,
  animations: true,
  highlightMatching: true,
  highlightPeers: true,
  errorChecking: true,
  autoRemoveNotes: true,
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
  started: { easy: 0, medium: 0, hard: 0 },
  won: { easy: 0, medium: 0, hard: 0 },
  best: { easy: null, medium: null, hard: null },
  streak: 0,
  bestStreak: 0,
  recent: [],
  lastDifficulty: 'easy',
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

export const loadSettings = () => read(KEY.settings, DEFAULT_SETTINGS)
export const saveSettings = (s: Settings) => write(KEY.settings, s)

export const loadStats = () => read(KEY.stats, EMPTY_STATS)
export const saveStats = (s: Stats) => write(KEY.stats, s)

export function loadGame(): Game | null {
  try {
    const raw = localStorage.getItem(KEY.game)
    if (!raw) return null
    const g = JSON.parse(raw) as Game
    return g.status === 'playing' && g.values?.length === 81 ? g : null
  } catch {
    return null
  }
}
// Undo history is not persisted: it can be long, and a resumed game starts a fresh history.
export const saveGame = (g: Game | null) =>
  write(KEY.game, g && g.status === 'playing' ? { ...g, history: [], future: [] } : null)

export const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }

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
  for (let i = 0; i < 81; i++) {
    if (g.puzzle[i]) continue
    total++
    if (g.values[i] && g.values[i] === g.solution[i]) filled++
  }
  return { filled, total, pct: total ? Math.round((filled / total) * 100) : 100 }
}
