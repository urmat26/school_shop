const CACHE = 'school-shop-v3';
const STATIC = [
  '/',
  '/index.html',
  '/create.html',
  '/item.html',
  '/favorites.html',
  '/profile.html',
  '/chat.html',
  '/history.html',
  '/user.html',
  '/about.html',
  '/offline.html',
  '/style.css',
  '/lang.js',
  '/theme.js',
  '/config.js',
  '/api.js',
  '/auth.js',
  '/app.js',
  '/create.js',
  '/item.js',
  '/favorites.js',
  '/profile.js',
  '/chat.js',
  '/history.js',
  '/user.js',
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
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/offline.html');
        }
        return new Response('', { status: 408 });
      });
    })
  );
});
