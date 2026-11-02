import { Check, Eye, Volume2 } from 'lucide-react'
import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { BOARD_ZOOMS, COLOR_VISION, FONT_SCALES, swatchesFor, type A11y } from '../lib/a11y'
import { speak, speechAvailable } from '../lib/speech'
import type { Settings } from '../lib/store'
import { useA11y } from './A11yProvider'
import { Board } from './Board'
import { Segmented } from './Segmented'
import { Button, SwitchRow } from './ui'

// Four rows of a board for the live preview: givens, your numbers, a mistake, a hint and notes.
const VALUES = [5, 3, 0, 6, 7, 0, 0, 9, 8, 0, 0, 0, 8, 9, 0, 0, 6, 0, 0, 0, 0, 4, 0, 0, 7, 0, 0, 2, 0, 0, 1, 0, 0, 0, 6, 0]
const GIVENS = [5, 3, 0, 6, 7, 0, 0, 9, 8, 0, 0, 0, 8, 0, 0, 0, 6, 0, 0, 0, 0, 4, 0, 0, 7, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0]
const NOTES = VALUES.map((_, i) => (i === 2 ? (1 << 1) | (1 << 4) | (1 << 8) : 0))
const pad = (a: number[]) => [...a, ...new Array(81 - a.length).fill(0)]

function Group({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="border-t border-rule px-4 py-5 first:border-t-0">
      <h3 className="text-[0.9375rem] font-medium text-ink">{title}</h3>
      {description && <p className="mt-0.5 text-sm leading-5 text-muted">{description}</p>}
      <div className="mt-3">{children}</div>
    </div>
  )
}

/** The live preview: a strip of board drawn with every current preference. */
export function AccessibilityPreview({ settings }: { settings: Settings }) {
  return (
    <figure className="mt-5">
      <div style={{ aspectRatio: '9 / 4' }} className="max-w-[20rem] overflow-hidden rounded-2xl">
        <Board
          values={pad(VALUES)}
          givens={pad(GIVENS)}
          notes={pad(NOTES)}
          selected={12}
          hinted={[34]}
          highlightPeers={settings.highlightPeers}
          highlightMatching={settings.highlightMatching}
          errors={settings.errorChecking ? new Set([13]) : new Set()}
          decorative
          label="Preview"
        />
      </div>
      <figcaption className="mt-2 max-w-[20rem] text-xs leading-4 text-muted">
        Preview: the 8 in row 2 is selected and the other 8 matches it. The 9 beside it is a mistake, the 6 in
        row 4 came from a hint, and the top row has a cell with notes.
      </figcaption>
    </figure>
  )
}

function ColorVisionPicker({ value, onChange }: { value: A11y['colorVision']; onChange: (v: A11y['colorVision']) => void }) {
  const { theme } = useA11y()
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const onKey = (e: KeyboardEvent, k: number) => {
    const step = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = (k + step + COLOR_VISION.length) % COLOR_VISION.length
    onChange(COLOR_VISION[next].id)
    refs.current[next]?.focus()
  }
  return (
    <div role="radiogroup" aria-label="Colour vision mode" className="space-y-1">
      {COLOR_VISION.map((m, k) => {
        const on = m.id === value
        const [entry, selected, same, error] = swatchesFor(m.id, theme)
        return (
          <button
            key={m.id}
            ref={(el) => {
              refs.current[k] = el
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(m.id)}
            onKeyDown={(e) => onKey(e, k)}
            className={`flex min-h-14 w-full flex-wrap items-center gap-x-3 gap-y-2 rounded-xl px-3 py-2 text-left transition-colors ${
              on ? 'bg-surface ring-1 ring-border contrast-high:ring-[3px] contrast-high:ring-ink' : 'hover:bg-active/60'
            }`}
          >
            <span
              aria-hidden="true"
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${on ? 'bg-accent text-on-accent' : 'ring-1 ring-control'}`}
            >
              {on && <Check size={13} strokeWidth={3} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[0.9375rem] font-medium text-ink">{m.label}</span>
              <span className="block text-sm text-muted">{m.note}</span>
            </span>
            {/* The mode's own colours: your number, the selection, a match and an error */}
            <span aria-hidden="true" className="flex shrink-0 flex-wrap gap-1 big-text:basis-full">
              <span className="num flex h-7 w-7 items-center justify-center rounded-md bg-surface text-sm font-medium ring-1 ring-border" style={{ color: entry }}>
                4
              </span>
              <span className="h-7 w-7 rounded-md ring-1 ring-border" style={{ background: selected }} />
              <span className="h-7 w-7 rounded-md ring-1 ring-border" style={{ background: same }} />
              <span className="num flex h-7 w-7 items-center justify-center rounded-md bg-surface text-sm font-semibold ring-1 ring-border" style={{ color: error }}>
                9
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function VisualAccessibility({
  a11y,
  onChange,
  onReset,
}: {
  a11y: A11y
  onChange: (a: A11y) => void
  onReset: () => void
}) {
  const set = <K extends keyof A11y>(key: K, value: A11y[K]) => onChange({ ...a11y, [key]: value })
  const canSpeak = speechAvailable()

  return (
    <div className="overflow-hidden rounded-2xl bg-panel">
      <Group
        title="Colour vision mode"
        description="Palettes built for each type of colour vision. Errors, the selection and hints also get shapes, so none of them depends on colour alone."
      >
        <ColorVisionPicker value={a11y.colorVision} onChange={(v) => set('colorVision', v)} />
      </Group>

      <Group title="Font size" description="Scales text, buttons, menus and instructions across the app. Your device's own text size still applies on top.">
        <Segmented
          label="Font size"
          value={a11y.fontScale}
          onChange={(v) => set('fontScale', v)}
          columns={2}
          options={FONT_SCALES.map((f) => ({ value: f.value, label: f.label, sub: `${f.value * 100}%` }))}
        />
        <p className="mt-3 rounded-xl bg-surface px-4 py-3 text-[0.9375rem] leading-6 text-ink ring-1 ring-border" aria-live="polite">
          Preview at {a11y.fontScale * 100}%: each row, column and box holds 1 to 9 once.
        </p>
      </Group>

      <div className="border-t border-rule px-2 py-3">
        <SwitchRow
          title="High contrast"
          description="Black and white text, strong grid lines and borders, a thick outline on the selected cell, and bold focus rings."
          checked={a11y.highContrast}
          onChange={(v) => set('highContrast', v)}
        />
      </div>

      <Group title="Sudoku grid" description="Each option works on its own and changes the board in the preview.">
        <div className="-mx-2">
          <SwitchRow
            title="Thick grid lines"
            description="Wider lines between cells and much wider lines around each 3×3 box."
            checked={a11y.thickGrid}
            onChange={(v) => set('thickGrid', v)}
          />
          <SwitchRow
            title="Highlight selected row and column"
            description="A stronger band across the selected cell's row and down its column."
            checked={a11y.highlightLines}
            onChange={(v) => set('highlightLines', v)}
          />
          <SwitchRow
            title="Enhanced number highlighting"
            description="Matching numbers get an outline and a bar underneath, as well as the tint."
            checked={a11y.enhancedMatching}
            onChange={(v) => set('enhancedMatching', v)}
          />
          <SwitchRow
            title="Large number mode"
            description="Numbers fill more of each cell. The rest of the screen stays the same size."
            checked={a11y.largeNumbers}
            onChange={(v) => set('largeNumbers', v)}
          />
        </div>
      </Group>

      <Group title="Board zoom" description="Enlarges the board inside its frame; scroll or use the arrow keys to reach every cell. The keypad stays where it is.">
        <Segmented
          label="Board zoom"
          value={a11y.boardZoom}
          onChange={(v) => set('boardZoom', v)}
          options={BOARD_ZOOMS.map((z) => ({ value: z, label: `${z * 100}%` }))}
        />
      </Group>

      <div className="border-t border-rule px-2 py-3">
        <SwitchRow
          title="Reduce motion"
          description="Turns off number pops, screen fades and the celebration, with no flashing. Your device's reduced-motion setting is always followed too."
          checked={a11y.reduceMotion}
          onChange={(v) => set('reduceMotion', v)}
        />
        <SwitchRow
          title="Screen reader assistance"
          description={
            canSpeak
              ? 'Reads the selected cell, each move, mistakes and the finish aloud, with a mute button on the board. Leave it off if you use a screen reader, so nothing is read twice.'
              : 'This browser has no speech synthesis, so spoken guidance is unavailable here. Screen reader labels work either way.'
          }
          checked={a11y.speech && canSpeak}
          onChange={(v) => {
            if (!canSpeak) return
            set('speech', v)
            if (v) speak('Spoken guidance is on.', true)
          }}
        />
        {a11y.speech && canSpeak && (
          <div className="px-4 pb-2">
            <Button className="min-h-10 px-4 text-sm" onClick={() => speak('Row 3, column 5, empty. This is how cells will be read.', true)}>
              <Volume2 size={15} strokeWidth={1.75} aria-hidden="true" />
              Test the voice
            </Button>
          </div>
        )}
      </div>

      <div className="border-t border-rule px-4 py-5">
        <Button onClick={onReset}>Reset accessibility settings</Button>
        <p className="mt-2 text-sm text-muted">Every option above goes back to its standard setting.</p>
      </div>
    </div>
  )
}

export function AccessibilityHeading() {
  return (
    <h2 className="flex items-center gap-2 text-base font-medium text-ink">
      <Eye size={18} strokeWidth={1.75} aria-hidden="true" />
      Visual Accessibility
    </h2>
  )
}
