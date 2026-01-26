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
    // Renderiza as Altas com Preço e %
    document.getElementById('lista-altas').innerHTML = altas.map(a => `
        <li>
            <span>${a.stock}</span>
            <span>R$ ${a.close.toFixed(2)}</span>
            <b class="texto-alta">${a.change.toFixed(2)}%</b>
        </li>`).join('');

    // Renderiza as Baixas com Preço e %
    document.getElementById('lista-baixas').innerHTML = baixas.map(b => `
        <li>
            <span>${b.stock}</span>
            <span>R$ ${b.close.toFixed(2)}</span>
            <b class="texto-queda">${b.change.toFixed(2)}%</b>
        </li>`).join('');
}

 // Objeto central de taxas - Atualize aqui os valores do mercado
const taxasMercado = {
    selic: 11.25,
    cdi: 11.15,
    poupancaMensal: 0.50, // 0.5% fixo + TR
    trEstimada: 0.05      // Taxa Referencial estimada
};

 function calcularRentabilidadeCompleta() {
    const valor = parseFloat(document.getElementById('valorInvestido').value);
    const container = document.getElementById('tabela-rendimentos');

    if (!valor || valor <= 0) {
        alert("Insira um valor para calcular.");
        return;
    }

    // Taxas Atuais (Podem ser editadas conforme o COPOM)
    const SELIC = 11.25; 
    const CDI = SELIC - 0.10;
    
    // Fatores de Divisão
    const diasUteisAno = 252;
    const mesesAno = 12;

    // Funções de Cálculo Líquido (Já com desconto de 22.5% de IR para CDB/RDB)
    const calcCDB = (v, tempo) => (v * (CDI / 100 / tempo)) * 0.775;
    const calcLCI = (v, tempo) => (v * ((CDI * 0.9) / 100 / tempo));
    const calcPoup = (v, tempo) => (v * (0.0055 / (tempo === 252 ? 21 : 1))); // Estimativa 21 dias úteis/mês

    container.innerHTML = `
        <div class="card-investimento">
            <h4>CDB / RDB (100% CDI)</h4>
            <p>Diário: <strong class="texto-alta">R$ ${calcCDB(valor, diasUteisAno).toFixed(2)}</strong></p>
            <p>Mensal: <strong>R$ ${calcCDB(valor, mesesAno).toFixed(2)}</strong></p>
            <small>Líquido (Pós-IR)</small>
        </div>
        <div class="card-investimento">
            <h4>LCI / LCA (90% CDI)</h4>
            <p>Diário: <strong class="texto-alta">R$ ${calcLCI(valor, diasUteisAno).toFixed(2)}</strong></p>
            <p>Mensal: <strong>R$ ${calcLCI(valor, mesesAno).toFixed(2)}</strong></p>
            <small>Isento de Imposto</small>
        </div>
        <div class="card-investimento">
            <h4>Poupança</h4>
            <p>Diário: <strong class="texto-alta">R$ ${calcPoup(valor, diasUteisAno).toFixed(2)}</strong></p>
            <p>Mensal: <strong>R$ ${calcPoup(valor, mesesAno).toFixed(2)}</strong></p>
            <small>Referencial</small>
        </div>
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

            // --- METAIS (OURO) ---
if (data.XAUBRL) {
    // Pegamos o valor da Onça-Troy e dividimos por 31.1 para ter o valor do GRAMA
    const valorOnca = parseFloat(data.XAUBRL.bid);
    const valorGrama = valorOnca / 31.1;

    document.getElementById('gold-val').innerText = `R$ ${valorGrama.toFixed(2)}`;
}
        }
    } catch (e) {
        console.error("Erro no carregamento:", e);
    }
}

// Garante que carrega ao abrir a página
window.addEventListener('load', buscarMoedas);