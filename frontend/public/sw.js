const APP_CACHE = 'travel-planner-pro-v1'
const RUNTIME_CACHE = 'travel-planner-runtime-v1'
const TILE_CACHE = 'travel-planner-tiles-v1'
const APP_SHELL = ['/', '/manifest.webmanifest', '/favicon.svg', '/pwa-icon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![APP_CACHE, RUNTIME_CACHE, TILE_CACHE].includes(key))
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (!url.protocol.startsWith('http')) {
    return
  }
  const isTileRequest = url.hostname.includes('cartocdn.com') || url.hostname.includes('openstreetmap.org') || url.hostname.includes('unpkg.com')
  const isApiRequest = url.pathname.startsWith('/api/') || request.url.includes('/api/')

  if (isTileRequest) {
    event.respondWith(cacheFirst(request, TILE_CACHE))
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, APP_CACHE))
    return
  }

  if (isApiRequest) {
    event.respondWith(networkFirst(request, RUNTIME_CACHE))
    return
  }

  event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE))
})

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  try {
    const response = await fetch(request)
    if (response.ok && request.url.startsWith('http')) {
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    const cached = await cache.match(request)
    if (cached) return cached
    throw error
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok && request.url.startsWith('http')) {
    cache.put(request, response.clone())
  }
  return response
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok && request.url.startsWith('http')) {
        cache.put(request, response.clone())
      }
      return response
    })
    .catch(() => cached || Response.error())

  return cached || networkPromise
}
