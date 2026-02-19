 const cacheName = 'agenda-redoma-final';

self.addEventListener('install', e => {
  self.skipWaiting(); 
});

self.addEventListener('activate', e => {
  // Deleta qualquer cache antigo para não sobrar lixo
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.map(key => caches.delete(key))
  )));
  return self.clients.claim(); 
});

self.addEventListener('fetch', e => {
  // FORÇA buscar sempre na internet. Se falhar, tenta o cache.
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});