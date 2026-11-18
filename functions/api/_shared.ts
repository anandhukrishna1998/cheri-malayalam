/** Helpers shared by the /api functions (files starting with « _ » are not routes). */

export interface Env { GEMINI_API_KEY?: string; ANTHROPIC_API_KEY?: string; TRANSLATE_CODE?: string }

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

/**
 * Checks done before any paid / quota-limited call:
 * the secret code (if TRANSLATE_CODE is set) and, for browsers, that the request comes from the app itself.
 * Returns an error response, or null when the request may proceed.
 */
export function guard(request: Request, env: Env): Response | null {
  if (env.TRANSLATE_CODE && request.headers.get('x-translate-code') !== env.TRANSLATE_CODE) return json({ error: 'bad-code' }, 401)
  const origin = request.headers.get('origin')
  if (origin) {
    let sameHost = false
    try { sameHost = new URL(origin).host === new URL(request.url).host } catch { /* e.g. « Origin: null » */ }
    if (!sameHost) return json({ error: 'forbidden' }, 403)
  }
  return null
}
