      const cacheName = 'agenda-redoma-v50'; // Mude para v50
// ... restante dos assets ...

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => {
    return Promise.all(keys.map(key => {
      if (key !== cacheName) return caches.delete(key);
    }));
  }));
  return self.clients.claim(); // ESSA LINHA É VITAL PARA O MOBILE
});