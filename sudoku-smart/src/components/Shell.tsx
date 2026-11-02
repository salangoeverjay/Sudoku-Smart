import { AnimatePresence, motion } from 'motion/react'
import { BookOpen, Grid3x3, Home, Menu, Play, Settings as Cog, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { DIFFICULTY_LABEL, type Game, type Screen } from '../lib/store'
import { Logo, LogoMark } from './ui'

interface NavItem {
  id: string
  label: string
  icon: typeof Home
  screen: Screen
  hint?: string
  disabled?: boolean
}

const TITLES: Record<Screen, string> = {
  home: 'Home',
  difficulty: 'New game',
  game: 'Puzzle',
  howto: 'How to play',
  settings: 'Settings',
}

export function Shell({
  screen,
  game,
  onNavigate,
  children,
}: {
  screen: Screen
  game: Game | null
  onNavigate: (s: Screen) => void
  children: ReactNode
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  const items: NavItem[] = [
    { id: 'home', label: 'Home', icon: Home, screen: 'home' },
    {
      id: 'continue',
      label: 'Continue',
      icon: Play,
      screen: 'game',
      hint: game ? DIFFICULTY_LABEL[game.difficulty] : undefined,
      disabled: !game,
    },
    { id: 'new', label: 'New game', icon: Grid3x3, screen: 'difficulty' },
    { id: 'howto', label: 'How to play', icon: BookOpen, screen: 'howto' },
  ]

  const go = (s: Screen) => {
    setMenuOpen(false)
    onNavigate(s)
  }

  const navList = (big: boolean) => (
    <ul className={big ? 'space-y-1' : 'space-y-0.5'}>
      {items.map((it) => {
        const active = it.screen === screen
        const Icon = it.icon
        return (
          <li key={it.id}>
            <button
              type="button"
              disabled={it.disabled}
              aria-current={active ? 'page' : undefined}
              onClick={() => go(it.screen)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 text-left transition-colors disabled:cursor-not-allowed disabled:text-faint ${
                big ? 'h-12 text-base' : 'h-9 text-sm'
              } ${active ? 'bg-active font-medium text-ink' : 'text-muted hover:bg-active/60 hover:text-ink'}`}
            >
              <Icon size={big ? 18 : 16} strokeWidth={1.75} aria-hidden="true" />
              <span className="flex-1">{it.label}</span>
              {it.hint && <span className="text-xs text-faint">{it.hint}</span>}
              {it.disabled && it.id === 'continue' && <span className="text-xs">No game yet</span>}
            </button>
          </li>
        )
      })}
    </ul>
  )

  const settingsLink = (big: boolean) => (
    <button
      type="button"
      aria-current={screen === 'settings' ? 'page' : undefined}
      onClick={() => go('settings')}
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 text-left transition-colors ${
        big ? 'h-12 text-base' : 'h-9 text-sm'
      } ${screen === 'settings' ? 'bg-active font-medium text-ink' : 'text-muted hover:bg-active/60 hover:text-ink'}`}
    >
      <Cog size={big ? 18 : 16} strokeWidth={1.75} aria-hidden="true" />
      Settings
    </button>
  )

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      {/* Desktop sidebar on the page ground, split from the canvas by one hairline */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-border px-3 py-6 lg:flex">
        <button type="button" onClick={() => go('home')} className="mb-8 rounded-lg px-2 py-1 text-left" aria-label="Sudoku Smart, home">
          <Logo />
        </button>
        <nav aria-label="Main">{navList(false)}</nav>
        <div className="mt-auto">{settingsLink(false)}</div>
      </aside>

      {/* Phone and tablet top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-ground px-4 lg:hidden">
        <button type="button" onClick={() => go('home')} className="flex items-center gap-2.5 rounded-lg" aria-label="Sudoku Smart, home">
          <LogoMark size={26} />
          <span className="text-[15px] font-semibold text-ink">{screen === 'home' ? 'Sudoku Smart' : TITLES[screen]}</span>
        </button>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-active"
        >
          <Menu size={20} strokeWidth={1.75} />
        </button>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="fixed inset-0 z-50 flex flex-col bg-ground px-4 pb-8 lg:hidden"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.18 }}
          >
            <div className="flex h-14 items-center justify-between">
              <Logo />
              <button
                type="button"
                autoFocus
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-active"
              >
                <X size={20} strokeWidth={1.75} />
              </button>
            </div>
            <nav aria-label="Main" className="mt-4">{navList(true)}</nav>
            <div className="mt-auto">{settingsLink(true)}</div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="min-w-0">{children}</main>
    </div>
  )
}
