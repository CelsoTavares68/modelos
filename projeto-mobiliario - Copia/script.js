    const API_TOKEN = 'SEU_TOKEN_AQUI'; 
let chartMercado;

// Exibir data atual
document.getElementById('data-atual').innerText = new Date().toLocaleDateString('pt-BR');

async function buscarDadosReais() {
    try {
        const response = await fetch(`https://brapi.dev/api/quote/list?token=${API_TOKEN}`);
        const data = await response.json();
        
        // Filtro de Volume (> 1 milhão)
        const filtradas = data.stocks.filter(a => a.volume > 1000000);

        const topAltas = [...filtradas].sort((a,b) => b.change - a.change).slice(0, 15);
        const topBaixas = [...filtradas].sort((a,b) => a.change - b.change).slice(0, 15);

        exibirListas(topAltas, topBaixas);
        renderizarGraficoTop30([...topAltas, ...topBaixas]);
    } catch (e) { alert("Erro ao carregar dados."); }
}

function renderizarGraficoTop30(acoes) {
    const ctx = document.getElementById('graficoMercado').getContext('2d');
    if (chartMercado) chartMercado.destroy();

    chartMercado = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: acoes.map(a => a.stock),
            datasets: [{
                label: '% Variação',
                data: acoes.map(a => a.change),
                backgroundColor: acoes.map(a => a.change >= 0 ? '#28a745' : '#dc3545')
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function exibirListas(altas, baixas) {
    document.getElementById('lista-altas').innerHTML = altas.map(a => 
        `<li>${a.stock}: <b class="texto-alta">${a.change.toFixed(2)}%</b></li>`).join('');
    document.getElementById('lista-baixas').innerHTML = baixas.map(b => 
        `<li>${b.stock}: <b class="texto-queda">${b.change.toFixed(2)}%</b></li>`).join('');
}

function calcularRentabilidade() {
    const valor = parseFloat(document.getElementById('valorInvestido').value) || 0;
    const CDI = 11.15; // Exemplo de CDI atual
    const taxaMes = (CDI / 100) / 12;

    const res = {
        cdb: (valor * taxaMes) * 0.775, // 100% CDI - 22.5% IR
        lci: (valor * taxaMes * 0.9),  // 90% CDI Isento
        poupanca: valor * 0.0055       // 0.5% + TR
    };

    document.getElementById('tabela-rendimentos').innerHTML = `
        <div class="card-investimento"><h4>CDB/RDB</h4><p class="valor-rendimento">R$ ${res.cdb.toFixed(2)}</p></div>
        <div class="card-investimento"><h4>LCI/LCA</h4><p class="valor-rendimento">R$ ${res.lci.toFixed(2)}</p></div>
        <div class="card-investimento"><h4>Poupança</h4><p class="valor-rendimento">R$ ${res.poupanca.toFixed(2)}</p></div>
    `;
}

function gerarRelatorio() {
    window.print(); // Abre a janela de impressão do sistema
}

window.onload = buscarDadosReais;