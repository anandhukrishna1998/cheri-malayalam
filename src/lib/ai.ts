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

/** Technical cause of the last failure, shown small under the error to help fix setup problems. */
export let lastAiDetail = ''

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

export async function aiTranslate(text: string, dir: Dir): Promise<AiTranslation> {
  const hit = cachedAi(text, dir)
  if (hit) return hit
  lastAiDetail = ''
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
    lastAiDetail = data
      ? `${res.status} ${code ?? ''} ${data.detail ?? ''}`.trim()
      : `${res.status} : le serveur n’a pas renvoyé de JSON (fonction /api/translate non déployée ?)`
    throw (['not-configured', 'bad-code', 'busy', 'too-long', 'refusal'].includes(code) ? code : res.status === 404 ? 'not-configured' : 'failed') as AiError
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
