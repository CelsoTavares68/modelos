 const CACHE_NAME = 'enduro-mobile-v9'; // Incremente aqui para disparar o aviso de atualização
const assets = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './chuva.mp3',
  './trovao.mp3',
  './vitoria.mp3',
  './game_over.mp3',
  './bandeira_vitoria.mp4',
  './game_over.mp4'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(assets))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
});

// Listener para a mensagem 'skipWaiting' enviada pelo script.js
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(response => {
        const fetchPromise = fetch(event.request).then(networkResponse => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
        return response || fetchPromise; 
      });
    })
  );
});
 