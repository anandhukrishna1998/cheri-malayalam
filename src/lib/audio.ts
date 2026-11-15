import type { Item } from './content'

/**
 * Plays public/audio/<id>.mp3 (your own recordings or the generated ones).
 * Falls back to the device's Malayalam voice if the file is missing.
 * Drop a recording named <id>.mp3 into public/audio to replace any phrase.
 */
const cache = new Map<string, HTMLAudioElement>()
let current: HTMLAudioElement | null = null

const url = (id: string) => `${import.meta.env.BASE_URL}audio/${id}.mp3`

function get(item: Item) {
  let a = cache.get(item.id)
  if (!a) {
    a = new Audio(url(item.id))
    a.preload = 'auto'
    cache.set(item.id, a)
    if (cache.size > 120) { const first = cache.keys().next().value!; cache.delete(first) }
  }
  return a
}

function speakFallback(item: Item, slow: boolean, onEnd?: () => void) {
  try {
    const synth = window.speechSynthesis
    const voice = synth.getVoices().find(v => v.lang.toLowerCase().startsWith('ml'))
    if (!voice) { onEnd?.(); return }
    synth.cancel()
    const u = new SpeechSynthesisUtterance(item.ml)
    u.voice = voice; u.lang = voice.lang; u.rate = slow ? 0.6 : 0.9
    u.onend = () => onEnd?.()
    synth.speak(u)
  } catch { onEnd?.() }
}

export function stop() {
  current?.pause()
  try { window.speechSynthesis?.cancel() } catch { /* */ }
}

export function play(item: Item, slow = false) {
  stop()
  const a = get(item)
  a.playbackRate = slow ? 0.7 : 1
  a.currentTime = 0
  current = a
  a.play().catch(() => speakFallback(item, slow))
}

/** Plays and resolves when the audio has finished (for "listen to the whole dialogue"). */
export function playAndWait(item: Item): Promise<void> {
  stop()
  return new Promise(resolve => {
    const a = get(item)
    a.playbackRate = 1
    a.currentTime = 0
    current = a
    const done = () => { a.removeEventListener('ended', done); a.removeEventListener('pause', done); resolve() }
    a.addEventListener('ended', done)
    a.addEventListener('pause', done)
    a.play().catch(() => { a.removeEventListener('ended', done); a.removeEventListener('pause', done); speakFallback(item, false, resolve) })
  })
}

export function preload(items: Item[]) {
  for (const i of items.slice(0, 40)) get(i)
}
