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

// Nova função para buscar BMF sem estragar as ações
   async function carregarBMF() {
    const contratos = 'WING26,WDOG26,CCMH26,SCFH26,ICFH26,WTHH26';
    const areaFinanceira = document.getElementById('bmf-financeiro');
    const areaAgro = document.getElementById('bmf-agro');

    try {
        const response = await fetch(`https://brapi.dev/api/quote/${contratos}?token=${API_TOKEN}`);
        const data = await response.json();

        if (data.results && data.results.length > 0) {
            const criarCard = (item, nome) => {
                const variacao = item.regularMarketChangePercent || 0;
                const cor = variacao >= 0 ? 'texto-alta' : 'texto-queda';
                return `
                    <div style="background: white; padding: 10px; border-radius: 8px; flex: 1; min-width: 120px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border: 1px solid #eee;">
                        <small style="color: #666; font-weight: bold; display: block;">${nome}</small>
                        <b class="${cor}" style="font-size: 1.1em;">${variacao >= 0 ? '+' : ''}${variacao.toFixed(2)}%</b>
                        <div style="font-size: 0.6em; color: #aaa;">${item.symbol}</div>
                    </div>
                `;
            };

            // Nomes para exibição
            const nomes = { 
                'WIN': 'Mini Índice', 'WDO': 'Mini Dólar', 
                'CCM': 'Milho', 'SCF': 'Soja', 'ICF': 'Café', 'WTH': 'Trigo' 
            };

            // Distribui Financeiro
            areaFinanceira.innerHTML = data.results
                .filter(i => i.symbol.startsWith('WIN') || i.symbol.startsWith('WDO'))
                .map(i => criarCard(i, nomes[i.symbol.substring(0,3)])).join('');

            // Distribui Agro
            areaAgro.innerHTML = data.results
                .filter(i => ['CCM', 'SCF', 'ICF', 'WTH'].includes(i.symbol.substring(0,3)))
                .map(i => criarCard(i, nomes[i.symbol.substring(0,3)])).join('');

            // Adiciona Frango/Porco fixo
            areaAgro.innerHTML += `
                <div style="background: white; padding: 10px; border-radius: 8px; flex: 1; min-width: 120px; text-align: center; border: 1px dashed #ccc;">
                    <small style="color: #666; font-weight: bold; display: block;">Frango/Suíno</small>
                    <div style="font-size: 0.7em; color: #aaa; margin-top: 5px;">Média CEPEA/PR</div>
                </div>`;
        }
    } catch (e) {
        console.log("Mercado fechado (Fim de semana). Estrutura mantida.");
    }
}

// Vamos garantir que quando o site carregar, ele chame as Ações E a BMF
const carregarTudo = window.onload;
window.onload = function() {
    if (carregarTudo) carregarTudo(); // Chama a função original das ações
    carregarBMF();                   // Chama a função nova da BMF
};

function toggleTabela() {
    const div = document.getElementById('tabela-vencimentos');
    if (div.style.display === 'none') {
        div.style.display = 'block';
    } else {
        div.style.display = 'none';
    }
}