const CACHE_NAME = 'pmg-gravador-20261013-v1';
const STATIC_FILES = ['/gravador/', '/gravador/index.html', '/gravador/app.js', '/gravador/style.css', '/gravador/manifest.webmanifest', '/assets/pmg-logo.png'];
self.addEventListener('install', event => {event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_FILES)).then(() => self.skipWaiting()));});
self.addEventListener('activate', event => {event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('pmg-gravador-') && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith('/gravador/') && url.pathname !== '/assets/pmg-logo.png') return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) {const copy = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(() => {});}
    return response;
  }).catch(() => caches.match(event.request)));
});
