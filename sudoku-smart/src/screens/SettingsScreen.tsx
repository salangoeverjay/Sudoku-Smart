import { AnimatePresence, motion } from 'motion/react'
import { Check, Monitor, Moon, Sun } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Dialog } from '../components/Dialog'
import { Button, SwitchRow } from '../components/ui'
import { AccessibilityHeading, AccessibilityPreview, VisualAccessibility } from '../components/VisualAccessibility'
import { DEFAULT_A11Y } from '../lib/a11y'
import { canVibrate, vibrate } from '../lib/haptics'
import { DEFAULT_SETTINGS, type Settings, type Theme } from '../lib/store'

function Section({
  title,
  heading,
  description,
  aside,
  bare = false,
  children,
}: {
  title: string
  heading?: ReactNode
  description: string
  aside?: ReactNode
  /** The children bring their own panel. */
  bare?: boolean
  children: ReactNode
}) {
  return (
    <section
      aria-label={title}
      className="grid grid-cols-[minmax(0,1fr)] gap-4 border-t border-rule py-8 first:border-t-0 first:pt-0 md:grid-cols-[minmax(0,360px)_minmax(0,1fr)] md:gap-10 big-text:md:grid-cols-1"
    >
      {/* The label column stays in view beside a tall panel, so its preview can be watched while switching */}
      <div className="md:pt-2">
        <div className="md:sticky md:top-6">
          {heading ?? <h2 className="text-base font-medium text-ink">{title}</h2>}
          <p className="mt-1 max-w-[40ch] text-sm leading-5 text-muted">{description}</p>
          {aside}
        </div>
      </div>
      {bare ? children : <div className="rounded-2xl bg-panel p-2">{children}</div>}
    </section>
  )
}

export function SettingsScreen({
  settings,
  onChange,
  onClearStats,
}: {
  settings: Settings
  onChange: (s: Settings) => void
  onClearStats: () => void
}) {
  const [saved, setSaved] = useState(0)
  const [confirm, setConfirm] = useState<'prefs' | 'stats' | 'a11y' | null>(null)

  useEffect(() => {
    if (!saved) return
    const t = setTimeout(() => setSaved(0), 1600)
    return () => clearTimeout(t)
  }, [saved])

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    onChange({ ...settings, [key]: value })
    setSaved(Date.now())
  }

  const themes: { id: Theme; label: string; icon: typeof Sun }[] = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'Device', icon: Monitor },
  ]

  return (
    <div className="mx-auto w-full max-w-[1132px] px-4 pt-6 pb-16 sm:px-6 lg:px-4 lg:pt-9">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.375rem] font-semibold tracking-[-0.01em] text-ink lg:text-2xl">Settings</h1>
          <p className="mt-1 text-[0.9375rem] text-muted">Changes save as you make them and apply to the game right away.</p>
        </div>
        <AnimatePresence>
          {saved > 0 && (
            <motion.span
              key={saved}
              role="status"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex shrink-0 items-center gap-1.5 text-sm text-positive"
            >
              <Check size={15} strokeWidth={2} aria-hidden="true" />
              Saved
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-8">
        <Section title="Appearance" description="Light, dark, or follow your device. Device switches with your system setting.">
          <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-1 p-1">
            {themes.map((t) => {
              const on = settings.theme === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => set('theme', t.id)}
                  className={`flex h-12 items-center justify-center gap-2 rounded-xl text-[0.9375rem] transition-colors ${
                    on ? 'bg-surface font-medium text-ink ring-1 ring-border' : 'text-muted hover:bg-active hover:text-ink'
                  }`}
                >
                  <t.icon size={16} strokeWidth={1.75} aria-hidden="true" />
                  {t.label}
                </button>
              )
            })}
          </div>
        </Section>

        <Section
          title="Visual Accessibility"
          heading={<AccessibilityHeading />}
          description="Customize the game for better visibility, readability, and comfortable gameplay."
          aside={<AccessibilityPreview settings={settings} />}
          bare
        >
          <VisualAccessibility
            a11y={settings.a11y}
            onChange={(a11y) => {
              onChange({ ...settings, a11y })
              setSaved(Date.now())
            }}
            onReset={() => setConfirm('a11y')}
          />
        </Section>

        <Section title="Board help" description="What the board shows while you play. The Visual Accessibility preview reflects these too.">
          <SwitchRow
            title="Highlight matching numbers"
            description="Select an 8 and every other 8 on the board is tinted."
            checked={settings.highlightMatching}
            onChange={(v) => set('highlightMatching', v)}
          />
          <SwitchRow
            title="Highlight row, column and box"
            description="Tint the cells that share a rule with the selected cell."
            checked={settings.highlightPeers}
            onChange={(v) => set('highlightPeers', v)}
          />
          <SwitchRow
            title="Error checking"
            description="Mark wrong numbers in red, say why, and count them as mistakes."
            checked={settings.errorChecking}
            onChange={(v) => set('errorChecking', v)}
          />
          <SwitchRow
            title="Clear notes automatically"
            description="Placing a correct number removes it from the notes in its row, column and box."
            checked={settings.autoRemoveNotes}
            onChange={(v) => set('autoRemoveNotes', v)}
          />
        </Section>

        <Section title="Sound and vibration" description="Short tones and buzzes confirm each move. Motion settings are under Visual Accessibility.">
          <SwitchRow
            title="Sound effects"
            description="A soft tone when you place, erase or make a mistake."
            checked={settings.sound}
            onChange={(v) => set('sound', v)}
          />
          <SwitchRow
            title="Vibration"
            description={
              canVibrate()
                ? 'A short buzz when you place a number, a stronger one for a mistake, and a pattern when you win.'
                : "This device doesn't let websites vibrate (iPhones and most computers), so this has no effect here. It works on most Android phones."
            }
            checked={settings.vibration}
            onChange={(v) => {
              set('vibration', v)
              // Let the player feel what they just switched on.
              if (v) vibrate('place', true)
            }}
          />
        </Section>

        <Section title="Reset" description="Start over on preferences or statistics. A puzzle in progress is kept either way.">
          <div className="flex flex-col gap-2 p-2 sm:flex-row">
            <Button onClick={() => setConfirm('prefs')}>Reset preferences</Button>
            <Button className="text-negative" onClick={() => setConfirm('stats')}>
              Clear statistics
            </Button>
          </div>
        </Section>
      </div>

      <Dialog open={confirm !== null} onClose={() => setConfirm(null)} labelledBy="reset-title">
        <h2 id="reset-title" className="text-xl font-semibold text-ink">
          {confirm === 'stats' ? 'Clear all statistics?' : confirm === 'a11y' ? 'Reset accessibility settings?' : 'Reset preferences?'}
        </h2>
        <p className="mt-2 text-[0.9375rem] leading-6 text-muted">
          {confirm === 'stats'
            ? 'Puzzles solved, best times, streaks and recent wins are deleted. This cannot be undone.'
            : confirm === 'a11y'
              ? 'Colour vision, font size, contrast, grid, zoom, motion and spoken guidance go back to their standard settings.'
              : 'Every preference goes back to its default, including theme, sound, vibration, board help and visual accessibility.'}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button onClick={() => setConfirm(null)} data-autofocus>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              if (confirm === 'stats') onClearStats()
              else if (confirm === 'a11y') onChange({ ...settings, a11y: DEFAULT_A11Y })
              else onChange(DEFAULT_SETTINGS)
              setSaved(Date.now())
              setConfirm(null)
            }}
          >
            {confirm === 'stats' ? 'Clear statistics' : 'Reset'}
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
