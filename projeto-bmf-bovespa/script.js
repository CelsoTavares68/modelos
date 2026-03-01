   const TOKEN_B3 = '8gRPKYrszFRi4JCDaARwuJ'; 

// LISTAS - Mantendo o seu Agro e alterando apenas a Linha 5 para as Estatais
const LISTA_AGRO_BMF = "JBSS3,BRFS3,BEEF3,MRFG3,CAML3,SLCE3,AGRO3,SMTO3,KEPL3,SOJA3";
 const LISTA_ACOES_B3 = "PETR4,BBAS3,SBSP3,CPLE6,CMIG4,ELET3,SAPR11,BANESE3,BMEB4,BNBR3";

const MAPA_NOMES_AGRO = {
    "JBSS3": "JBS (Carnes)", 
    "BRFS3": "BRF (Frango/Suíno)", 
    "BEEF3": "Minerva (Bovinos)",
    "MRFG3": "Marfrig (Bovinos)", 
    "CAML3": "Camil (Arroz/Peixe)", 
    "SLCE3": "SLC Agrícola (Grãos)",
    "AGRO3": "BrasilAgro (Grãos)",
    "SMTO3": "São Martinho (Etanol)",
    "KEPL3": "Kepler Weber (Silos)",
    "SOJA3": "Boa Safra (Sementes)"
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

    // CORREÇÃO: Carrega a carteira do localStorage logo no início
    atualizarPainelCarteira(); 
    
    buscarApenasMoedas();
    buscarApenasTaxas();
    await buscarCotacoesAgro(); 
    await buscarCotacoesBovespa();
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

// --- MERCADO AGRO ---
async function buscarCotacoesAgro() {
    const ativos = LISTA_AGRO_BMF.split(',');
    const tbody = document.getElementById("corpo-cotacoes");
    if (!tbody) return;

    for (const ticker of ativos) {
        try {
            const tickerLimpo = ticker.trim();
            const url = `https://brapi.dev/api/quote/${tickerLimpo}?token=${TOKEN_B3}`;
            const res = await fetch(url);
            const data = await res.json();

            if (data && data.results && data.results[0]) {
                const item = data.results[0];
                if (item.regularMarketPrice !== null) {
                    renderizarLinhaTabela(item, "BMF");
                }
            }
        } catch (e) {
            console.error(`Erro ao buscar o ativo individual ${ticker}:`, e);
        }
    }
}

// --- MERCADO BOVESPA ---
async function buscarCotacoesBovespa() {
    try {
        const resRanking = await fetch(`https://brapi.dev/api/quote/list?sortBy=change&sortOrder=desc&token=${TOKEN_B3}`);
        const dataRanking = await resRanking.json();

        if (dataRanking && dataRanking.stocks) {
            processarRanking(dataRanking);
        }

        const tickersPessoais = minhaCarteira.map(a => a.ticker).join(',');
        const listaBusca = (LISTA_ACOES_B3 + (tickersPessoais ? ',' + tickersPessoais : '')).replace(/\s/g, '');
        
        const resPrecos = await fetch(`https://brapi.dev/api/quote/${listaBusca}?token=${TOKEN_B3}`);
        const dataPrecos = await resPrecos.json();

        if (dataPrecos && dataPrecos.results) {
            dataPrecos.results.forEach(item => {
                if (item && item.symbol) {
                    const tickerLimpo = item.symbol.replace('.SA', '');
                    if (!LISTA_AGRO_BMF.includes(tickerLimpo)) {
                        renderizarLinhaTabela(item, "B3");
                    }
                }
            });
            atualizarPainelCarteira(dataPrecos.results);
        }
        
        document.getElementById('status-conexao').innerText = "✅ Sistema Online";
    } catch (e) { 
        console.error("Erro Bovespa:", e); 
        document.getElementById('status-conexao').innerText = "⚠️ Erro ao atualizar alguns dados";
    }
}

function renderizarLinhaTabela(item, origem) {
    const tbody = document.getElementById("corpo-cotacoes");
    if (!tbody || !item) return;

    const symbolOriginal = item.symbol.replace('.SA', '');
    const nomeExibicao = origem === "BMF" ? (MAPA_NOMES_AGRO[symbolOriginal] || symbolOriginal) : symbolOriginal;

    const preco = item.regularMarketPrice || item.price || 0;
    const variacao = item.regularMarketChangePercent || item.changePercent || 0;

    if (document.getElementById(`linha-${symbolOriginal}`)) return;

    tbody.innerHTML += `
        <tr id="linha-${symbolOriginal}" class="setor-${origem.toLowerCase()}">
            <td><b>${nomeExibicao}</b><br><small style="opacity:0.7">${symbolOriginal}</small></td>
            <td>R$ ${preco.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
            <td class="${variacao >= 0 ? 'texto-alta' : 'texto-queda'}">${variacao.toFixed(2)}%</td>
        </tr>`;
}

// --- RANKING ---
function processarRanking(dataRanking) {
    const apenasAcoes = dataRanking.stocks.filter(s => s.stock.length <= 6);
    const topAltas = apenasAcoes.slice(0, 30);
    const topBaixas = apenasAcoes.slice(-30).reverse();

    const formatLi = (a, c) => {
        let nomeParaExibir = a.name || "";
        if (nomeParaExibir.includes(" - ")) nomeParaExibir = nomeParaExibir.split(" - ")[1];
        const temNomeReal = nomeParaExibir && nomeParaExibir.toLowerCase() !== a.stock.toLowerCase();

        return `
            <li style="display: flex; justify-content: space-between; align-items: center; padding: 10px 5px; border-bottom: 1px solid rgba(0,0,0,0.05);">
                <span style="flex: 1; text-align: left; min-width: 0;">
                    <b style="display: block; font-size: 0.95em;">${a.stock}</b>
                    ${temNomeReal ? `<small style="display: block; color: #777; font-size: 0.75em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;">${nomeParaExibir}</small>` : ''}
                </span>
                <span style="flex: 1; text-align: center; color: #444; font-size: 0.9em;">R$ ${a.close.toFixed(2)}</span>
                <span class="${c}" style="flex: 1; text-align: right; font-weight: bold;">${(a.change || 0).toFixed(2)}%</span>
            </li>`;
    };

    document.getElementById('lista-altas').innerHTML = topAltas.map(a => formatLi(a, 'texto-alta')).join('');
    document.getElementById('lista-baixas').innerHTML = topBaixas.map(a => formatLi(a, 'texto-queda')).join('');
    renderizarGrafico([...topAltas, ...topBaixas].map(item => ({ symbol: item.stock, change: item.change })));
}

// --- CARTEIRA (LocalStorage e Monitoramento) ---
function atualizarPainelCarteira(dadosApi = null) {
    const tbody = document.getElementById('corpo-carteira');
    if (!tbody) return;
    
    tbody.innerHTML = "";
    minhaCarteira.forEach((item, index) => {
        const info = dadosApi ? dadosApi.find(res => res.symbol.includes(item.ticker)) : null;
        const precoAtual = info ? (info.regularMarketPrice || info.price) : null;
        const nomeEmpresa = info && (info.longName || info.shortName) ? (info.longName || info.shortName) : "Monitorando...";
        
        let cor = ""; let pct = "Carregando...";
        if (precoAtual) {
            const varP = ((precoAtual - item.precoPago) / item.precoPago) * 100;
            pct = (varP >= 0 ? '+' : '') + varP.toFixed(2) + "%";
            cor = varP >= 0 ? "texto-alta" : "texto-queda";
        }

        tbody.innerHTML += `
            <tr class="${cor}">
                <td><b>${item.ticker}</b><br><small style="opacity:0.7">${nomeEmpresa}</small></td>
                <td>R$ ${item.precoPago.toFixed(2)}</td>
                <td>${precoAtual ? 'R$ ' + precoAtual.toFixed(2) : '---'}</td>
                <td style="font-weight:bold">${pct}</td>
                <td><button class="btn-remover" onclick="removerDaCarteira(${index})">🗑️</button></td>
            </tr>`;
    });
}

function adicionarAcaoCarteira() {
    const t = document.getElementById('tickerCompra').value.toUpperCase().trim();
    const p = parseFloat(document.getElementById('precoPago').value);
    
    if (t && !isNaN(p)) {
        minhaCarteira.push({ ticker: t, precoPago: p });
        localStorage.setItem('minhaCarteira', JSON.stringify(minhaCarteira));
        document.getElementById('tickerCompra').value = "";
        document.getElementById('precoPago').value = "";
        atualizarPainelCarteira(); 
        buscarCotacoesBovespa();
    } else {
        alert("Preencha o Ticker e o Preço corretamente.");
    }
}

function removerDaCarteira(index) {
    minhaCarteira.splice(index, 1);
    localStorage.setItem('minhaCarteira', JSON.stringify(minhaCarteira));
    atualizarPainelCarteira();
    buscarCotacoesBovespa();
}

// --- CALCULADORA ---
function calcularRentabilidade() {
    const valor = parseFloat(document.getElementById('valorInvestido').value);
    const container = document.getElementById('tabela-rendimentos');
    if (!valor || valor <= 0) { alert("Insira um valor."); return; }
    
    const SELIC = 11.25; const CDI = SELIC - 0.10; 
    const calcCDB = (v, tempo) => (v * (CDI / 100 / tempo)) * 0.775;
    const calcLCI = (v, tempo) => (v * ((CDI * 0.9) / 100 / tempo));
    const calcPoup = (v, tempo) => (v * (0.0055 / (tempo === 252 ? 21 : 1)));

    container.innerHTML = `
        <div class="card-investimento"><h4>CDB (100% CDI)</h4><p>Mensal: <strong>R$ ${calcCDB(valor, 12).toFixed(2)}</strong></p></div>
        <div class="card-investimento"><h4>LCI (90% CDI)</h4><p>Mensal: <strong>R$ ${calcLCI(valor, 12).toFixed(2)}</strong></p></div>
        <div class="card-investimento"><h4>Poupança</h4><p>Mensal: <strong>R$ ${calcPoup(valor, 1).toFixed(2)}</strong></p></div>`;
}

// --- UTILITÁRIOS ---
function toggleDarkMode() { document.body.classList.toggle('dark-mode'); }

function filtrarTabela(tipo) {
    const linhas = document.querySelectorAll("#corpo-cotacoes tr");
    linhas.forEach(l => {
        l.style.display = (tipo === 'todos' || l.classList.contains('setor-' + tipo)) ? "" : "none";
    });
}

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

function toggleAjuda() {
    const p = document.getElementById("painel-ajuda");
    if (p) p.style.display = (p.style.display === "none" || p.style.display === "") ? "block" : "none";
}