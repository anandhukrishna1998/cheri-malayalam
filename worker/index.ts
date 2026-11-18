/**
 * Cloudflare Workers entry point (used when the site is deployed as a Worker
 * with static assets, which is what the Cloudflare dashboard creates by default).
 *
 * - POST /api/translate → AI translation (same code as the Pages Function)
 * - POST /api/tts       → reads an AI translation aloud (Gemini text-to-speech)
 * - everything else     → the built app in ./dist
 *
 * A Cloudflare Pages project ignores this file and uses functions/api/*.ts directly.
 */
import { onRequestPost as translate } from '../functions/api/translate'
import { onRequestPost as tts } from '../functions/api/tts'
import type { Env as ApiEnv } from '../functions/api/_shared'

interface Env extends ApiEnv {
  ASSETS: { fetch: (request: Request) => Promise<Response> }
}

const routes: Record<string, (ctx: { request: Request; env: ApiEnv }) => Promise<Response>> = {
  '/api/translate': translate,
  '/api/tts': tts,
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const route = routes[new URL(request.url).pathname]
    if (route) {
      if (request.method === 'POST') return route({ request, env })
      return new Response(JSON.stringify({ error: 'method' }), {
        status: 405,
        headers: { 'content-type': 'application/json; charset=utf-8', allow: 'POST' },
      })
    }
    return env.ASSETS.fetch(request)
  },
}
