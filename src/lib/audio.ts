import type { Item } from './content'
import { aiAudioUrl } from './ai'

/**
 * Plays public/audio/<id>.mp3 (your own recordings or the generated ones).
 * Falls back to the device's Malayalam voice or Gemini TTS if the file is missing.
 * Drop a recording named <id>.mp3 into public/audio to replace any phrase.
 */
const cache = new Map<string, HTMLAudioElement>()
let current: HTMLAudioElement | null = null

const url = (id: string) => `${import.meta.env.BASE_URL}audio/${id}.mp3`

function get(item: Item) {
  let a = cache.get(item.id)
  if (!a || a.error) {
    a = new Audio(url(item.id))
    a.preload = 'auto'
    cache.set(item.id, a)
    if (cache.size > 120) { const first = cache.keys().next().value!; cache.delete(first) }
  }
  return a
}

async function speakFallback(item: Item, slow: boolean, onEnd?: () => void) {
  // 1. Try Gemini AI TTS if Malayalam script is available and online
  if (typeof navigator !== 'undefined' && navigator.onLine && item.ml && /[ഀ-ൿ]/.test(item.ml)) {
    try {
      const ttsUrl = await aiAudioUrl(item.ml)
      const aiAudio = new Audio(ttsUrl)
      aiAudio.playbackRate = slow ? 0.7 : 1
      current = aiAudio
      if (onEnd) {
        aiAudio.addEventListener('ended', onEnd, { once: true })
        aiAudio.addEventListener('pause', onEnd, { once: true })
      }
      await aiAudio.play()
      return
    } catch {
      // Fallback to Web Speech API below
    }
  }

  // 2. Try browser SpeechSynthesis
  try {
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined
    if (!synth) { onEnd?.(); return }
    const voices = synth.getVoices?.() ?? []
    const voice = voices.find(v => v.lang.toLowerCase().startsWith('ml'))
    synth.cancel()
    const text = item.ml || item.manglish
    const u = new SpeechSynthesisUtterance(text)
    if (voice) {
      u.voice = voice
      u.lang = voice.lang
    } else {
      u.lang = 'ml-IN'
    }
    u.rate = slow ? 0.6 : 0.9
    u.onend = () => onEnd?.()
    u.onerror = () => onEnd?.()
    synth.speak(u)
  } catch {
    onEnd?.()
  }
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
  a.play().catch(() => {
    cache.delete(item.id)
    speakFallback(item, slow)
  })
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
    a.play().catch(() => {
      cache.delete(item.id)
      a.removeEventListener('ended', done)
      a.removeEventListener('pause', done)
      speakFallback(item, false, resolve)
    })
  })
}

export function preload(items: Item[]) {
  for (const i of items.slice(0, 40)) get(i)
}
