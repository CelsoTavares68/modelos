  const API_TOKEN = 'o5vWfmTmmtZUdtAEe9fyMA'; 
let chartMercado;

window.onload = () => {
    document.getElementById('data-atual').innerText = new Date().toLocaleDateString('pt-BR');
    buscarDadosReais(); 
    buscarMoedas();
};

async function buscarDadosReais() {
    try {
        const url = `https://brapi.dev/api/v2/quote/list?sortOrder=desc&sortBy=change&token=${API_TOKEN}`;
        const response = await fetch(url);
        
        if (!response.ok) throw new Error("Aguardando liberação da B3...");

        const data = await response.json();
        if (data.stocks && data.stocks.length > 0) {
            renderizarTudo(data.stocks);
        }
    } catch (e) {
        console.warn(e.message);
        // Deixa a lista limpa para você saber que ainda não conectou
        document.getElementById('lista-altas').innerHTML = "<li>Aguardando conexão real B3...</li>";
        document.getElementById('lista-baixas').innerHTML = "<li>Aguardando conexão real B3...</li>";
        if (chartMercado) chartMercado.destroy();
    }
}

function renderizarTudo(acoes) {
    const altas = acoes.slice(0, 15);
    const baixas = [...acoes].reverse().slice(0, 15);

    document.getElementById('lista-altas').innerHTML = altas.map(a => `
        <li><span>${a.stock}</span> <span>R$ ${a.close.toFixed(2)}</span> <b class="texto-alta">${a.change.toFixed(2)}%</b></li>
    `).join('');

    document.getElementById('lista-baixas').innerHTML = baixas.map(b => `
        <li><span>${b.stock}</span> <span>R$ ${b.close.toFixed(2)}</span> <b class="texto-queda">${b.change.toFixed(2)}%</b></li>
    `).join('');

    renderizarGraficoTop30([...altas, ...baixas]);
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

async function buscarMoedas() {
    try {
        const response = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,BTC-BRL,ETH-BRL,XAU-BRL');
        const data = await response.json();

        // ETHEREUM (IDs: eth-val e eth-max)
        if (data.ETHBRL) {
            const ethVal = document.getElementById('eth-val');
            const ethMax = document.getElementById('eth-max');
            if(ethVal) ethVal.innerText = parseFloat(data.ETHBRL.bid).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            if(ethMax) ethMax.innerText = `R$ ${parseFloat(data.ETHBRL.high).toFixed(2)}`;
        }
        
        // BITCOIN
        if (data.BTCBRL) {
            document.getElementById('btc-val').innerText = parseFloat(data.BTCBRL.bid).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            document.getElementById('btc-max').innerText = `R$ ${parseFloat(data.BTCBRL.high).toFixed(2)}`;
        }

        // OURO
        if (data.XAUBRL) {
            document.getElementById('gold-val').innerText = `R$ ${(parseFloat(data.XAUBRL.bid) / 31.1035).toFixed(2)}`;
        }

        // DÓLAR E EURO
        if (data.USDBRL) {
            document.getElementById('usd-comercial').innerText = `R$ ${parseFloat(data.USDBRL.bid).toFixed(2)}`;
            document.getElementById('usd-paralelo').innerText = `R$ ${(parseFloat(data.USDBRL.bid) * 1.05).toFixed(2)}`;
        }
        if (data.EURBRL) {
            document.getElementById('eur-comercial').innerText = `R$ ${parseFloat(data.EURBRL.bid).toFixed(2)}`;
            document.getElementById('eur-paralelo').innerText = `R$ ${(parseFloat(data.EURBRL.bid) * 1.07).toFixed(2)}`;
        }

    } catch (e) { console.error("Erro Moedas:", e); }
}

function calcularRentabilidadeCompleta() {
    const valor = parseFloat(document.getElementById('valorInvestido').value);
    if (!valor) return;
    const CDI = 11.15;
    const cdb = (valor * (CDI / 100 / 12)) * 0.775;
    const lci = (valor * ((CDI * 0.9) / 100 / 12));
    document.getElementById('tabela-rendimentos').innerHTML = `
        <div class="card-investimento"><h4>CDB</h4><p>R$ ${cdb.toFixed(2)}</p></div>
        <div class="card-investimento"><h4>LCI</h4><p>R$ ${lci.toFixed(2)}</p></div>`;
}

function gerarRelatorio() { window.print(); }