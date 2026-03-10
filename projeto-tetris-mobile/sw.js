  const CACHE_NAME = 'fruit-columns-auto-cache';
const assets = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './abertura.mp3',
  './descida.mp3',
  './formarpares.mp3',
  './mil-pontos.mp3',
  './fim.mp3'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(assets))
  );
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(response => {
        const fetchPromise = fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {});
        return response || fetchPromise;
      });
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});

self.addEventListener('message', event => {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});