   let dicionario = JSON.parse(localStorage.getItem('dicionario')) || {};
let entregas = JSON.parse(localStorage.getItem('entregas')) || [];
let mapa, camadaMarcadores, controleRota, minhaPos;

window.onload = () => {
    mapa = L.map('map', { zoomControl: false }).setView([-15.78, -47.92], 4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapa);
    camadaMarcadores = L.layerGroup().addTo(mapa);
    
    configurarGPS();
    initScanner();
    atualizarInterface();
};

// Alternar entre abas no mobile
function mostrarAba(nome) {
    document.querySelectorAll('.aba-content').forEach(a => a.classList.remove('ativa'));
    if (nome !== 'mapa') {
        document.getElementById(`aba-${nome}`).classList.add('ativa');
    }
}

 function configurarGPS() {
    // navigator.geolocation é a ferramenta que "fala" com o GPS do telemóvel
    navigator.geolocation.watchPosition(
        (pos) => {
            // Sucesso: Guardamos a sua latitude e longitude
            minhaPos = [pos.coords.latitude, pos.coords.longitude];
            
            // Atualizamos o texto no topo do app
            document.getElementById('status-gps').innerText = "📍 GPS ON";
            
            // Movemos o mapa para onde você está
            mapa.setView(minhaPos, 15);
        },
        (erro) => {
            // Caso o GPS esteja desligado ou o utilizador recuse
            console.error("Erro no GPS: ", erro.message);
            document.getElementById('status-gps').innerText = "📍 GPS OFF";
        },
        {
            enableHighAccuracy: true, // Força o uso do GPS (mais preciso que o Wi-Fi)
            timeout: 5000,            // Espera até 5 segundos por um sinal
            maximumAge: 0             // Não aceita localizações antigas (cache)
        }
    );
}

function atualizarInterface() {
    document.getElementById('count').innerText = entregas.length;
    camadaMarcadores.clearLayers();
    if (controleRota) mapa.removeControl(controleRota);

    let rotaPoints = [];
    if (minhaPos) rotaPoints.push(L.latLng(minhaPos[0], minhaPos[1]));

    const listaDiv = document.getElementById('list');
    listaDiv.innerHTML = "";

    entregas.forEach((c, i) => {
        L.marker(c).addTo(camadaMarcadores);
        rotaPoints.push(L.latLng(c[0], c[1]));
        
        const item = document.createElement('div');
        item.className = 'delivery-item';
        item.innerHTML = `<span><b>#${i+1}</b></span> <span>Destino Localizado</span>`;
        listaDiv.appendChild(item);
    });

    if (rotaPoints.length >= 2) {
        controleRota = L.Routing.control({
            waypoints: rotaPoints,
            show: false,
            language: 'pt-BR',
            lineOptions: { styles: [{ color: '#27ae60', weight: 6 }] }
        }).addTo(mapa);
    }
}

function importarLista() {
    const texto = document.getElementById('dadosEntregas').value;
    texto.split('\n').forEach(l => {
        const [cod, ...end] = l.split(',');
        if(cod && end) dicionario[cod.trim()] = end.join(',').trim();
    });
    localStorage.setItem('dicionario', JSON.stringify(dicionario));
    alert("Dados Guardados!");
    mostrarAba('mapa');
}

function limparDados() {
    if(confirm("Limpar tudo?")) {
        localStorage.clear();
        location.reload();
    }
}

function initScanner() {
    new Html5Qrcode("reader").start({ facingMode: "environment" }, 
    { fps: 10, qrbox: 200 }, codigo => processarLeitura(codigo));
}