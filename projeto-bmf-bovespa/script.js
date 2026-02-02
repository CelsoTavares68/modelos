  const TOKEN_B3 = '8gRPKYrszFRi4JCDaARwuJ'; 
  const LISTA_ACOES_TESTE = "VALE3,ITUB4,ABEV3,PETR4";
const LISTA_AGRO_BMF = "BGIH26,CCMH26,SJWK26,ICFH26,WDOH26,CTPH26";

// Criamos a lista final que a API vai usar, juntando as duas
const LISTA_BUSCA_BMF = LISTA_AGRO_BMF + "," + LISTA_ACOES_TESTE;

let chartMercado = null;

window.onload = () => {
    document.getElementById('data-atual').innerText = new Date().toLocaleDateString('pt-BR');
    inicializarApp();
};

async function inicializarApp() {
    document.getElementById('status-conexao').innerText = "🔄 Sincronizando sistema 2026...";
    buscarApenasMoedas();
    buscarApenasTaxas();
    buscarMercadoB3eBMF();
}

async function buscarApenasMoedas() {
    try {
        const url = 'https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,BTC-BRL,ETH-BRL,XAU-BRL';
        const res = await fetch(url);
        const d = await res.json();
        const SPREAD_TURISMO = 1.08; 

        if (d.USDBRL) {
            const usdCom = parseFloat(d.USDBRL.bid);
            document.getElementById('usd-comercial').innerText = "R$ " + usdCom.toFixed(2);
            document.getElementById('usd-turismo').innerText = "R$ " + (usdCom * SPREAD_TURISMO).toFixed(2);
        }
        if (d.EURBRL) {
            const eurCom = parseFloat(d.EURBRL.bid);
            document.getElementById('eur-comercial').innerText = "R$ " + eurCom.toFixed(2);
            document.getElementById('eur-turismo').innerText = "R$ " + (eurCom * SPREAD_TURISMO).toFixed(2);
        }
        if (d.BTCBRL) document.getElementById('btc-val').innerText = "R$ " + parseFloat(d.BTCBRL.bid).toLocaleString('pt-BR');
        if (d.ETHBRL) document.getElementById('eth-val').innerText = "R$ " + parseFloat(d.ETHBRL.bid).toLocaleString('pt-BR');
        if (d.XAUBRL) {
            const ouroGrama = parseFloat(d.XAUBRL.bid) / 31.1035;
            document.getElementById('gold-val').innerText = "R$ " + ouroGrama.toFixed(2);
        }
    } catch (e) { console.error(e); }
}

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
    } catch (e) { console.error(e); }
}

   async function buscarMercadoB3eBMF() {
    try {
        const resRanking = await fetch(`https://brapi.dev/api/quote/list?sortBy=change&sortOrder=desc&token=${TOKEN_B3}`);
        const dataRanking = await resRanking.json();

        const resBMF = await fetch(`https://brapi.dev/api/quote/${LISTA_BUSCA_BMF}?token=${TOKEN_B3}`);
        const dataBMF = await resBMF.json();

        console.log("--- DADOS CONSOLIDADOS (AGRO + TESTE) ---");
        console.table(dataBMF.results);

        const tbody = document.getElementById("corpo-cotacoes");
        if (tbody) {
            tbody.innerHTML = ""; 
            const meusTickers = LISTA_BUSCA_BMF.split(',');

            meusTickers.forEach(ticker => {
                const itemApi = dataBMF.results ? dataBMF.results.find(res => res.symbol === ticker) : null;

                let nomeAmigavel = ticker;
                let precoExibicao = "---";
                let pctExibicao = "0.00%";
                let classeCor = "";

                if (itemApi && (itemApi.regularMarketPrice || itemApi.price)) {
                    const precoRaw = itemApi.regularMarketPrice || itemApi.price;
                    precoExibicao = "R$ " + precoRaw.toFixed(2);
                    const varPct = itemApi.regularMarketChangePercent || 0;
                    pctExibicao = (varPct >= 0 ? '+' : '') + varPct.toFixed(2) + "%";
                    classeCor = varPct >= 0 ? "texto-alta" : "texto-queda";
                }

                // Lógica de nomes amigáveis para o Agro
                if(ticker.includes("BGI")) nomeAmigavel = "Boi Gordo";
                else if(ticker.includes("CCM")) nomeAmigavel = "Milho";
                else if(ticker.includes("SJW")) nomeAmigavel = "Soja";
                else if(ticker.includes("ICF")) nomeAmigavel = "Café Arábica";
                else if(ticker.includes("WDO")) nomeAmigavel = "Trigo Futuro";
               else if(ticker.includes("CTP")) nomeAmigavel = "Algodão";      
                else if(ticker === "PETR4") nomeAmigavel = "Petrobras";
                else if(ticker === "VALE3") nomeAmigavel = "Vale S.A.";
                else if(ticker === "ITUB4") nomeAmigavel = "Itaú Unibanco";
                else if(ticker === "ABEV3") nomeAmigavel = "Ambev S.A.";

                tbody.innerHTML += `
                    <tr>
                        <td class="col-ativo">
                            <b>${nomeAmigavel}</b>
                            <span class="nome-empresa-agro">${ticker} | BMF</span>
                        </td>
                        <td class="col-preco">${precoExibicao}</td>
                        <td class="col-pct ${classeCor}">${pctExibicao}</td>
                    </tr>`;
            });
        }

        // --- AS AÇÕES DA BOVESPA E O GRÁFICO CONTINUAM IGUAIS ABAIXO ---
        if (dataRanking && dataRanking.stocks) {
            const apenasAcoes = dataRanking.stocks.filter(s => s.stock.length <= 6);
            const topAltas = apenasAcoes.slice(0, 15);
            const topBaixas = apenasAcoes.slice(-15).reverse();

            const formatLi = (a, c) => `
                <li>
                    <div style="flex: 1;">
                        <strong>${a.stock}</strong>
                        <small class="nome-empresa" style="margin-top:0">${a.name || 'Empresa B3'}</small>
                    </div>
                    <span style="width: 80px; text-align: right; font-weight: 600;">R$ ${a.close.toFixed(2)}</span>
                    <b class="${c}" style="width: 70px; text-align: right;">${(a.change || 0).toFixed(2)}%</b>
                </li>`;
            
            document.getElementById('lista-altas').innerHTML = topAltas.map(a => formatLi(a, 'texto-alta')).join('');
            document.getElementById('lista-baixas').innerHTML = topBaixas.map(a => formatLi(a, 'texto-queda')).join('');

            const dadosParaGrafico = [...topAltas, ...topBaixas].map(item => ({
                symbol: item.stock,
                change: item.change
            }));
            renderizarGrafico(dadosParaGrafico);
        }

        document.getElementById('status-conexao').innerText = "✅ Atualizado: " + new Date().toLocaleTimeString();
    } catch (e) { 
        console.error("Erro Geral:", e); 
    }
}
// NOVA FUNÇÃO PARA ALTERNAR TEMA
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
}

function renderizarGrafico(dados) {
    if (!dados || window.innerWidth < 768) return;
    const ctx = document.getElementById('graficoMercado').getContext('2d');
    if (chartMercado) chartMercado.destroy();
    chartMercado = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dados.map(a => a.symbol),
            datasets: [{
                label: '% Variação',
                data: dados.map(a => a.change || 0),
                backgroundColor: dados.map(a => (a.change || 0) >= 0 ? '#27ae60' : '#e74c3c'),
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { ticks: { callback: v => v + "%" } } }
        }
    });
}

function toggleAjuda() {
    const p = document.getElementById("painel-ajuda");
    p.style.display = p.style.display === "none" ? "block" : "none";
}

   function calcularRentabilidade() {
    const valor = parseFloat(document.getElementById('valorInvestido').value);
    const container = document.getElementById('tabela-rendimentos');

    if (!valor || valor <= 0) {
        alert("Insira um valor para calcular.");
        return;
    }

    const SELIC = 11.25; 
    const CDI = SELIC - 0.10;
    const diasUteisAno = 252;
    const mesesAno = 12;

    const calcCDB = (v, tempo) => (v * (CDI / 100 / tempo)) * 0.775;
    const calcLCI = (v, tempo) => (v * ((CDI * 0.9) / 100 / tempo));
    const calcPoup = (v, tempo) => (v * (0.0055 / (tempo === 252 ? 21 : 1)));

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