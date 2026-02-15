 let dicionario = JSON.parse(localStorage.getItem('dicionario')) || {};
let listaParaEntregar = [];
let html5QrCode;

window.onload = () => {
    iniciarScanner();
};

function iniciarScanner() {
    html5QrCode = new Html5Qrcode("reader");
    const config = { fps: 10, qrbox: { width: 250, height: 150 } };

    html5QrCode.start(
        { facingMode: "environment" }, 
        config,
        onScanSuccess
    );
}

function onScanSuccess(decodedText) {
    const codigo = decodedText.toUpperCase().trim();
    
    // Verifica se já não bipamos esse pacote
    if (listaParaEntregar.find(item => item.codigo === codigo)) return;

    if (dicionario[codigo]) {
        const info = dicionario[codigo];
        adicionarNaLista(codigo, info);
        vibrarCelular(); // Feedback tátil
    } else {
        console.log("Código não cadastrado: " + codigo);
    }
}

function adicionarNaLista(codigo, info) {
    listaParaEntregar.push({ codigo, ...info });
    
    const container = document.getElementById('itens-lidos');
    const itemDiv = document.createElement('div');
    itemDiv.className = 'item-bipado';
    itemDiv.innerHTML = `
        <div class="item-info">
            <strong>${info.detalhes}</strong>
            <span>📍 ${info.endereco}</span>
        </div>
        <div class="item-status">✅</div>
    `;
    container.prepend(itemDiv); // Adiciona no topo da lista
    document.getElementById('count').innerText = listaParaEntregar.length;
}

function vibrarCelular() {
    if (navigator.vibrate) navigator.vibrate(100);
}

function mostrarAba(aba) {
    if (aba === 'scanner') {
        document.getElementById('reader-container').style.display = 'block';
        document.getElementById('lista-scan').style.display = 'block';
        document.getElementById('map').style.display = 'none';
    } else {
        document.getElementById('reader-container').style.display = 'none';
        document.getElementById('lista-scan').style.display = 'none';
        document.getElementById('map').style.display = 'block';
        // Aqui entra a 2ª etapa: carregar o mapa
    }
}