  const CACHE_NAME = 'enduro-mobile-v14'; 
const assets = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './chuva.mp3', // Adicione o arquivo de chuva
  './trovao.mp3'  // Adicione o arquivo de trovão
];

self.addEventListener('install', event => {
  self.skipWaiting(); // Força o novo SW a assumir o controle imediatamente
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
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(response => {
        const fetchPromise = fetch(event.request).then(networkResponse => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
        return response || fetchPromise; // Retorna cache se houver, mas atualiza em segundo plano
      });
    })
  );
});