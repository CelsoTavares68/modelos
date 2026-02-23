   const CACHE_NAME = 'enduro-auto-update-v1'; // Pode manter este nome fixo agora

// Estratégia: Tenta buscar na rede primeiro. Se houver internet, ele ignora o cache e atualiza.
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Se a rede responder, guarda a cópia nova no cache e retorna
        const resClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, resClone);
        });
        return response;
      })
      .catch(() => caches.match(event.request)) // Se estiver offline, usa o cache
  );
});

// Força o novo SW a ativar-se mal é detetado
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});