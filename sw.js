const CACHE = 'school-shop-v1';
const STATIC = [
  '/',
  '/index.html',
  '/create.html',
  '/item.html',
  '/favorites.html',
  '/profile.html',
  '/style.css',
  '/theme.js',
  '/config.js',
  '/api.js',
  '/auth.js',
  '/create.js',
  '/item.js',
  '/favorites.js',
  '/profile.js',
  '/favicon.svg',
  '/logo.png',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(STATIC))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/') || event.request.url.includes('jsonbin') || event.request.url.includes('imgbb')) {
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
