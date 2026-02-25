 const TOKEN_B3 = '8gRPKYrszFRi4JCDaARwuJ'; 

// LISTAS - Mantive sua lógica original
 const LISTA_AGRO_BMF = "BGIG26,CCMH26,SJWH26,ICFU26,WDOG26,CTPK26,TRIH26";
const LISTA_ACOES_B3 = "VALE3,ITUB4,ABEV3,PETR4";

const MAPA_NOMES_AGRO = {
    "BGI": "Boi Gordo", "CCM": "Milho", "SJW": "Soja",
    "ICF": "Café Arábica", "WDO": "Mini Dólar", "CTP": "Algodão", "TRI": "Trigo"
};

let chartMercado = null;
let minhaCarteira = JSON.parse(localStorage.getItem('minhaCarteira')) || [];

window.onload = () => {
    const dataElemento = document.getElementById('data-atual');
    if (dataElemento) dataElemento.innerText = new Date().toLocaleDateString('pt-BR');
    inicializarApp();
};

async function inicializarApp() {
    const status = document.getElementById('status-conexao');
    if (status) status.innerText = "🔄 Sincronizando sistema...";
    
    const tbody = document.getElementById("corpo-cotacoes");
    if (tbody) tbody.innerHTML = "";

    buscarApenasMoedas();
    buscarApenasTaxas();
    
    // Mudança importante: Chamamos as funções sem o 'await' rígido para uma não travar a outra
    buscarCotacoesAgro(); 
    buscarCotacoesBovespa();
}

// --- MOEDAS E CRIPTOS ---
async function buscarApenasMoedas() {
    try {
        const url = 'https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,BTC-BRL,ETH-BRL,XAU-BRL';
        const res = await fetch(url);
        const d = await res.json();
        const SPREAD = 1.08; 

        if (d.USDBRL) {
            const val = parseFloat(d.USDBRL.bid);
            document.getElementById('usd-comercial').innerText = "R$ " + val.toFixed(2);
            document.getElementById('usd-turismo').innerText = "R$ " + (val * SPREAD).toFixed(2);
        }
        if (d.EURBRL) {
            const val = parseFloat(d.EURBRL.bid);
            document.getElementById('eur-comercial').innerText = "R$ " + val.toFixed(2);
            document.getElementById('eur-turismo').innerText = "R$ " + (val * SPREAD).toFixed(2);
        }
        if (d.BTCBRL) document.getElementById('btc-val').innerText = "R$ " + parseFloat(d.BTCBRL.bid).toLocaleString('pt-BR');
        if (d.ETHBRL) document.getElementById('eth-val').innerText = "R$ " + parseFloat(d.ETHBRL.bid).toLocaleString('pt-BR');
        if (d.XAUBRL) {
            const ouroGrama = parseFloat(d.XAUBRL.bid) / 31.1035;
            document.getElementById('gold-val').innerText = "R$ " + ouroGrama.toFixed(2);
        }
    } catch (e) { console.error("Erro Moedas:", e); }
}

// --- TAXAS ---
async function buscarApenasTaxas() {
    try {
        const res = await fetch('https://api.hgbrasil.com/finance/taxes?format=json-cors');
        const data = await res.json();
        const t = data.results[0] || data.results;
        if (t) {
            document.getElementById('taxa-selic').innerText = (t.selic || "11.25") + "%";
            document.getElementById('taxa-cdi').innerText = (t.cdi || "11.15") + "%";
            document.getElementById('taxa-ipca').innerText = (t.ipca || "4.51") + "%";
            document.getElementById('taxa-igpm').innerText = (t.igpm || "0.88") + "%";
        }
    } catch (e) { console.error("Erro Taxas:", e); }
}

// --- MERCADO ---
async function buscarCotacoesAgro() {
    try {
        const res = await fetch(`https://brapi.dev/api/quote/${LISTA_AGRO_BMF}?token=${TOKEN_B3}`);
        if(!res.ok) return; // Se der erro (404), apenas sai da função sem travar o resto
        const data = await res.json();
        if (data.results) {
            data.results.forEach(item => renderizarLinhaTabela(item, "BMF"));
        }
    } catch (e) { console.warn("Agro temporariamente fora do ar na Brapi."); }
}

async function buscarCotacoesBovespa() {
    try {
        const tickersPessoais = minhaCarteira.map(a => a.ticker).join(',');
        const listaBusca = (LISTA_ACOES_B3 + (tickersPessoais ? ',' + tickersPessoais : '')).replace(/\s/g, '');
        
        // Chamada do Ranking e dos Preços
        const [resRanking, resPrecos] = await Promise.all([
            fetch(`https://brapi.dev/api/quote/list?token=${TOKEN_B3}`),
            fetch(`https://brapi.dev/api/quote/${listaBusca}?token=${TOKEN_B3}`)
        ]);
        
        const dataRanking = await resRanking.json();
        const dataPrecos = await resPrecos.json();

        if (dataPrecos.results) {
            dataPrecos.results.forEach(item => {
                renderizarLinhaTabela(item, "B3");
            });
        }
        
        atualizarPainelCarteira(dataPrecos.results);
        processarRanking(dataRanking);
        
        document.getElementById('status-conexao').innerText = "✅ Sistema Online";
    } catch (e) { 
        console.error("Erro Bovespa:", e); 
        document.getElementById('status-conexao').innerText = "⚠️ Erro na conexão com a B3";
    }
}

function renderizarLinhaTabela(item, origem) {
    const tbody = document.getElementById("corpo-cotacoes");
    if (!tbody || !item || (!item.regularMarketPrice && !item.price)) return;

    const tickerLimpo = (item.symbol || "").replace('.SA', '');
    const prefixo = tickerLimpo.substring(0, 3);
    
    const nomeExibicao = origem === "BMF" 
        ? (MAPA_NOMES_AGRO[prefixo] || tickerLimpo) 
        : tickerLimpo;

    const preco = item.regularMarketPrice || item.price || 0;
    const variacao = item.regularMarketChangePercent || item.changePercent || item.change || 0;
    const classeSetor = origem === "BMF" ? "setor-bmf" : "setor-b3";

    if (document.getElementById(`linha-${tickerLimpo}`)) return;

    tbody.innerHTML += `
        <tr id="linha-${tickerLimpo}" class="${classeSetor}">
            <td>
                <b>${nomeExibicao}</b><br>
                <small style="opacity:0.7">${tickerLimpo}</small>
            </td>
            <td>R$ ${preco.toFixed(2)}</td>
            <td class="${variacao >= 0 ? 'texto-alta' : 'texto-queda'}">
                ${variacao.toFixed(2)}%
            </td>
        </tr>`;
}

// --- RANKING (LINHA 147 CORRIGIDA) ---
function processarRanking(dataRanking) {
    // A Brapi mudou: os dados podem vir em 'stocks' ou em 'results'
    const lista = dataRanking.stocks || dataRanking.results || [];

    if (Array.isArray(lista) && lista.length > 0) {
        // Filtrar e Ordenar por variação
        const apenasAcoes = lista.filter(s => (s.stock || s.symbol));
        apenasAcoes.sort((a, b) => (b.change || 0) - (a.change || 0));

        const topAltas = apenasAcoes.slice(0, 30);
        const topBaixas = [...apenasAcoes].reverse().slice(0, 30);

        const formatLi = (a, c) => {
            const ticker = a.stock || a.symbol || "---";
            const preco = a.close || a.regularMarketPrice || a.price || 0;
            const variacao = a.change || 0;

            return `
                <li style="display: flex; justify-content: space-between; align-items: center; padding: 10px 5px; border-bottom: 1px solid rgba(0,0,0,0.05);">
                    <span style="flex: 1; text-align: left;">
                        <b style="display: block;">${ticker}</b>
                    </span>
                    <span style="flex: 1; text-align: center; color: #444;">R$ ${preco.toFixed(2)}</span>
                    <span class="${c}" style="flex: 1; text-align: right; font-weight: bold;">
                        ${variacao.toFixed(2)}%
                    </span>
                </li>`;
        };

        if(document.getElementById('lista-altas')) document.getElementById('lista-altas').innerHTML = topAltas.map(a => formatLi(a, 'texto-alta')).join('');
        if(document.getElementById('lista-baixas')) document.getElementById('lista-baixas').innerHTML = topBaixas.map(a => formatLi(a, 'texto-queda')).join('');
        
        renderizarGrafico([...topAltas.slice(0,5), ...topBaixas.slice(0,5)].map(item => ({ 
            symbol: item.stock || item.symbol, 
            change: item.change || 0 
        })));
    } else {
        console.error("Dados do ranking não encontrados no objeto:", dataRanking);
    }
}

// --- CARTEIRA (Mantive original) ---
function atualizarPainelCarteira(dadosApi) {
    const tbody = document.getElementById('corpo-carteira');
    if (!tbody) return;
    tbody.innerHTML = "";
    minhaCarteira.forEach((item, index) => {
        const info = dadosApi ? dadosApi.find(res => res.symbol.includes(item.ticker)) : null;
        const precoAtual = info ? (info.regularMarketPrice || info.price) : null;
        
        let cor = ""; let pct = "---";
        if (precoAtual) {
            const varP = ((precoAtual - item.precoPago) / item.precoPago) * 100;
            pct = (varP >= 0 ? '+' : '') + varP.toFixed(2) + "%";
            cor = varP >= 0 ? "texto-alta" : "texto-queda";
        }
        tbody.innerHTML += `
            <tr class="${cor}">
                <td><b>${item.ticker}</b></td>
                <td>R$ ${item.precoPago.toFixed(2)}</td>
                <td>${precoAtual ? 'R$ ' + precoAtual.toFixed(2) : '---'}</td>
                <td style="font-weight:bold">${pct}</td>
                <td><button onclick="removerDaCarteira(${index})">🗑️</button></td>
            </tr>`;
    });
}

// --- CALCULADORA (Mantive original) ---
function calcularRentabilidade() {
    const valor = parseFloat(document.getElementById('valorInvestido').value);
    const container = document.getElementById('tabela-rendimentos');
    if (!valor || valor <= 0) { alert("Insira um valor."); return; }
    
    const CDI = 11.15; 
    const calcCDB = (v, tempo) => (v * (CDI / 100 / tempo)) * 0.775;
    const calcLCI = (v, tempo) => (v * ((CDI * 0.9) / 100 / tempo));

    container.innerHTML = `
        <div class="card-investimento"><h4>CDB (100% CDI)</h4><p>Mensal: <strong>R$ ${calcCDB(valor, 12).toFixed(2)}</strong></p></div>
        <div class="card-investimento"><h4>LCI (90% CDI)</h4><p>Mensal: <strong>R$ ${calcLCI(valor, 12).toFixed(2)}</strong></p></div>`;
}

// --- AUXILIARES (Mantive original) ---
function adicionarAcaoCarteira() {
    const t = document.getElementById('tickerCompra').value.toUpperCase().trim();
    const p = parseFloat(document.getElementById('precoPago').value);
    if (t && !isNaN(p)) {
        minhaCarteira.push({ ticker: t, precoPago: p });
        localStorage.setItem('minhaCarteira', JSON.stringify(minhaCarteira));
        buscarCotacoesBovespa();
    }
}

function removerDaCarteira(index) {
    minhaCarteira.splice(index, 1);
    localStorage.setItem('minhaCarteira', JSON.stringify(minhaCarteira));
    buscarCotacoesBovespa();
}

function toggleDarkMode() { document.body.classList.toggle('dark-mode'); }

function renderizarGrafico(dados) {
    const canvas = document.getElementById('graficoMercado');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (chartMercado) chartMercado.destroy();
    chartMercado = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dados.map(a => a.symbol),
            datasets: [{ 
                label: '% Var', 
                data: dados.map(a => a.change || 0), 
                backgroundColor: dados.map(a => (a.change || 0) >= 0 ? '#27ae60' : '#e74c3c') 
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}