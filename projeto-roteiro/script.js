 // Variáveis de controle
let entregas = JSON.parse(localStorage.getItem('entregas')) || [];
let mapa;
let marcadorUsuario;
let camadaEntregas = L.layerGroup(); // Agrupa marcadores para limpar fácil

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    initMapa();
    initScanner();
    atualizarInterface();
    obterLocalizacaoAtual();
});

function initMapa() {
    // Começa no Brasil
    mapa = L.map('map').setView([-15.78, -47.92], 4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapa);
    camadaEntregas.addTo(mapa);
}

function obterLocalizacaoAtual() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            
            if (marcadorUsuario) mapa.removeLayer(marcadorUsuario);
            
            marcadorUsuario = L.circleMarker([lat, lng], {
                color: 'blue',
                radius: 12,
                fillOpacity: 0.9
            }).addTo(mapa).bindPopup("Você está aqui").openPopup();
            
            mapa.setView([lat, lng], 14);
        });
    }
}

 function initScanner() {
    // Configurações do scanner
    const config = { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        // Esta linha é a chave: 'environment' força a câmara traseira
        aspectRatio: 1.0 
    };

    const scanner = new Html5QrcodeScanner("reader", config, /* verbose= */ false);
    
    scanner.render((text) => {
        const coords = text.split(',').map(Number);
        if (coords.length === 2 && !isNaN(coords[0])) {
            entregas.push(coords);
            localStorage.setItem('entregas', JSON.stringify(entregas));
            atualizarInterface();
            
            // Feedback tátil (vibração) se estiver no telemóvel
            if (navigator.vibrate) navigator.vibrate(100);
            
            alert("Entrega #" + entregas.length + " salva!");
        }
    }, (error) => {
        // Erros de leitura são normais enquanto a câmara procura o código
        // Podemos ignorar para não encher o console
    });
}

function atualizarInterface() {
    document.getElementById('count').innerText = entregas.length;
    const lista = document.getElementById('list');
    lista.innerHTML = "";
    camadaEntregas.clearLayers();

    entregas.forEach((c, i) => {
        // Adiciona à lista lateral
        const div = document.createElement('div');
        div.className = 'delivery-item';
        div.innerHTML = `<strong>Entrega ${i+1}</strong><br>Lat: ${c[0].toFixed(4)} | Lon: ${c[1].toFixed(4)}`;
        lista.appendChild(div);

        // Adiciona marcador no mapa
        L.marker([c[0], c[1]]).addTo(camadaEntregas)
            .bindPopup(`Parada ${i+1}`);
    });
}

function limparDados() {
    if (confirm("Apagar todas as entregas do dia?")) {
        entregas = [];
        localStorage.clear();
        atualizarInterface();
    }
}