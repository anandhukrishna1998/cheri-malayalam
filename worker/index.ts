/**
 * Cloudflare Workers entry point (used when the site is deployed as a Worker
 * with static assets, which is what the Cloudflare dashboard creates by default).
 *
 * - POST /api/translate → the AI translation function (same code as the Pages Function)
 * - everything else     → the built app in ./dist
 *
 * A Cloudflare Pages project ignores this file and uses functions/api/translate.ts directly.
 */
import { onRequestPost } from '../functions/api/translate'

interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> }
  GEMINI_API_KEY?: string
  ANTHROPIC_API_KEY?: string
  TRANSLATE_CODE?: string
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url)
    if (pathname === '/api/translate') {
      if (request.method === 'POST') return onRequestPost({ request, env })
      return new Response(JSON.stringify({ error: 'method' }), {
        status: 405,
        headers: { 'content-type': 'application/json; charset=utf-8', allow: 'POST' },
      })
    }
    return env.ASSETS.fetch(request)
  },
}
