// Short tones synthesised with the Web Audio API, so the app ships no audio files.

type Cue = 'place' | 'note' | 'error' | 'erase' | 'hint' | 'tap' | 'win'

let ctx: AudioContext | null = null

function tone(freq: number, start: number, dur: number, gain = 0.06, type: OscillatorType = 'sine') {
  if (!ctx) return
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  const t = ctx.currentTime + start
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(gain, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(g).connect(ctx.destination)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

export function play(cue: Cue, enabled: boolean) {
  if (!enabled) return
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    return
  }
  switch (cue) {
    case 'place': return tone(660, 0, 0.09)
    case 'note': return tone(880, 0, 0.05, 0.03)
    case 'tap': return tone(520, 0, 0.05, 0.03)
    case 'erase': return tone(440, 0, 0.08, 0.04, 'triangle')
    case 'error': return tone(196, 0, 0.18, 0.07, 'triangle')
    case 'hint': tone(740, 0, 0.08); return tone(988, 0.07, 0.12)
    case 'win': [523, 659, 784, 1047].forEach((f, k) => tone(f, k * 0.11, 0.3, 0.07)); return
  }
}
