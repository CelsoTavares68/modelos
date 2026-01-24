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
setInterval(buscarDadosReais, 300000);