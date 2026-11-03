import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { A11yProvider } from './components/A11yProvider'
import { Shell } from './components/Shell'
import { newGame } from './lib/game'
import type { Difficulty, Grid } from './lib/sudoku'
import {
  EMPTY_STATS,
  loadGame,
  loadSettings,
  loadStats,
  saveGame,
  saveSettings,
  saveStats,
  type Game,
  type Screen,
} from './lib/store'
import { DifficultyScreen } from './screens/Difficulty'
import { GameScreen } from './screens/Game'
import { Home } from './screens/Home'
import { HowToPlay } from './screens/HowToPlay'
import { SettingsScreen } from './screens/SettingsScreen'

const RECENT_CAP = 20
const SCREENS: Screen[] = ['home', 'difficulty', 'game', 'howto', 'settings']

// Screens live in the hash (#/settings), so Back works and each screen has its own address.
function screenFromHash(): Screen {
  const id = location.hash.replace(/^#\/?/, '') as Screen
  return SCREENS.includes(id) ? id : 'home'
}

export default function App() {
  const [settings, setSettings] = useState(loadSettings)
  const [stats, setStats] = useState(loadStats)
  const [game, setGameState] = useState<Game | null>(loadGame)
  const [screen, setScreen] = useState<Screen>(screenFromHash)

  useEffect(() => saveSettings(settings), [settings])
  useEffect(() => saveStats(stats), [stats])
  useEffect(() => saveGame(game), [game])

  // #/new/beginner (or starter, easy, medium, hard) opens a fresh game at that level straight from a link.
  const startRef = useRef<(d: Difficulty) => void>(() => {})
  useEffect(() => {
    const onHash = () => {
      const deep = /^#\/new\/(beginner|starter|easy|medium|hard)$/.exec(location.hash)
      if (deep) {
        history.replaceState(null, '', location.pathname + location.search + '#/game')
        startRef.current(deep[1] as Difficulty)
        return
      }
      setScreen(screenFromHash())
      window.scrollTo({ top: 0 })
    }
    const first = setTimeout(onHash) // after startRef is wired up below
    window.addEventListener('hashchange', onHash)
    return () => {
      clearTimeout(first)
      window.removeEventListener('hashchange', onHash)
    }
  }, [])

  const navigate = useCallback((s: Screen) => {
    const hash = s === 'home' ? '' : `#/${s}`
    if (location.hash !== hash) {
      if (hash) history.pushState(null, '', hash)
      else history.pushState(null, '', location.pathname + location.search)
    }
    setScreen(s)
    window.scrollTo({ top: 0 })
  }, [])

  const setGame = useCallback((fn: (g: Game | null) => Game | null) => setGameState(fn), [])

  const startGame = useCallback(
    (d: Difficulty, pre?: { puzzle: Grid; solution: Grid }) => {
      // Abandoning a puzzle that has moves on it ends the win streak.
      const abandoned = !!game && game.status === 'playing' && game.values.some((v, i) => v !== game.puzzle[i])
      setStats((s) => ({
        ...s,
        started: { ...s.started, [d]: s.started[d] + 1 },
        lastDifficulty: d,
        streak: abandoned ? 0 : s.streak,
      }))
      setGameState(newGame(d, pre))
      navigate('game')
    },
    [game, navigate],
  )

  useEffect(() => {
    startRef.current = (d) => startGame(d)
  })

  const onWin = useCallback(
    (g: Game) => {
      const prev = stats.best[g.difficulty]
      const best = prev === null || g.elapsed < prev
      setStats((s) => {
        const streak = s.streak + 1
        return {
          ...s,
          won: { ...s.won, [g.difficulty]: s.won[g.difficulty] + 1 },
          best: { ...s.best, [g.difficulty]: best ? g.elapsed : s.best[g.difficulty] },
          streak,
          bestStreak: Math.max(s.bestStreak, streak),
          recent: [
            {
              id: g.id,
              difficulty: g.difficulty,
              seconds: g.elapsed,
              mistakes: g.mistakes,
              hints: g.hinted.length,
              finishedAt: Date.now(),
              size: Math.round(Math.sqrt(g.puzzle.length)),
            },
            ...s.recent,
          ].slice(0, RECENT_CAP),
        }
      })
      return { best: best && prev !== null, first: prev === null }
    },
    [stats.best],
  )

  // A finished game stays on screen for its dialog but is no longer "in progress".
  const activeGame = game && game.status === 'playing' ? game : null

  let view
  if (screen === 'game' && game) {
    view = (
      <GameScreen
        key={game.id}
        game={game}
        setGame={setGame}
        settings={settings}
        stats={stats}
        onWin={onWin}
        onNewGame={(d) => startGame(d)}
        onNavigate={navigate}
      />
    )
  } else if (screen === 'difficulty' || (screen === 'game' && !game)) {
    view = <DifficultyScreen stats={stats} game={activeGame} onStart={startGame} onNavigate={navigate} />
  } else if (screen === 'howto') {
    view = <HowToPlay settings={settings} onNavigate={navigate} />
  } else if (screen === 'settings') {
    view = <SettingsScreen settings={settings} onChange={setSettings} onClearStats={() => setStats(EMPTY_STATS)} />
  } else {
    view = <Home game={activeGame} stats={stats} onNavigate={navigate} />
  }

  return (
    <A11yProvider a11y={settings.a11y} theme={settings.theme}>
      {/* Reduce Motion stops every animation; otherwise the device's reduced-motion setting is followed. */}
      <MotionConfig reducedMotion={settings.a11y.reduceMotion ? 'always' : 'user'}>
        <Shell screen={screen} game={activeGame} onNavigate={navigate}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={screen}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: settings.a11y.reduceMotion ? 0 : 0.14 }}
            >
              {view}
            </motion.div>
          </AnimatePresence>
        </Shell>
      </MotionConfig>
    </A11yProvider>
  )
}
