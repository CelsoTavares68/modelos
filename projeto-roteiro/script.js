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
    navigator.geolocation.watchPosition(p => {
        minhaPos = [p.coords.latitude, p.coords.longitude];
        document.getElementById('status-gps').innerText = "📍 GPS ON";
        atualizarInterface();
    }, null, { enableHighAccuracy: true });
}

async function processarLeitura(codigo) {
    const endereco = dicionario[codigo];
    if (!endereco) return alert("Cód: " + codigo + " não cadastrado!");

    // Chamada para converter endereço em coordenadas (Brasil)
    const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endereco)}`);
    const data = await resp.json();

    if (data.length > 0) {
        const novaCoord = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        entregas.push(novaCoord);
        localStorage.setItem('entregas', JSON.stringify(entregas));
        if (navigator.vibrate) navigator.vibrate(100);
        atualizarInterface();
        alert("Destino Adicionado!");
    } else {
        alert("Endereço não localizado!");
    }
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