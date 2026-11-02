// Visual accessibility preferences: one place for their types, defaults, colour palettes and the
// CSS variables they produce. Everything here is plain data so it can be tested without a browser.

export type ColorVision = 'normal' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'monochrome'
export type FontScale = 1 | 1.25 | 1.5 | 2
export type BoardZoom = 1 | 1.25 | 1.5

export interface A11y {
  colorVision: ColorVision
  fontScale: FontScale
  highContrast: boolean
  thickGrid: boolean
  highlightLines: boolean
  enhancedMatching: boolean
  largeNumbers: boolean
  boardZoom: BoardZoom
  reduceMotion: boolean
  speech: boolean
}

export const DEFAULT_A11Y: A11y = {
  colorVision: 'normal',
  fontScale: 1,
  highContrast: false,
  thickGrid: false,
  highlightLines: false,
  enhancedMatching: false,
  largeNumbers: false,
  boardZoom: 1,
  reduceMotion: false,
  speech: false,
}

export const COLOR_VISION: { id: ColorVision; label: string; note: string }[] = [
  { id: 'normal', label: 'Normal', note: 'Original colours' },
  { id: 'protanopia', label: 'Protanopia', note: 'Red colour vision deficiency' },
  { id: 'deuteranopia', label: 'Deuteranopia', note: 'Green colour vision deficiency' },
  { id: 'tritanopia', label: 'Tritanopia', note: 'Blue-yellow colour vision deficiency' },
  { id: 'monochrome', label: 'Monochrome', note: 'Greyscale-friendly appearance' },
]

export const FONT_SCALES: { value: FontScale; label: string }[] = [
  { value: 1, label: 'Small' },
  { value: 1.25, label: 'Medium' },
  { value: 1.5, label: 'Large' },
  { value: 2, label: 'Extra large' },
]

export const BOARD_ZOOMS: BoardZoom[] = [1, 1.25, 1.5]

/** Merge saved preferences over the defaults, dropping values that are not valid any more. */
export function normaliseA11y(raw: Partial<A11y> | undefined): A11y {
  const a = { ...DEFAULT_A11Y, ...(raw ?? {}) }
  if (!COLOR_VISION.some((c) => c.id === a.colorVision)) a.colorVision = 'normal'
  if (!FONT_SCALES.some((f) => f.value === a.fontScale)) a.fontScale = 1
  if (!BOARD_ZOOMS.includes(a.boardZoom)) a.boardZoom = 1
  return a
}

/** True when the board must not rely on colour alone: shapes and marks back up every state. */
export const needsCues = (a: A11y) => a.colorVision !== 'normal' || a.highContrast

type Tokens = Record<string, string>
type Theme = 'light' | 'dark'

// The original Sudoku Smart palette (kept identical to index.css, which paints before scripts run).
const BASE: Record<Theme, Tokens> = {
  light: {
    ground: '#fbfaff', surface: '#ffffff', panel: '#f3f1fb', active: '#e8e4f6', border: '#e3dff0', rule: '#ece9f5',
    control: '#cdc6e2', text: '#1c1830', muted: '#555169', faint: '#67637c',
    accent: '#5b3fd0', 'accent-hover': '#4c32b8', 'accent-soft': '#ebe6fd', 'on-accent': '#ffffff', entry: '#2a5bd0',
    cell: '#ffffff', 'cell-peer': '#f1eefb', 'cell-line': '#e6dffc', 'cell-same': '#ddd4fb', 'cell-selected': '#c6b7f8',
    line: '#e2ddf0', 'line-box': '#8f86b3',
    positive: '#1f7a4d', negative: '#c4242a', 'negative-soft': '#fdecee',
  },
  dark: {
    ground: '#0f0e14', surface: '#17151f', panel: '#1b1924', active: '#2a2638', border: '#2b2837', rule: '#23202e',
    control: '#4a4560', text: '#f3f1fa', muted: '#b5b0c8', faint: '#9a95ad',
    accent: '#a28dff', 'accent-hover': '#b4a3ff', 'accent-soft': '#2b2546', 'on-accent': '#120f1f', entry: '#8eb0ff',
    cell: '#17151f', 'cell-peer': '#211e2d', 'cell-line': '#2c2742', 'cell-same': '#342c55', 'cell-selected': '#4a3d86',
    line: '#2b2837', 'line-box': '#6f6894',
    positive: '#4cc286', negative: '#ff7b88', 'negative-soft': '#3a1c24',
  },
}

// Palettes for colour vision differences. Each separates the states that matter on the board
// (your numbers, the selection, matches, errors) by hues that stay apart for that vision type,
// and the board adds shapes so no state depends on colour alone.
const MODES: Record<Exclude<ColorVision, 'normal'>, Record<Theme, Tokens>> = {
  // Red is weak: errors move to a dark orange, everything else to blue.
  protanopia: {
    light: {
      accent: '#0b5cad', 'accent-hover': '#094a8c', 'accent-soft': '#dcebfa', entry: '#0a58a0',
      'cell-peer': '#edf4fb', 'cell-line': '#dcebf9', 'cell-same': '#d3e5f8', 'cell-selected': '#b9d7f4',
      'line-box': '#6f8fae', positive: '#0b5cad', negative: '#a14b00', 'negative-soft': '#fdebd3',
    },
    dark: {
      accent: '#6cb4f0', 'accent-hover': '#8cc5f4', 'accent-soft': '#18304a', entry: '#7cc0ff',
      'cell-peer': '#172331', 'cell-line': '#1b2d42', 'cell-same': '#1d3754', 'cell-selected': '#1f4570',
      'line-box': '#5d7d9c', positive: '#7cc0ff', negative: '#ffa451', 'negative-soft': '#3a2410',
    },
  },
  // Green is weak: the same blue and orange split, with the purple kept a little.
  deuteranopia: {
    light: {
      accent: '#3d4fc4', 'accent-hover': '#3141a6', 'accent-soft': '#e3e6fb', entry: '#1a4c96',
      'cell-peer': '#eff1fc', 'cell-line': '#e0e4fa', 'cell-same': '#d8def9', 'cell-selected': '#c2cbf5',
      'line-box': '#7b84b8', positive: '#1a4c96', negative: '#a64d00', 'negative-soft': '#feecd9',
    },
    dark: {
      accent: '#8f9cff', 'accent-hover': '#a9b3ff', 'accent-soft': '#22284d', entry: '#79b1ff',
      'cell-peer': '#1a1e33', 'cell-line': '#20264a', 'cell-same': '#262d5c', 'cell-selected': '#2c3678',
      'line-box': '#6a73a8', positive: '#79b1ff', negative: '#ffab5c', 'negative-soft': '#3b2612',
    },
  },
  // Blue and yellow are confused: magenta for the selection, teal for your numbers.
  tritanopia: {
    light: {
      accent: '#a81f5b', 'accent-hover': '#8a194b', 'accent-soft': '#fbe3ee', entry: '#005853',
      'cell-peer': '#fcf0f5', 'cell-line': '#f9e2ec', 'cell-same': '#f9dae6', 'cell-selected': '#f4c4d7',
      'line-box': '#a77d90', positive: '#005853', negative: '#9e1414', 'negative-soft': '#fde7e8',
    },
    dark: {
      accent: '#ff7fb0', 'accent-hover': '#ff9cc3', 'accent-soft': '#44182c', entry: '#3fd1c4',
      'cell-peer': '#26141d', 'cell-line': '#331a26', 'cell-same': '#4d1d33', 'cell-selected': '#6a2645',
      'line-box': '#9a6a80', positive: '#3fd1c4', negative: '#ff8a7a', 'negative-soft': '#3d1a18',
    },
  },
  // No hue at all: states are told apart by lightness, weight, outlines and marks.
  monochrome: {
    light: {
      ground: '#fafafa', panel: '#f2f2f2', active: '#e4e4e4', border: '#dedede', rule: '#e8e8e8', control: '#8a8a8a',
      text: '#111111', muted: '#4f4f4f', faint: '#5e5e5e',
      accent: '#2b2b2b', 'accent-hover': '#000000', 'accent-soft': '#e6e6e6', entry: '#454545',
      'cell-peer': '#f2f2f2', 'cell-line': '#e4e4e4', 'cell-same': '#d9d9d9', 'cell-selected': '#c6c6c6',
      line: '#dcdcdc', 'line-box': '#7a7a7a', positive: '#2b2b2b', negative: '#111111', 'negative-soft': '#ececec',
    },
    dark: {
      ground: '#0e0e0e', surface: '#171717', panel: '#1b1b1b', active: '#2a2a2a', border: '#2c2c2c', rule: '#222222',
      control: '#6e6e6e', text: '#f5f5f5', muted: '#bdbdbd', faint: '#a0a0a0',
      accent: '#e8e8e8', 'accent-hover': '#ffffff', 'accent-soft': '#333333', entry: '#d2d2d2',
      cell: '#171717', 'cell-peer': '#212121', 'cell-line': '#2b2b2b', 'cell-same': '#363636', 'cell-selected': '#4a4a4a',
      line: '#2b2b2b', 'line-box': '#8a8a8a', positive: '#e8e8e8', negative: '#ffffff', 'negative-soft': '#2e2e2e',
    },
  },
}

// High contrast: neutrals pushed to black and white, every line and edge strong enough to see.
const HIGH_CONTRAST: Record<Theme, Tokens> = {
  light: {
    ground: '#ffffff', surface: '#ffffff', panel: '#f4f4f4', active: '#e2e2e2', border: '#5c5c5c', rule: '#767676',
    control: '#3d3d3d', text: '#000000', muted: '#2b2b2b', faint: '#3a3a3a',
    line: '#6e6e6e', 'line-box': '#000000',
  },
  dark: {
    ground: '#000000', surface: '#0a0a0a', panel: '#141414', active: '#2e2e2e', border: '#a3a3a3', rule: '#8a8a8a',
    control: '#c4c4c4', text: '#ffffff', muted: '#e4e4e4', faint: '#d0d0d0',
    line: '#8f8f8f', 'line-box': '#ffffff',
  },
}

export const TOKEN_NAMES = Object.keys(BASE.light)

/** The full set of colour tokens for a mode, theme and contrast setting. */
export function tokensFor(cvd: ColorVision, theme: Theme, highContrast: boolean): Tokens {
  const t = { ...BASE[theme], ...(cvd === 'normal' ? {} : MODES[cvd][theme]) }
  if (highContrast) {
    Object.assign(t, HIGH_CONTRAST[theme])
    // Your numbers move one step further from the cell fills, and the fills one step back, so every
    // number clears 4.5:1 on every highlight. The selection itself is carried by a thick ink outline.
    const [far, near] = theme === 'light' ? ['#000000', '#ffffff'] : ['#ffffff', '#000000']
    t.entry = mix(t.entry, far, 0.3)
    t.accent = mix(t.accent, far, 0.15)
    t.negative = mix(t.negative, far, 0.15)
    for (const k of ['cell-peer', 'cell-line', 'cell-same', 'cell-selected']) t[k] = mix(t[k], near, theme === 'light' ? 0.3 : 0.15)
  }
  return t
}

/** Swatches for the colour vision picker: your number, the selection, a match and an error. */
export function swatchesFor(cvd: ColorVision, theme: Theme) {
  const t = tokensFor(cvd, theme, false)
  return [t.entry, t['cell-selected'], t['cell-same'], t.negative]
}

function mix(a: string, b: string, amount: number) {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const ch = [16, 8, 0].map((sh) => Math.round(((pa >> sh) & 255) * (1 - amount) + ((pb >> sh) & 255) * amount))
  return '#' + ch.map((v) => v.toString(16).padStart(2, '0')).join('')
}

// WCAG relative luminance and contrast ratio, used by the contrast test.
function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
}

export function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}
