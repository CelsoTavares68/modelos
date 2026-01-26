  const API_TOKEN = 'SEU_TOKEN_AQUI'; // <--- Verifique se o seu token está correto entre as aspas
let chartMercado;

// Exibir data atual
document.getElementById('data-atual').innerText = new Date().toLocaleDateString('pt-BR');

// Carregar tudo ao abrir
window.onload = () => {
    buscarDadosReais();
    buscarMoedas();
};

 async function buscarDadosReais() {
    try {
        const response = await fetch(`https://brapi.dev/api/quote/list?token=${API_TOKEN}`);
        
        if (!response.ok) {
            console.log("Limite de API atingido ou Token inválido.");
            return;
        }

        const data = await response.json();
        
        if (data.stocks) {
            const filtradas = data.stocks.filter(a => a.volume > 1000000);
            const topAltas = [...filtradas].sort((a,b) => b.change - a.change).slice(0, 15);
            const topBaixas = [...filtradas].sort((a,b) => a.change - b.change).slice(0, 15);

            exibirListas(topAltas, topBaixas);
            renderizarGraficoTop30([...topAltas, ...topBaixas]);
        }
    } catch (e) { 
        console.error("Erro na conexão com a B3"); 
    }
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

   async function buscarMoedas() {
    try {
        // Buscamos os valores oficiais (Comercial)
        const url = 'https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,BTC-BRL,ETH-BRL,XAU-BRL';
        const response = await fetch(url);
        const data = await response.json();

        if (data) {
            // --- DÓLAR ---
            if (data.USDBRL) {
                const comercial = parseFloat(data.USDBRL.bid);
                // Calculamos o paralelo com margem de 6.5% (média entre 5% e 8%)
                const paralelo = comercial * 1.065; 

                document.getElementById('usd-comercial').innerText = `R$ ${comercial.toFixed(2)}`;
                document.getElementById('usd-paralelo').innerText = `R$ ${paralelo.toFixed(2)}`;
            }

            // --- EURO ---
            if (data.EURBRL) {
                const comercialEur = parseFloat(data.EURBRL.bid);
                const paraleloEur = comercialEur * 1.065;

                document.getElementById('eur-comercial').innerText = `R$ ${comercialEur.toFixed(2)}`;
                document.getElementById('eur-paralelo').innerText = `R$ ${paraleloEur.toFixed(2)}`;
            }

            // --- CRIPTO ---
            if (data.BTCBRL) {
                document.getElementById('btc-val').innerText = parseFloat(data.BTCBRL.bid).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            }
            if (data.ETHBRL) {
                document.getElementById('eth-val').innerText = parseFloat(data.ETHBRL.bid).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            }

            // --- OURO ---
            if (data.XAUBRL) {
                document.getElementById('gold-val').innerText = `R$ ${parseFloat(data.XAUBRL.bid).toFixed(2)}`;
            }
        }
    } catch (e) {
        console.error("Erro no carregamento:", e);
    }
}

// Garante que carrega ao abrir a página
window.addEventListener('load', buscarMoedas);