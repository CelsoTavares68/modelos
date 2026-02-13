  const CACHE_NAME = 'fruit-columns-v5'; // Incremente sempre que mudar algo

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
  self.skipWaiting(); // Força a ativação imediata
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(assets);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache); // Remove caches antigos
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});

// Escuta o comando de pular espera vindo do navegador
self.addEventListener('message', event => {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});