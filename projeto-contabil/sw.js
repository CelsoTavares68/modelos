// 1. Nome do Cache (Mude a versão 'v1' sempre que atualizar o código do site)
const CACHE_NAME = 'fluxo-caixa-v2';

// 2. Lista de ficheiros que devem ser guardados para uso offline
const assets = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js'
];

// 3. Evento de Instalação: Guarda os ficheiros no dispositivo
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('App Fluxo de Caixa: Guardando ficheiros em cache...');
      return cache.addAll(assets);
    })
  );
});

// 4. Evento de Ativação: Limpa caches de versões anteriores
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      );
    })
  );
  console.log('App Fluxo de Caixa: Service Worker pronto e atualizado!');
});

// 5. Evento Fetch: Tenta carregar do cache primeiro; se não houver, vai à rede
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      return cachedResponse || fetch(event.request);
    })
  );
});