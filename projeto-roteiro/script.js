 // Variáveis de controle
let entregas = JSON.parse(localStorage.getItem('entregas')) || [];
let mapa;
let minhaLocalizacao = null;
let marcadorUsuario;
let camadaMarcadores = L.layerGroup();
let controleRota = null;

// Inicialização segura
window.onload = () => {
    initMapa();
    obterLocalizacaoAtual();
    initScanner();
    atualizarInterface();
};

function initMapa() {
    // Foco inicial no Brasil
    mapa = L.map('map', {
        tap: false, // Melhora a interação em telas touch
        zoomControl: false // Vamos colocar os botões em lugar melhor se precisar
    }).setView([-15.78, -47.92], 4);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapa);
    camadaMarcadores.addTo(mapa);
    L.control.zoom({ position: 'topright' }).addTo(mapa);
}

function obterLocalizacaoAtual() {
    if (navigator.geolocation) {
        // watchPosition é melhor para quem está em movimento (entregadores)
        navigator.geolocation.watchPosition((pos) => {
            minhaLocalizacao = [pos.coords.latitude, pos.coords.longitude];
            
            if (marcadorUsuario) mapa.removeLayer(marcadorUsuario);
            
            marcadorUsuario = L.circleMarker(minhaLocalizacao, {
                color: '#3498db',
                fillColor: '#3498db',
                fillOpacity: 0.9,
                radius: 8
            }).addTo(mapa).bindPopup("Sua posição");

            // Só centraliza automaticamente na primeira vez para não irritar o usuário
            if (!mapa.getBounds().contains(minhaLocalizacao)) {
                mapa.setView(minhaLocalizacao, 15);
            }
            
            atualizarInterface();
        }, (err) => {
            console.warn("Erro GPS:", err.message);
        }, { enableHighAccuracy: true });
    }
}

function initScanner() {
    // Usamos a classe Html5Qrcode para ter mais controle no mobile
    const html5QrCode = new Html5Qrcode("reader");
    const config = { fps: 10, qrbox: { width: 200, height: 200 } };

    html5QrCode.start(
        { facingMode: "environment" }, // Força câmera traseira
        config,
        (decodedText) => {
            // Lógica de captura
            const coords = decodedText.split(',').map(Number);
            if (coords.length === 2 && !isNaN(coords[0])) {
                // Evita duplicados (importante para 80 entregas)
                const jaExiste = entregas.some(e => e[0] === coords[0] && e[1] === coords[1]);
                if (!jaExiste) {
                    entregas.push(coords);
                    localStorage.setItem('entregas', JSON.stringify(entregas));
                    if (navigator.vibrate) navigator.vibrate(100);
                    atualizarInterface();
                }
            }
        }
    ).catch(err => {
        document.getElementById('reader').innerHTML = `<p style="color:red; padding:20px;">Erro na câmera: ${err}. Verifique as permissões.</p>`;
    });
}

function atualizarInterface() {
    document.getElementById('count').innerText = entregas.length;
    const lista = document.getElementById('list');
    lista.innerHTML = "";
    camadaMarcadores.clearLayers();

    if (controleRota) mapa.removeControl(controleRota);

    let pontosParaRota = [];
    if (minhaLocalizacao) pontosParaRota.push(L.latLng(minhaLocalizacao[0], minhaLocalizacao[1]));

    entregas.forEach((c, i) => {
        const div = document.createElement('div');
        div.className = 'delivery-item';
        div.innerHTML = `<strong>#${i+1}</strong> - Lat: ${c[0].toFixed(3)} | Lon: ${c[1].toFixed(3)}`;
        lista.appendChild(div);

        L.marker([c[0], c[1]]).addTo(camadaMarcadores);
        pontosParaRota.push(L.latLng(c[0], c[1]));
    });

    if (pontosParaRota.length >= 2) {
        controleRota = L.Routing.control({
            waypoints: pontosParaRota,
            lineOptions: { styles: [{ color: '#27ae60', weight: 5 }] },
            addWaypoints: false,
            draggableWaypoints: false,
            show: false, // Essencial no mobile para não cobrir o mapa
            language: 'pt-BR'
        }).addTo(mapa);
    }
}

function limparDados() {
    if (confirm("Limpar todas as entregas?")) {
        entregas = [];
        localStorage.clear();
        location.reload(); // Recarrega para limpar tudo do mapa
    }
}