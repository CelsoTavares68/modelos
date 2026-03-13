const CACHE_NAME = 'designacoes-v' + Date.now(); // Gera um nome único baseado no tempo

// Arquivos para cache inicial
const assets = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf.plugin.autotable.min.js"
];

// Instalação: Cacheia os arquivos
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(assets);
    })
  );
  self.skipWaiting(); // Força o novo SW a assumir o controle imediatamente
});

// Ativação: Limpa caches antigos automaticamente
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
});

// Busca (Fetch): Tenta rede primeiro, se falhar, usa cache (Estratégia Network First)
// Isso garante que se o usuário tiver internet, ele sempre verá a versão mais nova do GitHub
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});