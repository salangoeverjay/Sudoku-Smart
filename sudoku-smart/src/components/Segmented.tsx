import { useRef, type KeyboardEvent, type ReactNode } from 'react'

export interface SegmentOption<T> {
  value: T
  label: ReactNode
  /** Spoken name when the label is not plain text. */
  name?: string
  sub?: string
}

/** A row of mutually exclusive options; arrow keys move the choice, as in a native radio group. */
export function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
  columns,
}: {
  label: string
  options: SegmentOption<T>[]
  value: T
  onChange: (v: T) => void
  /** Columns on a phone; every option sits in one row from the small breakpoint up. */
  columns?: number
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const onKey = (e: KeyboardEvent, k: number) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = (k + step + options.length) % options.length
    onChange(options[next].value)
    refs.current[next]?.focus()
  }
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid gap-1 rounded-2xl bg-panel p-1"
      style={{ gridTemplateColumns: `repeat(${columns ?? options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o, k) => {
        const on = o.value === value
        return (
          <button
            key={String(o.value)}
            ref={(el) => {
              refs.current[k] = el
            }}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={o.name}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKey(e, k)}
            className={`flex min-h-12 flex-col items-center justify-center rounded-xl px-2 py-1.5 text-center text-[0.9375rem] leading-tight transition-colors ${
              on ? 'bg-surface font-medium text-ink ring-1 ring-border contrast-high:ring-[3px] contrast-high:ring-ink' : 'text-muted hover:bg-active hover:text-ink'
            }`}
          >
            {o.label}
            {o.sub && <span className={`num mt-0.5 text-xs ${on ? 'text-muted' : 'text-faint'}`}>{o.sub}</span>}
          </button>
        )
      })}
    </div>
  )
}
