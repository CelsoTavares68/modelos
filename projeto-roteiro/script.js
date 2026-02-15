  // Variáveis Globais
let dicionario = JSON.parse(localStorage.getItem('dicionario')) || {};
let listaParaEntregar = [];
let html5QrCode;
let mapa, camadaMarcadores, controleRota, minhaPos;

window.onload = () => {
    // Inicializa o mapa focado em Céu Azul, PR
    mapa = L.map('map', { zoomControl: false }).setView([-25.1118, -53.8475], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapa);
    camadaMarcadores = L.layerGroup().addTo(mapa);
    
    configurarGPS();
    iniciarScanner();
};

// --- LOGÍSTICA E IDENTIFICAÇÃO ---

function identificarOrigem(codigo) {
    const c = codigo.toUpperCase().trim();
    if (/^BR\d{10,}/.test(c)) return "🟠 Shopee";
    if (/^[A-Z]{2}\d{9}BR$/.test(c)) return "🟡 Correios";
    if (/^888\d{10,}/.test(c) || /^999\d{10,}/.test(c)) return "🟣 Shein/J&T";
    if (/^\d{10,}$/.test(c)) return "🔵 Mercado Livre";
    return "📦 Encomenda";
}

function identificarSetor(endereco) {
    const end = endereco.toLowerCase();
    if (end.includes("uniao") || end.includes("união")) return "Bairro União";
    if (end.includes("exposição") || end.includes("parque")) return "Pq. Exposições";
    if (end.includes("boa vista")) return "Boa Vista";
    if (end.includes("centro") || end.includes("curitiba")) return "Centro";
    return "Céu Azul";
}

// --- ETAPA 1: SCANNER E LISTA ---

 function iniciarScanner() {
    // Se já houver um scanner rodando, para ele antes de começar
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            comecar();
        }).catch(() => {
            comecar();
        });
    } else {
        comecar();
    }

    function comecar() {
        html5QrCode = new Html5Qrcode("reader");
        const config = { fps: 15, qrbox: { width: 250, height: 150 } };

        html5QrCode.start(
            { facingMode: "environment" }, 
            config,
            onScanSuccess
        ).catch(err => {
            alert("Erro na Câmara: " + err); // Isso dirá se o problema é permissão ou falta de HTTPS
            console.error(err);
        });
    }
}

function onScanSuccess(decodedText) {
    const codigo = decodedText.toUpperCase().trim();
    if (listaParaEntregar.find(item => item.codigo === codigo)) return;

    if (dicionario[codigo]) {
        const info = dicionario[codigo];
        adicionarNaLista(codigo, info);
        vibrarFeedback(true);
    } else {
        vibrarFeedback(false);
        document.getElementById('reader').style.borderColor = "#e74c3c";
        setTimeout(() => document.getElementById('reader').style.borderColor = "#27ae60", 500);
    }
}

function adicionarNaLista(codigo, info) {
    const dados = { 
        codigo, 
        endereco: info.endereco, 
        detalhes: `${identificarOrigem(codigo)} | ${identificarSetor(info.endereco)}` 
    };
    listaParaEntregar.push(dados);
    
    const container = document.getElementById('itens-lidos');
    const itemDiv = document.createElement('div');
    itemDiv.className = 'item-bipado';
    itemDiv.innerHTML = `
        <div class="item-info">
            <strong>${dados.detalhes}</strong>
            <span>📍 ${dados.endereco}</span>
        </div>
        <div class="item-status">✅</div>
    `;
    container.prepend(itemDiv);
    document.getElementById('count').innerText = listaParaEntregar.length;
}

// --- ETAPA 2: MAPA DE ROTA PRÓPRIO ---

async function gerarRota() {
    if (listaParaEntregar.length === 0) {
        alert("Bipe os pacotes primeiro!");
        return;
    }

    mostrarAba('mapa');
    camadaMarcadores.clearLayers();
    if (controleRota) mapa.removeControl(controleRota);

    const waypoints = [];
    if (minhaPos) waypoints.push(L.latLng(minhaPos[0], minhaPos[1]));

    // Mostra um aviso de carregamento
    document.getElementById('status-gps').innerText = "⏳ Calculando...";

    for (let item of listaParaEntregar) {
        const coords = await buscarCoordenadas(item.endereco);
        if (coords) {
            const p = L.latLng(coords[0], coords[1]);
            waypoints.push(p);
            L.marker(p).addTo(camadaMarcadores).bindPopup(item.endereco);
        }
    }

    // Desenha a rota no seu próprio mapa
    controleRota = L.Routing.control({
        waypoints: waypoints,
        router: L.Routing.osrmv1({ serviceUrl: `https://router.project-osrm.org/route/v1` }),
        lineOptions: { styles: [{ color: '#27ae60', opacity: 0.8, weight: 8 }] },
        createMarker: () => null,
        show: false,
        addWaypoints: false
    }).addTo(mapa);

    document.getElementById('status-gps').innerText = "📍 Rota Pronta";
}

async function buscarCoordenadas(endereco) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endereco + ", Céu Azul, Paraná")}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        return data.length > 0 ? [data[0].lat, data[0].lon] : null;
    } catch { return null; }
}

// --- FUNÇÕES DE APOIO ---

function mostrarAba(aba) {
    document.getElementById('reader-container').style.display = (aba === 'scanner') ? 'block' : 'none';
    document.getElementById('lista-scan').style.display = (aba === 'scanner') ? 'block' : 'none';
    document.getElementById('map').style.display = (aba === 'mapa') ? 'block' : 'none';
    document.getElementById('aba-config').style.display = (aba === 'config') ? 'block' : 'none';
}

function configurarGPS() {
    navigator.geolocation.watchPosition(
        (pos) => { minhaPos = [pos.coords.latitude, pos.coords.longitude]; },
        null, { enableHighAccuracy: true }
    );
}

function importarLista() {
    const texto = document.getElementById('dadosEntregas').value;
    texto.split('\n').forEach(linha => {
        if (!linha.includes(',')) return;
        const [cod, ...end] = linha.split(',');
        dicionario[cod.trim().toUpperCase()] = { endereco: end.join(',').trim() };
    });
    localStorage.setItem('dicionario', JSON.stringify(dicionario));
    alert("Lista de Céu Azul Importada!");
    mostrarAba('scanner');
}

function vibrarFeedback(sucesso) {
    if (navigator.vibrate) navigator.vibrate(sucesso ? 100 : [50, 50, 50]);
}

function limparSessao() {
    if(confirm("Reiniciar rota?")) {
        listaParaEntregar = [];
        document.getElementById('itens-lidos').innerHTML = "";
        document.getElementById('count').innerText = "0";
        if (controleRota) mapa.removeControl(controleRota);
        camadaMarcadores.clearLayers();
    }
}