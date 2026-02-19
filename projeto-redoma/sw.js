     const cacheName = 'agenda-redoma-v25'; // Aumente para v25
const assets = ['./', './index.html', './style.css', './script.js?v=25', './manifest.json', './icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(cacheName).then(cache => cache.addAll(assets)));
  self.skipWaiting(); // Força a instalação imediata
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => {
    return Promise.all(keys.map(key => {
      if (key !== cacheName) return caches.delete(key); // Apaga caches velhos
    }));
  }));
  return self.clients.claim(); // OBRIGA o tablet a usar o código novo agora
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});