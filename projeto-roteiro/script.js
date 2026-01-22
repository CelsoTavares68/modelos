 // 1. Variáveis Globais
let entregas = JSON.parse(localStorage.getItem('entregas')) || [];
let mapa;
let minhaLocalizacao = null;
let marcadorUsuario;
let camadaMarcadores = L.layerGroup();
let controleRota = null; // Guardará a linha da rota

// 2. Inicialização ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    initMapa();
    obterLocalizacaoAtual();
    initScanner();
    atualizarInterface();
});

// 3. Configurar o Mapa
function initMapa() {
    // Inicia focado no Brasil
    mapa = L.map('map').setView([-15.78, -47.92], 4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(mapa);
    
    camadaMarcadores.addTo(mapa);
}

// 4. Pegar Localização do Sistema (Brasil)
function obterLocalizacaoAtual() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
            minhaLocalizacao = [pos.coords.latitude, pos.coords.longitude];
            
            if (marcadorUsuario) mapa.removeLayer(marcadorUsuario);
            
            // Marcador azul para sua posição
            marcadorUsuario = L.circleMarker(minhaLocalizacao, {
                color: '#3498db',
                radius: 10,
                fillOpacity: 0.8
            }).addTo(mapa).bindPopup("Você está aqui").openPopup();
            
            mapa.setView(minhaLocalizacao, 14);
            atualizarInterface(); // Recalcula a rota a partir daqui
        }, (err) => {
            console.error("Erro GPS:", err);
            alert("Por favor, ative o GPS para iniciar a rota.");
        });
    }
}

// 5. Configurar o Scanner (Câmera Traseira)
function initScanner() {
    const html5QrCode = new Html5Qrcode("reader");
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    html5QrCode.start(
        { facingMode: "environment" }, 
        config, 
        (decodedText) => {
            const coords = decodedText.split(',').map(Number);
            if (coords.length === 2 && !isNaN(coords[0])) {
                entregas.push(coords);
                localStorage.setItem('entregas', JSON.stringify(entregas));
                
                if (navigator.vibrate) navigator.vibrate(100);
                atualizarInterface();
            }
        }
    ).catch(err => console.error("Erro na câmara:", err));
}

// 6. Atualizar Lista e Gerar Roteiro
function atualizarInterface() {
    // Atualizar contador
    document.getElementById('count').innerText = entregas.length;
    
    // Atualizar lista visual
    const lista = document.getElementById('list');
    lista.innerHTML = "";
    camadaMarcadores.clearLayers();

    // Limpar rota anterior se existir
    if (controleRota) {
        mapa.removeControl(controleRota);
    }

    let pontosParaRota = [];

    // Adicionar ponto de partida (Sua Localização)
    if (minhaLocalizacao) {
        pontosParaRota.push(L.latLng(minhaLocalizacao[0], minhaLocalizacao[1]));
    }

    // Processar cada entrega
    entregas.forEach((c, i) => {
        // HTML da lista
        const div = document.createElement('div');
        div.className = 'delivery-item';
        div.innerHTML = `<strong>Entrega #${i+1}</strong><br>Lat: ${c[0].toFixed(4)} Lon: ${c[1].toFixed(4)}`;
        lista.appendChild(div);

        // Marcador no mapa
        L.marker([c[0], c[1]]).addTo(camadaMarcadores).bindPopup(`Entrega ${i+1}`);
        
        // Adicionar ao array do roteiro
        pontosParaRota.push(L.latLng(c[0], c[1]));
    });

    // Criar a rota pelas ruas (precisa de pelo menos 2 pontos)
    if (pontosParaRota.length >= 2) {
        controleRota = L.Routing.control({
            waypoints: pontosParaRota,
            lineOptions: {
                styles: [{ color: '#27ae60', weight: 6, opacity: 0.7 }]
            },
            addWaypoints: false,
            draggableWaypoints: false,
            show: false, // Esconde o painel de texto lateral para não poluir
            language: 'pt-BR'
        }).addTo(mapa);
    }
}

// 7. Limpar dados
function limparDados() {
    if (confirm("Deseja apagar todas as entregas?")) {
        entregas = [];
        localStorage.clear();
        if (controleRota) mapa.removeControl(controleRota);
        atualizarInterface();
    }
}