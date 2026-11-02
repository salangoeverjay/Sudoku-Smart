import { motion } from 'motion/react'
import { useState } from 'react'

const COLORS = ['var(--accent)', 'var(--entry)', 'var(--cell-selected)', 'var(--cell-same)']

function makePieces() {
  return Array.from({ length: 34 }, (_, k) => ({
    k,
    x: Math.random() * 100,
    drift: (Math.random() - 0.5) * 80,
    delay: Math.random() * 0.35,
    dur: 1.4 + Math.random() * 0.9,
    rot: (Math.random() - 0.5) * 540,
    color: COLORS[k % COLORS.length],
    digit: k % 3 === 0 ? String(1 + (k % 9)) : null,
    size: 7 + Math.random() * 6,
  }))
}

/** Small digits and squares that fall through the win dialog once. */
export function Celebration() {
  const [pieces] = useState(makePieces)
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {pieces.map((p) => (
        <motion.span
          key={p.k}
          className="num absolute top-0 flex items-center justify-center rounded-[3px] font-semibold"
          style={{
            left: `${p.x}%`,
            width: p.digit ? undefined : p.size,
            height: p.digit ? undefined : p.size,
            background: p.digit ? undefined : p.color,
            color: p.color,
            fontSize: p.digit ? 18 : undefined,
          }}
          initial={{ y: -24, x: 0, rotate: 0, opacity: 1 }}
          animate={{ y: 420, x: p.drift, rotate: p.rot, opacity: [1, 1, 0] }}
          transition={{ delay: p.delay, duration: p.dur, ease: 'easeIn' }}
        >
          {p.digit}
        </motion.span>
      ))}
    </div>
  )
}
