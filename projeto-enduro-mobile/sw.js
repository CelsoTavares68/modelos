const CACHE_NAME = 'enduro-mobile-v1';
const assets = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json'
];

// Instala o Service Worker e guarda os arquivos no cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Enduro Cache: Arquivos guardados com sucesso!');
      return cache.addAll(assets);
    })
  );
});

// Ativa o SW e remove caches antigos se houver
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      );
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