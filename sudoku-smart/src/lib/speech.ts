// Optional spoken guidance through the browser's speech synthesis. Each new line replaces the one
// before it, so moving quickly across the board never builds up a queue of stale announcements.

let enabled = false

export const speechAvailable = () => typeof window !== 'undefined' && 'speechSynthesis' in window

export function setSpeechEnabled(on: boolean) {
  enabled = on
  if (!on) stopSpeech()
}

export function speak(text: string, force = false) {
  if ((!enabled && !force) || !speechAvailable() || !text) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.rate = 1
  window.speechSynthesis.speak(u)
}

export function stopSpeech() {
  if (speechAvailable()) window.speechSynthesis.cancel()
}
