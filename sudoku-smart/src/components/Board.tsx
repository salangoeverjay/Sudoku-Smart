import { motion } from 'motion/react'
import { X } from 'lucide-react'
import { useEffect, useId, useRef, type CSSProperties } from 'react'
import { needsCues } from '../lib/a11y'
import { useA11y } from './A11yProvider'

export interface BoardProps {
  /** 9 for the game, 4 for the tutorial's mini puzzle. */
  n?: 4 | 9
  values: number[]
  givens: number[]
  notes?: number[]
  selected?: number | null
  onSelect?: (i: number) => void
  errors?: Set<number>
  hinted?: number[]
  highlightPeers?: boolean
  highlightMatching?: boolean
  /** Cells the tutorial points at. */
  spotlight?: Set<number>
  celebrate?: boolean
  hidden?: boolean
  /** Inside another control (a preview): hidden from assistive tech, the control carries the name. */
  decorative?: boolean
  label: string
  className?: string
}

type Tone = 'base' | 'peer' | 'line' | 'same' | 'selected' | 'error' | 'error-selected'

const BG: Record<Tone, string> = {
  base: 'var(--cell)',
  peer: 'var(--cell-peer)',
  line: 'var(--cell-line)',
  same: 'var(--cell-same)',
  selected: 'var(--cell-selected)',
  error: 'var(--negative-soft)',
  'error-selected': 'var(--negative-soft)',
}

export function Board({
  n = 9,
  values,
  givens,
  notes,
  selected = null,
  onSelect,
  errors,
  hinted = [],
  highlightPeers = true,
  highlightMatching = true,
  spotlight,
  celebrate = false,
  hidden = false,
  decorative = false,
  label,
  className = '',
}: BoardProps) {
  const { a11y, motionOk } = useA11y()
  const cues = needsCues(a11y)
  const b = n === 9 ? 3 : 2
  const ref = useRef<HTMLDivElement>(null)
  const mounted = useRef(false)
  const hatchId = useId()
  useEffect(() => {
    mounted.current = true
  }, [])

  // Keep keyboard focus on the selected cell when the selection moves by arrow keys, and keep it
  // in view when the board is zoomed past its frame.
  useEffect(() => {
    const root = ref.current
    if (!root || selected === null) return
    const cell = root.querySelector<HTMLElement>(`[data-cell="${selected}"]`)
    if (root.contains(document.activeElement)) cell?.focus({ preventScroll: true })
    if (a11y.boardZoom > 1) cell?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [selected, a11y.boardZoom])

  const row = (i: number) => Math.floor(i / n)
  const col = (i: number) => i % n
  const box = (i: number) => Math.floor(row(i) / b) * b + Math.floor(col(i) / b)
  const selValue = selected !== null ? values[selected] : 0
  const interactive = !!onSelect

  const isMatch = (i: number) => highlightMatching && !!selValue && i !== selected && values[i] === selValue

  const toneOf = (i: number): Tone => {
    if (errors?.has(i)) return i === selected ? 'error-selected' : 'error'
    if (i === selected) return 'selected'
    if (spotlight?.has(i) || isMatch(i)) return 'same'
    if (selected === null) return 'base'
    const inLine = row(i) === row(selected) || col(i) === col(selected)
    if (a11y.highlightLines && inLine) return 'line'
    if (highlightPeers && (inLine || box(i) === box(selected))) return 'peer'
    return 'base'
  }

  const describe = (i: number) => {
    const v = values[i]
    const where = `Row ${row(i) + 1}, column ${col(i) + 1}`
    if (givens[i]) return `${where}, ${v}, fixed`
    if (v) {
      const notes = [errors?.has(i) && 'incorrect', hinted.includes(i) && 'from a hint'].filter(Boolean)
      return `${where}, ${v}, editable${notes.length ? ', ' + notes.join(', ') : ''}`
    }
    const marks = notes?.[i] ? digitsOf(notes[i], n) : []
    return `${where}, empty, editable${marks.length ? `, notes ${marks.join(' ')}` : ''}`
  }

  // Grid line widths: thick lines double both the cell lines and the box boundaries.
  const thin = a11y.thickGrid ? 2 : 1
  const thick = a11y.thickGrid ? 4 : 2

  // Number sizes: Large Number Mode fills the cell; a bigger text size nudges the board up too.
  const cellSize = `calc(100cqi / ${n})`
  const bump = 1 + (a11y.fontScale - 1) * 0.35
  const digitFactor = a11y.largeNumbers ? 0.74 : Math.min(0.74, 0.54 * bump)
  const noteFactor = a11y.largeNumbers ? 0.3 : Math.min(0.3, 0.24 * (1 + (a11y.fontScale - 1) * 0.2))

  const renderCell = (i: number) => {
    const v = values[i]
    const tone = toneOf(i)
    const given = !!givens[i]
    const wrong = !!errors?.has(i)
    const match = isMatch(i) && !wrong
    const color = wrong ? 'var(--negative)' : given ? 'var(--text)' : 'var(--entry)'
    const r = row(i)
    const c = col(i)

    // Inset outlines carry state without colour: ink for the selection, the accent for matches.
    const rings: string[] = []
    if (tone === 'error-selected') rings.push(`inset 0 0 0 ${cues ? 3 : 2}px var(--negative)`)
    else if (tone === 'selected' && cues) rings.push('inset 0 0 0 3px var(--text)')
    if (match && a11y.enhancedMatching) rings.push('inset 0 0 0 2px var(--accent)')

    const style: CSSProperties = {
      background: BG[tone],
      boxShadow: rings.join(', ') || undefined,
      borderRight: c < n - 1 ? `${(c + 1) % b === 0 ? thick : thin}px solid var(${(c + 1) % b === 0 ? '--line-box' : '--line'})` : undefined,
      borderBottom: r < n - 1 ? `${(r + 1) % b === 0 ? thick : thin}px solid var(${(r + 1) % b === 0 ? '--line-box' : '--line'})` : undefined,
    }

    const content = hidden ? null : v ? (
      <motion.span
        key={v}
        initial={mounted.current && !given && motionOk ? { scale: 0.4, opacity: 0 } : false}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 520, damping: 26 }}
        className="num relative z-10 leading-none"
        style={{ color, fontWeight: given ? (cues ? 700 : 600) : 500, fontSize: `calc(${cellSize} * ${digitFactor})` }}
      >
        {v}
        {match && a11y.enhancedMatching && (
          // The symbol for a match: a bar under the number, so matches read without colour too.
          <span aria-hidden="true" className="absolute top-full left-1/2 mt-[0.06em] h-[0.09em] w-[0.7em] -translate-x-1/2 rounded-full bg-current" />
        )}
      </motion.span>
    ) : notes?.[i] ? (
      <span
        className="num grid h-full w-full p-[6%]"
        style={{ gridTemplate: `repeat(${b}, minmax(0, 1fr)) / repeat(${b}, minmax(0, 1fr))`, fontSize: `calc(${cellSize} * ${noteFactor})` }}
        aria-hidden="true"
      >
        {Array.from({ length: n }, (_, k) => k + 1).map((d) => (
          <span
            key={d}
            className="flex items-center justify-center leading-none"
            style={{
              color: d === selValue ? 'var(--accent)' : 'var(--faint)',
              fontWeight: d === selValue ? 700 : 400,
              textDecoration: d === selValue && a11y.enhancedMatching ? 'underline' : undefined,
              visibility: notes[i] & (1 << d) ? 'visible' : 'hidden',
            }}
          >
            {d}
          </span>
        ))}
      </span>
    ) : null

    const marks =
      cues && !hidden ? (
        <>
          {wrong && (
            <>
              {/* Errors: a hatch and a cross, readable in any colour mode */}
              <svg aria-hidden="true" className="absolute inset-0 h-full w-full opacity-40" style={{ color: 'var(--negative)' }}>
                <rect width="100%" height="100%" fill={`url(#${hatchId})`} />
              </svg>
              <X aria-hidden="true" className="absolute top-[5%] right-[5%] z-10 h-[26%] w-[26%]" strokeWidth={3} style={{ color: 'var(--negative)' }} />
            </>
          )}
          {hinted.includes(i) && !wrong && (
            // Hints: a corner notch, so hinted numbers stand apart without relying on colour.
            <span
              aria-hidden="true"
              className="absolute top-0 left-0 h-0 w-0"
              style={{ borderTop: `calc(${cellSize} * 0.24) solid var(--accent)`, borderRight: `calc(${cellSize} * 0.24) solid transparent` }}
            />
          )}
        </>
      ) : null

    const cls =
      'relative flex h-full w-full min-h-0 min-w-0 items-center justify-center overflow-hidden select-none transition-colors duration-100'
    const wave =
      celebrate && motionOk
        ? { animate: { scale: [1, 1.14, 1] }, transition: { delay: (r + c) * 0.035, duration: 0.45 } }
        : { animate: { scale: 1 }, transition: { duration: 0 } }

    if (interactive)
      return (
        <motion.div
          key={i}
          role="gridcell"
          data-cell={i}
          tabIndex={i === (selected ?? 0) ? 0 : -1}
          aria-label={describe(i)}
          aria-selected={i === selected}
          aria-readonly={given || undefined}
          aria-invalid={wrong || undefined}
          aria-colindex={c + 1}
          onClick={() => onSelect?.(i)}
          onFocus={() => i !== selected && onSelect?.(i)}
          className={`${cls} cursor-pointer outline-none focus-visible:z-20 focus-visible:ring-[3px] focus-visible:ring-accent focus-visible:ring-inset`}
          style={style}
          {...wave}
        >
          {content}
          {marks}
        </motion.div>
      )
    return (
      <motion.div
        key={i}
        role={decorative ? undefined : 'gridcell'}
        aria-label={decorative ? undefined : describe(i)}
        aria-colindex={decorative ? undefined : c + 1}
        className={cls}
        style={style}
        {...wave}
      >
        {content}
        {marks}
      </motion.div>
    )
  }

  const rows = Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => r * n + c))

  return (
    <div ref={ref} data-ui className={`w-full ${className}`} style={{ containerType: 'inline-size' }} aria-hidden={decorative || undefined}>
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          <pattern id={hatchId} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="7" stroke="currentColor" strokeWidth="2" />
          </pattern>
        </defs>
      </svg>
      <div
        role={decorative ? undefined : 'grid'}
        aria-label={decorative ? undefined : label}
        aria-rowcount={decorative ? undefined : n}
        aria-colcount={decorative ? undefined : n}
        aria-readonly={!decorative && !interactive ? true : undefined}
        className="grid aspect-square overflow-hidden rounded-2xl"
        style={{
          gridTemplate: `repeat(${n}, minmax(0, 1fr)) / repeat(${n}, minmax(0, 1fr))`,
          border: `${thick}px solid var(--line-box)`,
          background: 'var(--cell)',
        }}
      >
        {rows.map((cells, r) => (
          <div key={r} role={decorative ? undefined : 'row'} aria-rowindex={decorative ? undefined : r + 1} className="contents">
            {cells.map(renderCell)}
          </div>
        ))}
      </div>
    </div>
  )
}

export function digitsOf(mask: number, n = 9): number[] {
  const out: number[] = []
  for (let d = 1; d <= n; d++) if (mask & (1 << d)) out.push(d)
  return out
}
