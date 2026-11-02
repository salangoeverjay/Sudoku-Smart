import { useReducedMotion } from 'motion/react'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { DEFAULT_A11Y, TOKEN_NAMES, tokensFor, type A11y } from '../lib/a11y'
import { setSpeechEnabled } from '../lib/speech'
import type { Theme } from '../lib/store'

interface A11yState {
  a11y: A11y
  /** False when the player or the device asks for reduced motion. */
  motionOk: boolean
  theme: 'light' | 'dark'
  /** Spoken guidance silenced for this visit, without turning the setting off. */
  muted: boolean
  setMuted: (m: boolean) => void
}

const Ctx = createContext<A11yState>({
  a11y: DEFAULT_A11Y,
  motionOk: true,
  theme: 'light',
  muted: false,
  setMuted: () => {},
})

export const useA11y = () => useContext(Ctx)

const VARS_KEY = 'sudoku-smart:vars'

function systemDark() {
  return matchMedia('(prefers-color-scheme: dark)').matches
}

/** Applies the theme and every visual accessibility preference to the page, and shares them. */
export function A11yProvider({ a11y, theme, children }: { a11y: A11y; theme: Theme; children: ReactNode }) {
  const osReduced = useReducedMotion()
  const [dark, setDark] = useState(systemDark)
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const on = () => setDark(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  const resolved = theme === 'system' ? (dark ? 'dark' : 'light') : theme

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = resolved
    root.dataset.cvd = a11y.colorVision
    root.dataset.contrast = a11y.highContrast ? 'high' : 'standard'
    root.dataset.motion = a11y.reduceMotion ? 'reduce' : 'standard'
    root.dataset.fontScale = String(a11y.fontScale)
    // A percentage of the browser's own size, so the operating system's text scaling still applies.
    root.style.fontSize = `${a11y.fontScale * 100}%`
    const tokens = tokensFor(a11y.colorVision, resolved, a11y.highContrast)
    for (const name of TOKEN_NAMES) root.style.setProperty(`--${name}`, tokens[name])
    // Cached so the next visit paints in the right colours before the app has loaded.
    try {
      localStorage.setItem(VARS_KEY, JSON.stringify({ tokens, fontSize: root.style.fontSize, data: { ...root.dataset } }))
    } catch {
      // Storage blocked: the colours are applied after load instead.
    }
  }, [a11y, resolved])

  useEffect(() => setSpeechEnabled(a11y.speech && !muted), [a11y.speech, muted])

  const value = useMemo(
    () => ({ a11y, motionOk: !a11y.reduceMotion && !osReduced, theme: resolved, muted, setMuted }),
    [a11y, osReduced, resolved, muted],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
