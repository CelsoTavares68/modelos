   const cacheName = 'agenda-redoma-v102';
const assets = ['./', './index.html', './style.css', './script.js?v=100', './manifest.json'];

// Instala e força a atualização
self.addEventListener('install', e => {
  self.skipWaiting(); 
  e.waitUntil(caches.open(cacheName).then(cache => cache.addAll(assets)));
});

// Limpa caches antigos e assume o controlo imediato
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.map(key => key !== cacheName && caches.delete(key))
  )));
  return self.clients.claim(); 
});

// ESTA PARTE FALTA NO TEU: Entrega os ficheiros novos ao navegador
self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});