   const CACHE_NAME = 'enduro-mobile-v46'; 

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
  // Isso força a nova versão a ficar "esperando" para ser ativada
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

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});

// Escuta a mensagem de "pular espera" vinda do botão de atualizar
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
 