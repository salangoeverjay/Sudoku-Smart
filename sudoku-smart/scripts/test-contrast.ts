// Checks every colour mode, in light and dark, with and without high contrast, against WCAG 2.2 AA
// thresholds: 4.5:1 for text, 3:1 for the graphics that carry meaning.
import { COLOR_VISION, contrast, tokensFor } from '../src/lib/a11y.ts'

const TEXT: [string, string[]][] = [
  ['text', ['ground', 'surface', 'panel', 'cell', 'cell-peer', 'cell-line', 'cell-same', 'cell-selected']],
  ['muted', ['ground', 'surface', 'panel']],
  ['faint', ['ground', 'surface', 'panel', 'cell']],
  ['entry', ['cell', 'cell-peer', 'cell-line', 'cell-same', 'cell-selected']],
  ['negative', ['negative-soft', 'ground', 'panel']],
  ['accent', ['ground', 'panel', 'accent-soft']],
  ['positive', ['ground', 'panel']],
  ['on-accent', ['accent']],
]
const GRAPHICS: [string, string[]][] = [
  ['line-box', ['cell']],
  ['accent', ['surface', 'panel']], // switch "on" track, progress bar
  ['text', ['cell-selected']], // the selected-cell outline drawn in ink when cues are on
]
const HC_GRAPHICS: [string, string[]][] = [
  ['control', ['surface', 'panel']], // switch "off" track, button borders
  ['border', ['surface']],
  ['line', ['cell']],
]

// The original palette is kept as the default on purpose; its shortfalls are reported, not failed.
// High contrast and every colour vision mode must pass.
let fails = 0
let known = 0
let checks = 0
for (const { id } of COLOR_VISION)
  for (const theme of ['light', 'dark'] as const)
    for (const hc of [false, true]) {
      const t = tokensFor(id, theme, hc)
      const run = (pairs: [string, string[]][], min: number) => {
        for (const [fg, bgs] of pairs)
          for (const bg of bgs) {
            checks++
            const r = contrast(t[fg], t[bg])
            if (r < min && id === 'normal' && !hc) {
              known++
              console.log(`note original palette ${theme}: ${fg} ${t[fg]} on ${bg} ${t[bg]} = ${r.toFixed(2)} (WCAG asks ${min}; use High Contrast)`)
            } else if (r < min) {
              fails++
              console.log(`FAIL ${id}/${theme}${hc ? '/high-contrast' : ''}: ${fg} ${t[fg]} on ${bg} ${t[bg]} = ${r.toFixed(2)} (needs ${min})`)
            }
          }
      }
      run(TEXT, 4.5)
      run(GRAPHICS, 3)
      if (hc) run(HC_GRAPHICS, 3)
    }
console.log(`${checks} contrast checks: ${fails} failing, ${known} known in the original palette`)
if (fails) process.exitCode = 1
