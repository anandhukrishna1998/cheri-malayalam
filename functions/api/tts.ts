/**
 * POST /api/tts  { text: "<Malayalam script>" }  →  audio/wav
 * Reads an AI translation aloud with Gemini's text-to-speech (free tier), so it can be heard
 * on phones that have no Malayalam voice (most iPhones).
 * Uses the same GEMINI_API_KEY and TRANSLATE_CODE as /api/translate.
 */
import { guard, json, type Env } from './_shared'

const MAX_CHARS = 400
const MODELS = ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts']
const VOICE = 'Kore'

interface Context { request: Request; env: Env }

/** Wrap raw 16-bit mono PCM in a WAV header so every browser can play it. */
function pcmToWav(pcm: Uint8Array, sampleRate: number): Uint8Array {
  const out = new Uint8Array(44 + pcm.length)
  const v = new DataView(out.buffer)
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) out[o + i] = s.charCodeAt(i) }
  str(0, 'RIFF'); v.setUint32(4, 36 + pcm.length, true); str(8, 'WAVE')
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true)
  str(36, 'data'); v.setUint32(40, pcm.length, true)
  out.set(pcm, 44)
  return out
}

const fromBase64 = (b64: string) => Uint8Array.from(atob(b64), c => c.charCodeAt(0))

export async function onRequestPost({ request, env }: Context): Promise<Response> {
  if (!env.GEMINI_API_KEY) return json({ error: 'not-configured' }, 503)
  const denied = guard(request, env)
  if (denied) return denied

  let body: { text?: unknown }
  try { body = await request.json() } catch { return json({ error: 'bad-request' }, 400) }
  const text = typeof body.text === 'string' ? body.text.trim() : ''
  // Only Malayalam script: this endpoint reads translations, it is not a general voice service.
  if (!text || text.length > MAX_CHARS || !/[ഀ-ൿ]/.test(text) || /[a-zA-Z]{4,}/.test(text)) return json({ error: 'bad-request' }, 400)

  const send = (model: string, speechConfig: unknown) => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY! },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text }] }], generationConfig: { responseModalities: ['AUDIO'], speechConfig } }),
  })
  // Current voice format first, then the older one if this API version rejects it.
  const speechConfigs = [{ voiceConfig: { voice: VOICE } }, { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } }]

  let res: Response | null = null
  try {
    outer: for (const model of MODELS) {
      for (const sc of speechConfigs) {
        res = await send(model, sc)
        if (res.status === 400) continue
        if (res.status === 404) continue outer
        break outer
      }
    }
  } catch (e) {
    console.error('[tts] network error:', String(e).slice(0, 120))
    return json({ error: 'api' }, 502)
  }
  if (!res || !res.ok) {
    const detail = res ? `${res.status}: ${(await res.text()).replace(/\s+/g, ' ').slice(0, 160)}` : 'no response'
    console.error('[tts] gemini failed:', detail)
    return res?.status === 429 ? json({ error: 'busy' }, 429) : json({ error: 'api' }, 502)
  }
  const data = await res.json() as { candidates?: { content?: { parts?: { inlineData?: { mimeType?: string; data?: string } }[] } }[] }
  const part = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data)?.inlineData
  if (!part?.data) {
    console.error('[tts] no audio in answer')
    return json({ error: 'empty' }, 502)
  }
  const bytes = fromBase64(part.data)
  const mime = (part.mimeType ?? '').toLowerCase()
  // Newer models send a complete WAV; older ones send raw PCM (audio/L16;rate=24000).
  const isWav = mime.includes('wav') || (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46)
  const rate = Number(/rate=(\d+)/.exec(mime)?.[1] ?? 24000)
  const wav = isWav ? bytes : pcmToWav(bytes, rate)
  return new Response(wav, { headers: { 'content-type': 'audio/wav', 'cache-control': 'private, max-age=604800' } })
}
