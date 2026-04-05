  const CACHE_NAME = 'chess-medieval-v4';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js'
];

// Instalação: Guarda os ficheiros essenciais
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting(); // Força a atualização imediata
});

// Ativação: Limpa caches de versões antigas
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    ))
  );
});

// ESTRATÉGIA: Rede primeiro, Cache depois
// Isso garante que se houver internet, ele saca o ficheiro novo do GitHub
self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});