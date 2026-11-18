// Offline support: network-first for the page, cache-first for everything else,
// with full HTTP 206 Range support for iOS Safari / WebKit audio playback.
const CACHE = 'cheri-malayalam-v8'

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['/', '/manifest.webmanifest', '/icon.svg'])))
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))))
  self.clients.claim()
})

async function handleRange(req) {
  const cache = await caches.open(CACHE)
  const url = new URL(req.url)
  const cleanReq = new Request(url.href)
  let res = await cache.match(cleanReq)

  if (!res) {
    try {
      const netRes = await fetch(cleanReq)
      if (netRes.ok && netRes.status === 200 && (netRes.type === 'basic' || netRes.type === 'cors')) {
        await cache.put(cleanReq, netRes.clone()).catch(() => {})
      }
      res = netRes
    } catch {
      return fetch(req)
    }
  }

  const range = req.headers.get('range')
  if (!range) return res

  const buf = await res.arrayBuffer()
  const total = buf.byteLength
  const match = /bytes=(\d+)-(\d*)/.exec(range)
  if (!match) return res

  const start = parseInt(match[1], 10)
  const end = match[2] ? parseInt(match[2], 10) : total - 1
  if (start >= total || end >= total) {
    return new Response('', {
      status: 416,
      headers: { 'Content-Range': `bytes */${total}` }
    })
  }

  const chunk = buf.slice(start, end + 1)
  return new Response(chunk, {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Type': res.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Range': `bytes ${start}-${end}/${total}`,
      'Content-Length': String(chunk.byteLength),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  })
}

self.addEventListener('fetch', e => {
  const req = e.request
  if (req.method !== 'GET') return

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(r => {
          const copy = r.clone()
          caches.open(CACHE).then(c => c.put('/', copy)).catch(() => {})
          return r
        })
        .catch(() => caches.match('/'))
    )
    return
  }

  // Range requests (iOS Safari audio playback & seeking)
  if (req.headers.has('range')) {
    e.respondWith(handleRange(req))
    return
  }

  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (r.ok && r.status === 200 && (r.type === 'basic' || r.type === 'cors')) {
        const copy = r.clone()
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {})
      }
      return r
    }))
  )
})
