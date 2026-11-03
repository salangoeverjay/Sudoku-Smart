// Short vibrations that confirm moves on phones. Browsers that cannot vibrate (iPhone Safari and
// most computers) have no navigator.vibrate, and every call here is then a no-op.

type Haptic = 'place' | 'note' | 'erase' | 'hint' | 'error' | 'win'

// Durations in ms; arrays alternate vibrate and pause.
const PATTERNS: Record<Haptic, number | number[]> = {
  place: 12,
  note: 8,
  erase: 8,
  hint: 20,
  error: [40, 60, 40],
  win: [30, 50, 30, 50, 120],
}

export const canVibrate = () => typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'

export function vibrate(kind: Haptic, enabled: boolean) {
  if (!enabled || !canVibrate()) return
  try {
    navigator.vibrate(PATTERNS[kind])
  } catch {
    // Some browsers refuse without a recent tap; the move itself still happens.
  }
}
