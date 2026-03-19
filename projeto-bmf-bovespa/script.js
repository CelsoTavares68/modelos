 const TOKEN_B3 = '8gRPKYrszFRi4JCDaARwuJ'; 

// LISTAS
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

// =========================================================
//   PAINEL DE CONTROLE MANUAL (ALTERE AQUI TODO MÊS)
// =========================================================
let SELIC_ATUAL = 10.75; 
let CDI_ATUAL   = 10.65;
let IPCA_ATUAL  = "4.42"; 
let IGPM_ATUAL  = "1.12"; 
// =========================================================

let chartMercado = null;
let minhaCarteira = JSON.parse(localStorage.getItem('minhaCarteira')) || [];
let COTACAO_USD = 0;
let COTACAO_EUR = 0;

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

    atualizarPainelCarteira(); 
    
    // Chamadas iniciais
    buscarApenasMoedas();
    buscarApenasTaxas();
    
    // NOVA CHAMADA: Busca as bolsas mundiais
    await buscarIndicesGlobais(); 
    
    await buscarCotacoesAgro(); 
    await buscarCotacoesBovespa();
}  

// --- NOVIDADE: FUNÇÃO PARA BOLSAS MUNDIAIS ---
async function buscarIndicesGlobais() {
    const container = document.getElementById('indices-globais');
    if (!container) return;

    const listaIndices = [
        { id: '^BVSP', nome: '🇧🇷 IBOVESPA' },
        { id: '^GSPC', nome: '🇺🇸 S&P 500' },
        { id: '^IXIC', nome: '🇺🇸 NASDAQ' },
        { id: '^FTSE', nome: '🇬🇧 FTSE 100' }
    ];

    container.innerHTML = ""; 

    for (const item of listaIndices) {
        try {
            const url = `https://brapi.dev/api/quote/${encodeURIComponent(item.id)}?token=${TOKEN_B3}`;
            const res = await fetch(url);
            const data = await res.json();

            if (data && data.results && data.results[0]) {
                const result = data.results[0];
                const preco = result.regularMarketPrice || result.price || 0;
                const pct = result.regularMarketChangePercent || result.changePercent || 0;
                const cor = pct >= 0 ? 'texto-alta' : 'texto-queda';
                const seta = pct >= 0 ? '▲' : '▼';

                container.innerHTML += `
                    <div class="card-investimento" style="padding: 15px; ${item.id === '^BVSP' ? 'border-bottom: 3px solid #527496;' : ''}">
                        <h4 style="margin-bottom: 5px; font-size: 0.85rem;">${item.nome}</h4>
                        <b style="font-size: 1.1rem; display: block;">${preco.toLocaleString('pt-BR')}</b>
                        <span class="${cor}" style="font-weight: bold; font-size: 0.9rem;">
                            ${seta} ${pct.toFixed(2)}%
                        </span>
                    </div>`;
            }
        } catch (e) {
            console.warn(`Erro ao carregar índice ${item.id}`);
        }
    }
}

// --- MOEDAS E CRIPTOS ---
 async function buscarApenasMoedas() {
    try {
        const url = 'https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,BTC-BRL,ETH-BRL,XAU-BRL';
        const res = await fetch(url);
        const d = await res.json();
        const SPREAD = 1.08; // O seu multiplicador de 8% para o Turismo

        if (d.USDBRL) {
            COTACAO_USD = parseFloat(d.USDBRL.bid); 
            // Exibe no painel (Comercial e Turismo)
            document.getElementById('usd-comercial').innerText = "R$ " + COTACAO_USD.toFixed(2);
            document.getElementById('usd-turismo').innerText = "R$ " + (COTACAO_USD * SPREAD).toFixed(2);
        }
        
        if (d.EURBRL) {
            COTACAO_EUR = parseFloat(d.EURBRL.bid);
            // Exibe no painel (Comercial e Turismo)
            document.getElementById('eur-comercial').innerText = "R$ " + COTACAO_EUR.toFixed(2);
            document.getElementById('eur-turismo').innerText = "R$ " + (COTACAO_EUR * SPREAD).toFixed(2);
        }
        if (d.BTCBRL) document.getElementById('btc-val').innerText = "R$ " + parseFloat(d.BTCBRL.bid).toLocaleString('pt-BR');
        if (d.ETHBRL) document.getElementById('eth-val').innerText = "R$ " + parseFloat(d.ETHBRL.bid).toLocaleString('pt-BR');
        if (d.XAUBRL) {
            const ouroGrama = parseFloat(d.XAUBRL.bid) / 31.1035;
            document.getElementById('gold-val').innerText = "R$ " + ouroGrama.toFixed(2);
        }
    } catch (e) { console.error("Erro Moedas:", e); }
}

  function converterMoedas(origem) {
    const valorBRL = document.getElementById('calc-brl');
    const valorUSD = document.getElementById('calc-usd');
    const valorEUR = document.getElementById('calc-eur');

    // 1. Pega as cotações atuais que já estão nos cards do seu dashboard
    const COTACAO_USD = parseFloat(document.getElementById('usd-comercial').innerText.replace('R$ ', '').replace('.', '').replace(',', '.'));
    const COTACAO_EUR = parseFloat(document.getElementById('eur-comercial').innerText.replace('R$ ', '').replace('.', '').replace(',', '.'));

    if (!COTACAO_USD || !COTACAO_EUR) return;

    // 2. Configuração para formatar no padrão brasileiro (1.000,00)
    const estiloMoeda = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

    // 3. Função auxiliar para converter o texto "1.500,00" em número real (1500.00)
    const limparParaNumero = (input) => {
        let valor = input.value.replace(/\./g, '').replace(',', '.');
        return parseFloat(valor) || 0;
    };

    if (origem === 'BRL') {
        const v = limparParaNumero(valorBRL);
        if (v === 0) { valorUSD.value = ""; valorEUR.value = ""; return; }
        valorUSD.value = (v / COTACAO_USD).toLocaleString('pt-BR', estiloMoeda);
        valorEUR.value = (v / COTACAO_EUR).toLocaleString('pt-BR', estiloMoeda);
    } 
    else if (origem === 'USD') {
        const v = limparParaNumero(valorUSD);
        if (v === 0) { valorBRL.value = ""; valorEUR.value = ""; return; }
        const emReais = v * COTACAO_USD;
        valorBRL.value = emReais.toLocaleString('pt-BR', estiloMoeda);
        valorEUR.value = (emReais / COTACAO_EUR).toLocaleString('pt-BR', estiloMoeda);
    } 
    else if (origem === 'EUR') {
        const v = limparParaNumero(valorEUR);
        if (v === 0) { valorBRL.value = ""; valorUSD.value = ""; return; }
        const emReais = v * COTACAO_EUR;
        valorBRL.value = emReais.toLocaleString('pt-BR', estiloMoeda);
        valorUSD.value = (emReais / COTACAO_USD).toLocaleString('pt-BR', estiloMoeda);
    }
}

// --- TAXAS ---
  function buscarApenasTaxas() {
    // Em vez de buscar na internet, usamos os valores que você definiu no topo
    document.getElementById('taxa-selic').innerText = SELIC_ATUAL.toFixed(2) + "%";
    document.getElementById('taxa-cdi').innerText = CDI_ATUAL.toFixed(2) + "%";
    document.getElementById('taxa-ipca').innerText = IPCA_ATUAL + "%";
    document.getElementById('taxa-igpm').innerText = IGPM_ATUAL + "%";
}

// --- MERCADO AGRO ---
async function buscarCotacoesAgro() {
    const ativos = LISTA_AGRO_BMF.split(',');
    for (const ticker of ativos) {
        const tickerLimpo = ticker.trim();
        const urls = [
            `https://brapi.dev/api/quote/${tickerLimpo}?token=${TOKEN_B3}`,
            `https://brapi.dev/api/quote/${tickerLimpo}.SA?token=${TOKEN_B3}`
        ];

        for (const url of urls) {
            try {
                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    if (data.results && data.results[0]) {
                        renderizarLinhaTabela(data.results[0], "BMF");
                        break; 
                    }
                }
            } catch (e) {}
        }
    }
}

// --- MERCADO BOVESPA ---
async function buscarCotacoesBovespa() {
    try {
        const resRanking = await fetch(`https://brapi.dev/api/quote/list?token=${TOKEN_B3}`);
        const dataRanking = await resRanking.json();
        if (dataRanking && dataRanking.stocks) processarRanking(dataRanking);

        const limpar = (t) => t.trim().replace('.SA', '').replace(/F$/, '') + ".SA";
        const arrayEstatais = LISTA_ACOES_B3.split(',').map(limpar);
        const arrayCarteira = minhaCarteira.map(a => limpar(a.ticker));
        const todosTickers = [...new Set([...arrayEstatais, ...arrayCarteira])];

        if (todosTickers.length === 0) return;

        let resultadosFinais = [];
        try {
            const resLote = await fetch(`https://brapi.dev/api/quote/${todosTickers.join(',')}?token=${TOKEN_B3}`);
            const dadosLote = await resLote.json();
            if (dadosLote && dadosLote.results) {
                resultadosFinais = dadosLote.results;
            } else {
                throw new Error("Lote falhou");
            }
        } catch (err) {
            const promessas = todosTickers.map(t => 
                fetch(`https://brapi.dev/api/quote/${t}?token=${TOKEN_B3}`)
                    .then(r => r.ok ? r.json() : null)
                    .catch(() => null)
            );
            const r = await Promise.all(promessas);
            resultadosFinais = r.filter(x => x && x.results).map(x => x.results[0]);
        }

        if (resultadosFinais.length > 0) {
            document.querySelectorAll('.setor-b3').forEach(l => l.remove());
            resultadosFinais.forEach(item => {
                if (item && item.symbol) renderizarLinhaTabela(item, "B3");
            });
            atualizarPainelCarteira(resultadosFinais);
        }
        
        document.getElementById('status-conexao').innerText = "✅ Sistema Online";
    } catch (e) { 
        console.error("Erro Bovespa:", e); 
    }
}

function renderizarLinhaTabela(item, origem) {
    const tbody = document.getElementById("corpo-cotacoes");
    if (!tbody || !item) return;

    const symbolOriginal = item.symbol.replace('.SA', '');
    let nomePrincipal = symbolOriginal;
    let subNome = "";

    if (origem === "BMF") {
        nomePrincipal = MAPA_NOMES_AGRO[symbolOriginal] || symbolOriginal;
        subNome = symbolOriginal;
    } else {
        nomePrincipal = symbolOriginal;
        subNome = item.longName || item.shortName || "";
    }

    const preco = item.regularMarketPrice || item.price || 0;
    const variacao = item.regularMarketChangePercent || item.changePercent || 0;

    if (document.getElementById(`linha-${symbolOriginal}`)) return;

    tbody.innerHTML += `
        <tr id="linha-${symbolOriginal}" class="setor-${origem.toLowerCase()}">
            <td><b>${nomePrincipal}</b><br><small style="opacity:0.7">${subNome}</small></td>
            <td>R$ ${preco.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
            <td class="${variacao >= 0 ? 'texto-alta' : 'texto-queda'}">${variacao.toFixed(2)}%</td>
        </tr>`;
}

function processarRanking(dataRanking) {
    const apenasAcoes = dataRanking.stocks.filter(s => s.stock.replace('.SA', '').length <= 6);
    const ordenado = [...apenasAcoes].sort((a, b) => (b.change || 0) - (a.change || 0));

    const topAltas = ordenado.slice(0, 30);
    const topBaixas = ordenado.slice(-30).reverse();

    const formatLi = (a, c) => {
        let nome = a.name || a.stock;
        if (nome.includes(" - ")) nome = nome.split(" - ")[1];
        return `
            <li style="display: flex; justify-content: space-between; align-items: center; padding: 10px 5px; border-bottom: 1px solid rgba(0,0,0,0.05);">
                <span style="flex: 1; text-align: left; min-width: 0;">
                    <b style="display: block; font-size: 0.95em;">${a.stock.replace('.SA', '')}</b>
                    <small style="display: block; color: #777; font-size: 0.75em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;">${nome}</small>
                </span>
                <span style="flex: 1; text-align: center; color: #444; font-size: 0.9em;">R$ ${(a.close || 0).toFixed(2)}</span>
                <span class="${c}" style="flex: 1; text-align: right; font-weight: bold;">${(a.change || 0).toFixed(2)}%</span>
            </li>`;
    };

    document.getElementById('lista-altas').innerHTML = topAltas.map(a => formatLi(a, 'texto-alta')).join('');
    document.getElementById('lista-baixas').innerHTML = topBaixas.map(a => formatLi(a, 'texto-queda')).join('');

    if (typeof renderizarGrafico === "function") {
        const dadosCompletosGrafico = [...topAltas, ...topBaixas].map(item => ({
            symbol: item.stock.replace('.SA', ''),
            change: item.change || 0
        }));
        renderizarGrafico(dadosCompletosGrafico);
    }
}

function atualizarPainelCarteira(dadosApi = null) {
    const tbody = document.getElementById('corpo-carteira');
    if (!tbody) return;
    
    tbody.innerHTML = "";
    minhaCarteira.forEach((item, index) => {
        const tickerLimpoCarteira = item.ticker.trim().replace('.SA', '').replace(/F$/, '');
        const info = dadosApi ? dadosApi.find(res => res.symbol.replace('.SA', '').replace(/F$/, '') === tickerLimpoCarteira) : null;

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
    }
}

function removerDaCarteira(index) {
    minhaCarteira.splice(index, 1);
    localStorage.setItem('minhaCarteira', JSON.stringify(minhaCarteira));
    atualizarPainelCarteira();
    buscarCotacoesBovespa();
}

 function calcularRentabilidade() {
    const valor = parseFloat(document.getElementById('valorInvestido').value);
    const container = document.getElementById('tabela-rendimentos');
    if (!valor || valor <= 0) return;

    // Agora usa os valores que vieram da API HG Brasil
    const calcCDB = (v) => (v * (CDI_ATUAL / 100 / 12)) * 0.775; // 22.5% IR (curto prazo)
    const calcLCI = (v) => (v * ((CDI_ATUAL * 0.9) / 100 / 12)); // LCI 90% isenta
    const calcPoup = (v) => (v * 0.0055); // Regra padrão 0.5% + TR

    container.innerHTML = `
        <div class="card-investimento">
            <h4>CDB (100% CDI)</h4>
            <p>Mensal aprox: <strong>R$ ${calcCDB(valor).toFixed(2)}</strong></p>
            <small>Base: ${CDI_ATUAL}% a.a.</small>
        </div>
        <div class="card-investimento">
            <h4>LCI (90% CDI)</h4>
            <p>Mensal aprox: <strong>R$ ${calcLCI(valor).toFixed(2)}</strong></p>
            <small>Isento de IR</small>
        </div>
        <div class="card-investimento">
            <h4>Poupança</h4>
            <p>Mensal aprox: <strong>R$ ${calcPoup(valor).toFixed(2)}</strong></p>
            <small>0.5% + TR</small>
        </div>`;
}

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