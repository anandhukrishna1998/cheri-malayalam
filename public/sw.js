// Offline support: network-first for the page, cache-first for everything else.
const CACHE = 'cheri-malayalam-v5'
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['/', '/manifest.webmanifest', '/icon.svg'])))
  self.skipWaiting()
})
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))))
  self.clients.claim()
})
self.addEventListener('fetch', e => {
  const req = e.request
  if (req.method !== 'GET') return
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put('/', copy)); return r }).catch(() => caches.match('/')))
    return
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r.ok && (r.type === 'basic' || r.type === 'cors')) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)) }
    return r
  })))
})
