// LifeOS minimal service worker: installability + offline app-shell.
// Network-first for same-origin GETs, falling back to cache (then /now) when the
// machine is asleep or offline. Deliberately simple — capture-while-offline is
// handled client-side (localStorage queue in the capture box).
const CACHE = 'lifeos-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return // never cache API responses

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone()
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {})
        return res
      })
      .catch(() => caches.match(req).then((m) => m || caches.match('/now'))),
  )
})
