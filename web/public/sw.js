/*
 * Service worker mínimo para que la app sea instalable (PWA).
 * Estrategia: red primero, sin cachear datos de Supabase; solo se
 * cachea el "shell" estático como respaldo si no hay conexión.
 */
const CACHE = 'dicor-shell-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(['/'])))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  // Nunca interceptar llamadas a Supabase ni peticiones que no sean GET
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        // Cachea los assets estáticos del build a medida que se usan
        if (res.ok && (url.pathname.startsWith('/assets/') || url.pathname === '/')) {
          const copia = res.clone()
          caches.open(CACHE).then((cache) => cache.put(event.request, copia))
        }
        return res
      })
      .catch(() => caches.match(event.request).then((hit) => hit ?? caches.match('/')))
  )
})
