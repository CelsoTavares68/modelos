   const cacheName = 'agenda-redoma-v30'; // Mudamos para v30
const assets = ['./', './index.html', './style.css', './script.js?v=30', './manifest.json', './icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(cacheName).then(cache => cache.addAll(assets)));
  self.skipWaiting(); 
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => {
    return Promise.all(keys.map(key => {
      if (key !== cacheName) return caches.delete(key);
    }));
  }));
  return self.clients.claim(); // ESTA LINHA É O QUE FALTA NO SEU MOBILE
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});