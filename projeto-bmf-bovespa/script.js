        const TOKEN_B3 = '8gRPKYrszFRi4JCDaARwuJ'; 
const LISTA_30_ACOES = "PETR4,VALE3,ITUB4,BBDC4,ABEV3,BBAS3,ITSA4,SANB11,B3SA3,RENT3,LREN3,MGLU3,WEGE3,SUZB3,JBSS3,RAIL3,GGBR4,VIVT3,ELET3,BBSE3,EQTL3,RADL3,RDOR3,CSAN3,CPLE6,TOTS3,VBBR3,EMBR3,UGPA3,HAPV3";
const LISTA_BMF = "BGI,CCM,SJW,ICF,WDO,WTI,PETR4"; 

let chartMercado = null;

window.onload = () => {
    document.getElementById('data-atual').innerText = new Date().toLocaleDateString('pt-BR');
    inicializarApp();
};

async function inicializarApp() {
    document.getElementById('status-conexao').innerText = "🔄 Sincronizando sistema...";
    // Chamadas independentes para garantir que nada trave
    buscarApenasMoedas();
    buscarApenasTaxas();
    buscarMercadoB3eBMF();
}

async function buscarApenasMoedas() {
    try {
        // Chamada limpa apenas para dados comerciais estáveis
        const url = 'https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,BTC-BRL,ETH-BRL,XAU-BRL';
        const res = await fetch(url);
        if (!res.ok) throw new Error("Falha na API");
        const d = await res.json();

        const SPREAD_TURISMO = 1.08; // 8% de acréscimo para o mercado real

        // Dólar
        if (d.USDBRL) {
            const usdCom = parseFloat(d.USDBRL.bid);
            document.getElementById('usd-comercial').innerText = "R$ " + usdCom.toFixed(2);
            document.getElementById('usd-turismo').innerText = "R$ " + (usdCom * SPREAD_TURISMO).toFixed(2);
        }

        // Euro
        if (d.EURBRL) {
            const eurCom = parseFloat(d.EURBRL.bid);
            document.getElementById('eur-comercial').innerText = "R$ " + eurCom.toFixed(2);
            document.getElementById('eur-turismo').innerText = "R$ " + (eurCom * SPREAD_TURISMO).toFixed(2);
        }

        // Criptos
        if (d.BTCBRL) document.getElementById('btc-val').innerText = "R$ " + parseFloat(d.BTCBRL.bid).toLocaleString('pt-BR');
        if (d.ETHBRL) document.getElementById('eth-val').innerText = "R$ " + parseFloat(d.ETHBRL.bid).toLocaleString('pt-BR');
        
        // Ouro (Conversão Onça para Grama)
        if (d.XAUBRL) {
            const ouroGrama = parseFloat(d.XAUBRL.bid) / 31.1035;
            document.getElementById('gold-val').innerText = "R$ " + ouroGrama.toFixed(2);
        }

    } catch (e) {
        console.error("Erro Moedas:", e);
    }
}

async function buscarApenasTaxas() {
    try {
        const res = await fetch('https://api.hgbrasil.com/finance/taxes?format=json-cors');
        const data = await res.json();
        if (data && data.results) {
            const t = data.results[0];
            document.getElementById('taxa-selic').innerText = (t.selic || "11.25") + "%";
            document.getElementById('taxa-cdi').innerText = (t.cdi || "11.15") + "%";
            document.getElementById('taxa-ipca').innerText = (t.ipca || "4.42") + "%";
            document.getElementById('taxa-igpm').innerText = t.igpm ? t.igpm + "%" : "0.89%";
        }
    } catch (e) {
        // Fallback para evitar campos vazios se a API HG falhar
        document.getElementById('taxa-selic').innerText = "11.25%";
        document.getElementById('taxa-cdi').innerText = "11.15%";
        document.getElementById('taxa-ipca').innerText = "4.42%";
        document.getElementById('taxa-igpm').innerText = "0.89%";
    }
}

async function buscarMercadoB3eBMF() {
    try {
        const res = await fetch(`https://brapi.dev/api/quote/${LISTA_30_ACOES},${LISTA_BMF}?token=${TOKEN_B3}`);
        const data = await res.json();
        if(!data.results) return;

        // Tabela BMF/Commodities/Ações Específicas
        const bmfAtivos = data.results.filter(i => LISTA_BMF.includes(i.symbol.substring(0,3)) || i.symbol === "PETR4");
        const tbody = document.getElementById("corpo-cotacoes");
        if(tbody) {
            tbody.innerHTML = "";
            bmfAtivos.forEach(item => {
                const varPct = item.regularMarketChangePercent || 0;
                const cor = varPct >= 0 ? "texto-alta" : "texto-queda";
                tbody.innerHTML += `<tr><td><b>${item.symbol}</b></td><td>R$ ${item.regularMarketPrice.toFixed(2)}</td><td class="${cor}">${varPct.toFixed(2)}%</td></tr>`;
            });
        }

        // Rankings B3 (O resto das 30 ações)
        const acoesB3 = data.results.filter(i => !["BGI", "CCM", "SJW", "ICF", "WDO", "WTI"].some(s => i.symbol.includes(s)));
        const ordenadas = [...acoesB3].sort((a, b) => (b.regularMarketChangePercent || 0) - (a.regularMarketChangePercent || 0));
        
        const formatLi = (a, c) => `<li><strong>${a.symbol}</strong> <span>R$ ${a.regularMarketPrice.toFixed(2)}</span> <b class="${c}">${(a.regularMarketChangePercent || 0).toFixed(2)}%</b></li>`;
        
        document.getElementById('lista-altas').innerHTML = ordenadas.slice(0, 15).map(a => formatLi(a, 'texto-alta')).join('');
        document.getElementById('lista-baixas').innerHTML = [...ordenadas].reverse().slice(0, 15).map(a => formatLi(a, 'texto-queda')).join('');

        renderizarGrafico(ordenadas.slice(0, 5), [...ordenadas].reverse().slice(0, 5));
        document.getElementById('status-conexao').innerText = "✅ Atualizado: " + new Date().toLocaleTimeString();
    } catch (e) { console.error("Erro B3/BMF", e); }
}

function renderizarGrafico(altas, baixas) {
    const canvas = document.getElementById('graficoMercado');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (chartMercado) chartMercado.destroy();
    const dados = [...altas, ...baixas];
    chartMercado = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dados.map(a => a.symbol),
            datasets: [{
                label: '% Variação',
                data: dados.map(a => a.regularMarketChangePercent),
                backgroundColor: dados.map(a => a.regularMarketChangePercent >= 0 ? '#008d47' : '#d93025')
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}