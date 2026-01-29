    const API_TOKEN = 'o5vWfmTmmtZUdtAEe9fyMA'; // O teu novo token exclusivo
let chartMercado;

// Configuração inicial ao carregar a página
window.onload = () => {
    document.getElementById('data-atual').innerText = new Date().toLocaleDateString('pt-BR');
    buscarDadosReais(); // Gráfico e Listas B3
    buscarMoedas();     // Dólar, Euro, Cripto e Ouro
};

// 1. FUNÇÃO DA B3 (LISTAS E GRÁFICO)
async function buscarDadosReais() {
    try {
        const url = `https://brapi.dev/api/v2/quote/list?sortOrder=desc&sortBy=change&token=${API_TOKEN}`;
        const response = await fetch(url);
        const contentType = response.headers.get("content-type");

        // Verificação de segurança para o token novo
        if (!response.ok || !contentType || !contentType.includes("application/json")) {
            console.warn("Brapi processando novo token. Aguarde alguns minutos.");
            return; 
        }

        const data = await response.json();
        if (data.stocks) {
            const acoes = data.stocks;
            const topAltas = acoes.slice(0, 15);
            const topBaixas = [...acoes].reverse().slice(0, 15);

            // Preenche as Listas no HTML
            exibirListas(topAltas, topBaixas);
            
            // Desenha o Gráfico
            renderizarGraficoTop30([...topAltas, ...topBaixas]);
        }
    } catch (e) {
        console.error("Erro ao conectar à B3:", e);
    }
}

function exibirListas(altas, baixas) {
    const elAltas = document.getElementById('lista-altas');
    const elBaixas = document.getElementById('lista-baixas');

    if (elAltas) {
        elAltas.innerHTML = altas.map(a => `
            <li>
                <span>${a.stock}</span>
                <span>R$ ${a.close ? a.close.toFixed(2) : '---'}</span>
                <b class="texto-alta">${a.change ? a.change.toFixed(2) : '0'}%</b>
            </li>`).join('');
    }
    if (elBaixas) {
        elBaixas.innerHTML = baixas.map(b => `
            <li>
                <span>${b.stock}</span>
                <span>R$ ${b.close ? b.close.toFixed(2) : '---'}</span>
                <b class="texto-queda">${b.change ? b.change.toFixed(2) : '0'}%</b>
            </li>`).join('');
    }
}

function renderizarGraficoTop30(acoes) {
    const canvas = document.getElementById('graficoMercado');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
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
        options: { 
            responsive: true, 
            maintainAspectRatio: false 
        }
    });
}

// 2. FUNÇÃO DE MOEDAS, CRIPTO E OURO (SEM TOKEN)
async function buscarMoedas() {
    try {
        const response = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,BTC-BRL,ETH-BRL,XAU-BRL');
        const data = await response.json();

        // Dólar e Euro
        if (data.USDBRL) {
            document.getElementById('usd-comercial').innerText = `R$ ${parseFloat(data.USDBRL.bid).toFixed(2)}`;
            document.getElementById('usd-paralelo').innerText = `R$ ${(parseFloat(data.USDBRL.bid) * 1.05).toFixed(2)}`;
        }
        if (data.EURBRL) {
            document.getElementById('eur-comercial').innerText = `R$ ${parseFloat(data.EURBRL.bid).toFixed(2)}`;
            document.getElementById('eur-paralelo').innerText = `R$ ${(parseFloat(data.EURBRL.bid) * 1.065).toFixed(2)}`;
        }

        // Criptos (Bitcoin e Ethereum)
        if (data.BTCBRL) {
            document.getElementById('btc-val').innerText = parseFloat(data.BTCBRL.bid).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            document.getElementById('btc-max').innerText = `R$ ${parseFloat(data.BTCBRL.high).toFixed(2)}`;
        }
        if (data.ETHBRL) {
            document.getElementById('eth-val').innerText = parseFloat(data.ETHBRL.bid).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            document.getElementById('eth-max').innerText = `R$ ${parseFloat(data.ETHBRL.high).toFixed(2)}`;
        }
        
        // Ouro (XAU) - Convertendo Onça para Grama
        if (data.XAUBRL) {
            const valorGrama = parseFloat(data.XAUBRL.bid) / 31.1035;
            document.getElementById('gold-val').innerText = `R$ ${valorGrama.toFixed(2)}`;
        }
    } catch (e) { 
        console.error("Erro ao carregar moedas/ouro:", e); 
    }
}

// 3. FUNÇÃO DE RENTABILIDADE (CDB / LCI)
function calcularRentabilidadeCompleta() {
    const valor = parseFloat(document.getElementById('valorInvestido').value);
    const container = document.getElementById('tabela-rendimentos');
    
    if (!valor || valor <= 0) {
        alert("Por favor, insira um valor válido.");
        return;
    }

    const SELIC = 11.25;
    const CDI = SELIC - 0.10;

    const calcCDB = (v) => (v * (CDI / 100 / 12)) * 0.775; // Descontando IR médio
    const calcLCI = (v) => (v * ((CDI * 0.9) / 100 / 12)); // Isento de IR

    container.innerHTML = `
        <div class="card-investimento" style="border-left-color: #28a745;">
            <h4>CDB (100% do CDI)</h4>
            <p>Estimativa Mensal: <strong class="texto-alta">R$ ${calcCDB(valor).toFixed(2)}</strong></p>
        </div>
        <div class="card-investimento" style="border-left-color: #1a73e8;">
            <h4>LCI / LCA (90% do CDI)</h4>
            <p>Estimativa Mensal: <strong class="texto-alta">R$ ${calcLCI(valor).toFixed(2)}</strong></p>
        </div>
    `;
}

// 4. FUNÇÃO DE IMPRESSÃO
function gerarRelatorio() {
    window.print();
}