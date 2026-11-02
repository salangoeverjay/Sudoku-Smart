import { AnimatePresence, motion } from 'motion/react'
import { Check, Monitor, Moon, Sun } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Board } from '../components/Board'
import { Dialog } from '../components/Dialog'
import { Button, SwitchRow } from '../components/ui'
import { DEFAULT_SETTINGS, type Settings, type Theme } from '../lib/store'

// A small corner of a board to show what the highlight and error settings do.
const PREVIEW_VALUES = [5, 3, 0, 6, 7, 0, 0, 9, 8, 0, 0, 0, 8, 0, 0, 0, 6, 0, 0, 0, 0, 4, 0, 0, 7, 0, 0, 0, 0, 0, 1, 0, 0, 0, 6, 0]
const PREVIEW_GIVENS = [5, 3, 0, 6, 7, 0, 0, 9, 8, 0, 0, 0, 8, 0, 0, 0, 6, 0, 0, 0, 0, 4, 0, 0, 7, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0]

function Section({ title, description, aside, children }: { title: string; description: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-rule py-8 first:border-t-0 first:pt-0 md:grid-cols-[minmax(0,360px)_minmax(0,1fr)] md:gap-10">
      <div className="md:pt-2">
        <h2 className="text-base font-medium text-ink">{title}</h2>
        <p className="mt-1 max-w-[40ch] text-sm leading-5 text-muted">{description}</p>
        {aside}
      </div>
      <div className="rounded-2xl bg-panel p-2">{children}</div>
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
  const [confirm, setConfirm] = useState<'prefs' | 'stats' | null>(null)

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

  // In the preview, the selected cell is row 2, column 4; cell 13 holds a wrong 9 when error checking is on.
  const previewValues = PREVIEW_VALUES.map((v, i) => (i === 13 ? 9 : v))

  return (
    <div className="mx-auto w-full max-w-[1132px] px-4 pt-6 pb-16 sm:px-6 lg:px-4 lg:pt-9">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink lg:text-2xl">Settings</h1>
          <p className="mt-1 text-[15px] text-muted">Changes save as you make them and apply to the game right away.</p>
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
                  className={`flex h-12 items-center justify-center gap-2 rounded-xl text-[15px] transition-colors ${
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
          title="Board help"
          description="What the board shows while you play. The preview updates as you switch."
          aside={
            <div className="mt-5 max-w-[240px]">
              <div style={{ aspectRatio: '9 / 4' }} className="overflow-hidden rounded-2xl">
                <Board
                  values={[...previewValues, ...new Array(45).fill(0)]}
                  givens={[...PREVIEW_GIVENS, ...new Array(45).fill(0)]}
                  selected={12}
                  highlightPeers={settings.highlightPeers}
                  highlightMatching={settings.highlightMatching}
                  errors={settings.errorChecking ? new Set([13]) : new Set()}
                  decorative
                  label="Preview"
                />
              </div>
              <p className="mt-2 text-xs leading-4 text-muted">Preview: the 8 in row 2 is selected; the 9 beside it is a mistake.</p>
            </div>
          }
        >
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

        <Section title="Sound and motion" description="Short tones confirm each move. Animations also follow your device's reduced-motion setting.">
          <SwitchRow
            title="Sound effects"
            description="A soft tone when you place, erase or make a mistake."
            checked={settings.sound}
            onChange={(v) => set('sound', v)}
          />
          <SwitchRow
            title="Animations"
            description="Numbers pop in and the board celebrates when you finish."
            checked={settings.animations}
            onChange={(v) => set('animations', v)}
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
          {confirm === 'stats' ? 'Clear all statistics?' : 'Reset preferences?'}
        </h2>
        <p className="mt-2 text-[15px] leading-6 text-muted">
          {confirm === 'stats'
            ? 'Puzzles solved, best times, streaks and recent wins are deleted. This cannot be undone.'
            : 'Theme, sound, animations and board help go back to their defaults.'}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button onClick={() => setConfirm(null)} data-autofocus>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              if (confirm === 'stats') onClearStats()
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
