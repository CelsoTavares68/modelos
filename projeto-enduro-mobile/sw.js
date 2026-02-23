   const CACHE_NAME = 'enduro-dynamic-cache'; // Nome fixo, não precisa mais mudar

// Lista de arquivos para cache inicial (offline)
const assets = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './chuva.mp3',
  './trovao.mp3',
  './vitoria.mp3',
  './game_over.mp3',
  './bandeira_vitoria.mp4',
  './game_over.mp4'
];

// Instalação: Abre o cache e salva os arquivos
self.addEventListener('install', event => {
  self.skipWaiting(); // Força o novo SW a assumir o controle imediatamente
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(assets))
  );
});

// Ativação: Limpa caches antigos e assume controle das abas
self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim()); 
});

// A MÁGICA DA ATUALIZAÇÃO AUTOMÁTICA:
// Estratégia "Stale-While-Revalidate"
// Ele entrega o que está no cache rápido (pro jogo abrir na hora), 
// mas busca a versão nova na rede em segundo plano e atualiza o cache.
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(response => {
        const fetchPromise = fetch(event.request).then(networkResponse => {
          // Atualiza o cache com a nova versão encontrada na rede
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        }).catch(() => {}); // Se estiver offline, apenas ignora o erro de rede

        // Retorna a versão do cache (rápida) ou a da rede (se não houver cache)
        return response || fetchPromise;
      });
    })
  );
});

// Listener para forçar atualização se o HTML mandar um skipWaiting
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});