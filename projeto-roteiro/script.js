  let dicionarioEntregas = JSON.parse(localStorage.getItem('dicionario')) || {};
let entregasRoteiro = JSON.parse(localStorage.getItem('entregas')) || [];

// 1. Função para carregar a lista do dia
function importarLista() {
    const texto = document.getElementById('dadosEntregas').value;
    const linhas = texto.split('\n');
    
    linhas.forEach(linha => {
        const partes = linha.split(',');
        if (partes.length >= 2) {
            const codigo = partes[0].trim();
            const endereco = partes.slice(1).join(',').trim();
            dicionarioEntregas[codigo] = endereco;
        }
    });
    
    localStorage.setItem('dicionario', JSON.stringify(dicionarioEntregas));
    alert("Lista de pacotes carregada!");
}

// 2. Modificação no sucesso do Scanner
async function processarLeitura(codigoLido) {
    const endereco = dicionarioEntregas[codigoLido];
    
    if (!endereco) {
        alert("Pacote " + codigoLido + " não está na lista do dia!");
        return;
    }

    // Transformar endereço em Latitude e Longitude (Geocoding)
    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endereco)}`;
        const response = await fetch(url);
        const resultado = await response.json();

        if (resultado.length > 0) {
            const lat = parseFloat(resultado[0].lat);
            const lon = parseFloat(resultado[0].lon);
            
            // Adiciona ao roteiro
            entregasRoteiro.push([lat, lon]);
            localStorage.setItem('entregas', JSON.stringify(entregasRoteiro));
            
            if (navigator.vibrate) navigator.vibrate(100);
            atualizarInterface(); // Desenha a rota no mapa
        } else {
            alert("Endereço não encontrado no mapa: " + endereco);
        }
    } catch (error) {
        alert("Erro ao buscar endereço. Verifique a internet.");
    }
}

// Atualize a chamada do scanner para usar a nova função
function initScanner() {
    const html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        (codigo) => processarLeitura(codigo) // Aqui chamamos a busca por endereço
    ).catch(err => console.error(err));
}