/** Calls the /api/translate Cloudflare function (AI translation), with a local cache. */
import type { Dir } from './translate'

export interface AiTranslation {
  manglish: string
  malayalam: string
  french: string
  literal: string
  words: { manglish: string; fr: string }[]
  note: string
}
export type AiError = 'offline' | 'not-configured' | 'bad-code' | 'busy' | 'too-long' | 'refusal' | 'failed'

export const AI_ERROR_TEXT: Record<AiError, string> = {
  offline: 'Il faut une connexion Internet pour la traduction IA.',
  'not-configured': 'La traduction IA n’est pas encore activée sur ce site.',
  'bad-code': 'Entre le code secret pour utiliser la traduction IA.',
  busy: 'L’IA est très demandée, réessaie dans une minute.',
  'too-long': 'Phrase trop longue : essaie de la couper en deux.',
  refusal: 'L’IA n’a pas pu traduire cette phrase.',
  failed: 'La traduction IA n’a pas marché. Réessaie un peu plus tard.',
}

const CACHE_KEY = 'cheri-ai-cache'
const CODE_KEY = 'cheri-ai-code'
const MAX_CACHE = 150

function readCache(): Record<string, AiTranslation> {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') } catch { return {} }
}
const cacheKey = (text: string, dir: Dir) => `${dir}:${text.trim().toLowerCase().replace(/\s+/g, ' ')}`

export function cachedAi(text: string, dir: Dir): AiTranslation | null {
  return readCache()[cacheKey(text, dir)] ?? null
}

export function getAiCode(): string {
  try { return localStorage.getItem(CODE_KEY) ?? '' } catch { return '' }
}
export function setAiCode(code: string) {
  try { localStorage.setItem(CODE_KEY, code.trim()) } catch { /* private mode */ }
}

/* ---------- Voice for AI translations (Gemini text-to-speech via /api/tts) ---------- */
const TTS_CACHE = 'cheri-tts-v1'
const ttsUrls = new Map<string, string>()

/** Audio URL for a Malayalam sentence: from memory, then the phone's cache, then the server (once). */
export async function aiAudioUrl(malayalam: string): Promise<string> {
  const text = malayalam.trim()
  const known = ttsUrls.get(text)
  if (known) return known
  // Local cache key only (never sent anywhere).
  const key = new Request(`/__tts-cache/${encodeURIComponent(text)}`)
  let blob: Blob | null = null
  try {
    const hit = await (await caches.open(TTS_CACHE)).match(key)
    if (hit) blob = await hit.blob()
  } catch { /* no Cache Storage */ }
  if (!blob) {
    if (!navigator.onLine) throw 'offline' as AiError
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-translate-code': getAiCode() },
      body: JSON.stringify({ text }),
    }).catch(() => null)
    if (!res?.ok || !(res.headers.get('content-type') ?? '').includes('audio')) {
      console.warn('[AI voice]', res?.status ?? 'network error')
      throw 'failed' as AiError
    }
    blob = await res.blob()
    try { await (await caches.open(TTS_CACHE)).put(key, new Response(blob, { headers: { 'content-type': 'audio/wav' } })) } catch { /* storage full: fine */ }
  }
  const url = URL.createObjectURL(blob)
  ttsUrls.set(text, url)
  return url
}

export async function aiTranslate(text: string, dir: Dir): Promise<AiTranslation> {
  const hit = cachedAi(text, dir)
  if (hit) return hit
  if (!navigator.onLine) throw 'offline' as AiError
  let res: Response
  try {
    res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-translate-code': getAiCode() },
      body: JSON.stringify({ text: text.trim(), dir }),
    })
  } catch { throw 'offline' as AiError }
  const data = await res.json().catch(() => null)
  if (!res.ok || !data || typeof data.manglish !== 'string') {
    const code = data?.error
    // Technical details go to the developer console only, never on her screen.
    console.warn('[AI translation]', res.status, code ?? (data ? '' : 'non-JSON response: is /api/translate deployed?'))
    // No JSON at all (404/405 from the static host) means the server function isn't deployed yet.
    if (!data) throw 'not-configured' as AiError
    throw (['not-configured', 'bad-code', 'busy', 'too-long', 'refusal'].includes(code) ? code : 'failed') as AiError
  }
  const result: AiTranslation = { ...data, words: Array.isArray(data.words) ? data.words : [] }
  try {
    const cache = readCache()
    cache[cacheKey(text, dir)] = result
    const keys = Object.keys(cache)
    for (const k of keys.slice(0, Math.max(0, keys.length - MAX_CACHE))) delete cache[k]
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch { /* storage full or blocked: fine, just no cache */ }
  return result
}
