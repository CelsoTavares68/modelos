 const CACHE_NAME = 'enduro-auto-update';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request)
            .then(response => {
                const resClone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});