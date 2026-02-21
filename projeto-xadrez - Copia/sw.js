 const CACHE_NAME = 'chess-v' + Date.now(); // Nome único força atualização no navegador
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js'
];

self.addEventListener('install', (e) => {
  self.skipWaiting(); // Força o novo SW a assumir o controle imediatamente
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (e) => {
  // Limpa caches antigos automaticamente
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    ))
  );
});

// Estratégia: Tenta rede primeiro. Se falhar (offline), usa o cache.
self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});