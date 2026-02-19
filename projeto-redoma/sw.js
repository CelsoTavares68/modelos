    const cacheName = 'agenda-redoma-v103'; // Versão 103
const assets = ['./', './index.html', './style.css', './script.js?v=103', './manifest.json']; // Mudei para v103 aqui

self.addEventListener('install', e => {
  self.skipWaiting(); 
  e.waitUntil(caches.open(cacheName).then(cache => cache.addAll(assets)));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.map(key => key !== cacheName && caches.delete(key))
  )));
  return self.clients.claim(); 
});

self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});