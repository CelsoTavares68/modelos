 const cacheName = 'agenda-redoma-v14'; // Mudamos para v14
const assets = ['./', './index.html', './style.css', './script.js?v=2', './manifest.json', './icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(cacheName).then(cache => cache.addAll(assets))
  );
  self.skipWaiting(); // Força o código novo a assumir o lugar do velho imediatamente
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys.map(key => {
        if (key !== cacheName) return caches.delete(key); // Apaga as sobras da v13
      }));
    })
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});