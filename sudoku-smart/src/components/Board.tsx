import { motion } from 'motion/react'
import { useEffect, useRef } from 'react'

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
  const b = n === 9 ? 3 : 2
  const ref = useRef<HTMLDivElement>(null)
  const mounted = useRef(false)
  useEffect(() => {
    mounted.current = true
  }, [])

  // Keep keyboard focus on the selected cell when the selection moves by arrow keys.
  useEffect(() => {
    const root = ref.current
    if (!root || selected === null || !root.contains(document.activeElement)) return
    root.querySelector<HTMLButtonElement>(`[data-cell="${selected}"]`)?.focus()
  }, [selected])

  const row = (i: number) => Math.floor(i / n)
  const col = (i: number) => i % n
  const box = (i: number) => Math.floor(row(i) / b) * b + Math.floor(col(i) / b)
  const selValue = selected !== null ? values[selected] : 0
  const interactive = !!onSelect

  const toneOf = (i: number) => {
    if (errors?.has(i)) return i === selected ? 'error-selected' : 'error'
    if (i === selected) return 'selected'
    if (spotlight?.has(i)) return 'same'
    if (highlightMatching && selValue && values[i] === selValue) return 'same'
    if (
      highlightPeers &&
      selected !== null &&
      (row(i) === row(selected) || col(i) === col(selected) || box(i) === box(selected))
    )
      return 'peer'
    return 'base'
  }

  const bg: Record<string, string> = {
    base: 'var(--cell)',
    peer: 'var(--cell-peer)',
    same: 'var(--cell-same)',
    selected: 'var(--cell-selected)',
    error: 'var(--negative-soft)',
    'error-selected': 'var(--negative-soft)',
  }

  const describe = (i: number) => {
    const v = values[i]
    const where = `Row ${row(i) + 1}, column ${col(i) + 1}`
    if (givens[i]) return `${where}: ${v}, given`
    if (v) return `${where}: ${v}${errors?.has(i) ? ', does not fit' : ''}${hinted.includes(i) ? ', from a hint' : ''}`
    const marks = notes?.[i] ? digitsOf(notes[i], n) : []
    return marks.length ? `${where}: empty, notes ${marks.join(' ')}` : `${where}: empty`
  }

  const cellSize = `calc(100cqi / ${n})`

  const renderCell = (i: number) => {
    const v = values[i]
    const tone = toneOf(i)
    const given = !!givens[i]
    const color = errors?.has(i) ? 'var(--negative)' : given ? 'var(--text)' : 'var(--entry)'
    const delay = (row(i) + col(i)) * 0.035
    const content = hidden ? null : v ? (
      <motion.span
        key={v}
        initial={mounted.current && !given ? { scale: 0.4, opacity: 0 } : false}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 520, damping: 26 }}
        className="num leading-none"
        style={{ color, fontWeight: given ? 600 : 500, fontSize: `calc(${cellSize} * 0.54)` }}
      >
        {v}
      </motion.span>
    ) : notes?.[i] ? (
      <span
        className="num grid h-full w-full p-[6%]"
        style={{ gridTemplate: `repeat(${b}, minmax(0, 1fr)) / repeat(${b}, minmax(0, 1fr))`, fontSize: `calc(${cellSize} * 0.24)` }}
        aria-hidden="true"
      >
        {Array.from({ length: n }, (_, k) => k + 1).map((d) => (
          <span
            key={d}
            className="flex items-center justify-center leading-none"
            style={{
              color: d === selValue ? 'var(--accent)' : 'var(--faint)',
              fontWeight: d === selValue ? 600 : 400,
              visibility: notes[i] & (1 << d) ? 'visible' : 'hidden',
            }}
          >
            {d}
          </span>
        ))}
      </span>
    ) : null

    const style = {
      background: bg[tone],
      boxShadow: tone === 'error-selected' ? 'inset 0 0 0 2px var(--negative)' : undefined,
    }
    const cls = 'relative flex h-full w-full min-h-0 min-w-0 items-center justify-center overflow-hidden select-none transition-colors duration-100'

    const wave = {
      animate: celebrate ? { scale: [1, 1.14, 1] } : { scale: 1 },
      transition: celebrate ? { delay, duration: 0.45 } : { duration: 0 },
    }

    return interactive ? (
      <motion.button
        key={i}
        type="button"
        data-cell={i}
        tabIndex={i === (selected ?? 0) ? 0 : -1}
        aria-label={describe(i)}
        aria-pressed={i === selected}
        onClick={() => onSelect?.(i)}
        className={`${cls} cursor-pointer outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset`}
        style={style}
        {...wave}
      >
        {content}
      </motion.button>
    ) : (
      <motion.div key={i} role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : describe(i)} className={cls} style={style} {...wave}>
        {content}
      </motion.div>
    )
  }

  // Lay the cells out box by box so box borders come from the grid gaps.
  const boxes = Array.from({ length: n }, (_, bi) =>
    Array.from({ length: n }, (_, k) => {
      const r = Math.floor(bi / b) * b + Math.floor(k / b)
      const c = (bi % b) * b + (k % b)
      return r * n + c
    }),
  )

  return (
    <div ref={ref} data-ui className={`w-full ${className}`} style={{ containerType: 'inline-size' }} aria-hidden={decorative || undefined}>
      <div
        role={decorative ? undefined : 'group'}
        aria-label={decorative ? undefined : label}
        className="grid aspect-square overflow-hidden rounded-2xl"
        style={{ gridTemplate: `repeat(${b}, minmax(0, 1fr)) / repeat(${b}, minmax(0, 1fr))`, gap: 2, padding: 2, background: 'var(--line-box)' }}
      >
        {boxes.map((cells, bi) => (
          <div
            key={bi}
            className="grid"
            style={{ gridTemplate: `repeat(${b}, minmax(0, 1fr)) / repeat(${b}, minmax(0, 1fr))`, gap: 1, background: 'var(--line)' }}
          >
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
