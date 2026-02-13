 const CACHE_NAME = 'fruit-columns-v2';
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

// Instala o Service Worker e guarda os arquivos e áudios no cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(assets);
    })
  );
});

// Responde com o cache quando estiver offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});