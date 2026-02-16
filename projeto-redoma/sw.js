const cacheName = 'agenda-redoma-v1';
const assets = ['./', './index.html', './style.css', './script.js', './manifest.json', './icon.png'];

// Instala o service worker e guarda os arquivos no cache
self.addEventListener('install', e => {
  e.waitUntil(caches.open(cacheName).then(cache => cache.addAll(assets)));
});

// Responde mesmo se estiver offline
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});