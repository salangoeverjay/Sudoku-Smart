import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, type ReactNode } from 'react'

/** A centred dialog with a scrim; Escape and the scrim close it, focus starts on the first button. */
export function Dialog({
  open,
  onClose,
  labelledBy,
  children,
  wide = false,
}: {
  open: boolean
  onClose: () => void
  labelledBy: string
  children: ReactNode
  wide?: boolean
}) {
  const panel = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)
  useEffect(() => {
    close.current = onClose
  })

  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const t = setTimeout(() => panel.current?.querySelector<HTMLElement>('[data-autofocus], button')?.focus(), 30)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close.current()
      if (e.key === 'Tab' && panel.current) {
        // Keep Tab inside the dialog.
        const f = panel.current.querySelectorAll<HTMLElement>('button, [href], input')
        const first = f[0]
        const last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', onKey)
      prev?.focus?.()
    }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div className="absolute inset-0 bg-[#120f1f]/45" onClick={onClose} aria-hidden="true" />
          {/* taste-skill-ignore: a dialog floats, so it carries the one shadow */}
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            className={`relative w-full overflow-hidden rounded-3xl bg-surface p-6 shadow-[0_24px_64px_rgba(18,15,31,0.28)] sm:p-8 ${
              wide ? 'max-w-[440px]' : 'max-w-[380px]'
            }`}
            initial={{ y: 24, scale: 0.97 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
