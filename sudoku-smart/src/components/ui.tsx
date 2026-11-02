import type { ButtonHTMLAttributes, ReactNode } from 'react'

/** The mark: one 3×3 box with its diagonal solved. */
export function LogoMark({ size = 28 }: { size?: number }) {
  const cells = [0, 1, 2, 3, 4, 5, 6, 7, 8]
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
      <rect width="32" height="32" rx="8" fill="var(--accent)" />
      {cells.map((k) => {
        const r = Math.floor(k / 3)
        const c = k % 3
        return (
          <rect
            key={k}
            x={6 + c * 7.25}
            y={6 + r * 7.25}
            width="5.5"
            height="5.5"
            rx="1.5"
            fill="var(--surface)"
            opacity={r === c ? 1 : 0.35}
          />
        )
      })}
    </svg>
  )
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="text-[0.9375rem] font-semibold tracking-[-0.01em] text-ink">Sudoku Smart</span>
    </span>
  )
}

type Variant = 'primary' | 'secondary' | 'ghost'

export function Button({
  variant = 'secondary',
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; children: ReactNode }) {
  const base =
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-1.5 text-center text-[0.9375rem] font-medium transition-[background-color,color,transform] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-60 select-none'
  const look: Record<Variant, string> = {
    primary: 'btn-primary',
    secondary: 'bg-surface text-ink border border-control hover:bg-panel',
    ghost: 'text-ink hover:bg-active',
  }
  return (
    <button type="button" className={`${base} ${look[variant]} ${className}`} {...rest}>
      {children}
    </button>
  )
}

/** A full-row switch: the whole row is the hit area, the visual track sits on the right. */
export function SwitchRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-start justify-between gap-6 rounded-xl px-4 py-3.5 text-left transition-colors hover:bg-active/60"
    >
      <span className="min-w-0">
        <span className="block text-[0.9375rem] font-medium text-ink">{title}</span>
        <span className="mt-0.5 block text-sm leading-5 text-muted">{description}</span>
      </span>
      <span
        aria-hidden="true"
        className={`relative mt-0.5 h-6 w-10 shrink-0 rounded-full transition-colors duration-200 ${
          checked ? 'bg-accent' : 'bg-control'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-surface transition-transform duration-200 ${
            checked ? 'translate-x-4' : ''
          }`}
        />
      </span>
    </button>
  )
}
