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

// Instalação inicial
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(assets))
  );
  self.skipWaiting();
});

// Estratégia Stale-While-Revalidate (Usa o cache mas atualiza por trás)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(response => {
        const fetchPromise = fetch(event.request).then(networkResponse => {
          // Se a resposta for válida, atualiza o cache para a próxima vez
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {}); // Ignora erros de rede se estiver offline

        return response || fetchPromise;
      });
    })
  );
});

// Força a ativação e limpa caches antigos se existirem
self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});

// Escuta mensagem de pular espera (mantido por segurança)
self.addEventListener('message', event => {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
}); 
  