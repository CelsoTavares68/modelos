  const TOKEN_B3 = '8gRPKYrszFRi4JCDaARwuJ'; 
const LISTA_BUSCA_BMF = "BGIG26,CCMH26,SJWH26,ICFH26,WDOG26,PETR4"; 

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

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
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

        const tbody = document.getElementById("corpo-cotacoes");
        if (tbody) {
            tbody.innerHTML = ""; 
            
            if (dataBMF && dataBMF.results) {
                dataBMF.results.forEach(item => {
                    const precoRaw = item.regularMarketPrice || item.price || 0;
                    const precoFormatado = precoRaw > 0 ? "R$ " + precoRaw.toFixed(2) : "---";
                    const varPct = item.regularMarketChangePercent || 0;
                    const cor = varPct >= 0 ? "texto-alta" : "texto-queda";
                    
                    // Lógica de Alerta: aplica animação se a queda for maior que 2%
                    const classeAlerta = varPct <= -2.0 ? "alerta-queda-grave" : "";

                    let nomeAtivo = item.symbol;
                    let nomeEmpresa = "BM&F Bovespa";

                    if(nomeAtivo.includes("BGI")) { nomeAtivo = "Boi Gordo"; }
                    else if(nomeAtivo.includes("CCM")) { nomeAtivo = "Milho"; }
                    else if(nomeAtivo.includes("SJW")) { nomeAtivo = "Soja"; nomeEmpresa = "CME Group"; }
                    else if(nomeAtivo.includes("ICF")) { nomeAtivo = "Café Arábica"; }
                    else if(nomeAtivo.includes("WDO")) { nomeAtivo = "Dólar Futuro"; nomeEmpresa = "Contrato Futuro"; }
                    else if(nomeAtivo === "PETR4") { nomeAtivo = "PETR4"; nomeEmpresa = "Petrobras S.A."; }

                    tbody.innerHTML += `<tr class="${classeAlerta}">
                        <td class="col-ativo">
                            <b>${nomeAtivo}</b>
                            <span class="nome-empresa">${nomeEmpresa}</span>
                        </td>
                        <td class="col-preco">${precoFormatado}</td>
                        <td class="col-pct ${cor}">${varPct >= 0 ? '+' : ''}${varPct.toFixed(2)}%</td>
                    </tr>`;
                });
            }
        }

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
    } catch (e) { console.error("Erro Geral:", e); }
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

  async function enviarOrdemParaServidor(tipo) {
    const ativoInput = document.getElementById('order-symbol');
    const qtdInput = document.getElementById('order-qty');
    const precoInput = document.getElementById('order-price');

    // Pegamos os valores
    const ativo = ativoInput.value.toUpperCase();
    const qtd = qtdInput.value;
    const preco = precoInput.value;

    // Teste de segurança: se algum estiver vazio, para aqui
    if (!ativo || !qtd || !preco) {
        alert("Preencha todos os campos: Ativo, Quantidade e Preço!");
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/executar-ordem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                ativo: ativo, 
                quantidade: qtd, 
                tipo: tipo, 
                preco: preco 
            })
        });

        const data = await response.json();
        
        // Limpa os campos para a próxima compra
        ativoInput.value = "";
        precoInput.value = "";
        
        // Atualiza a tabela imediatamente
        carregarHistoricoServidor();
        
    } catch (err) {
        alert("O servidor Node.js está desligado! Ligue-o no terminal.");
    }
}

async function carregarHistorico() {
    try {
        const response = await fetch('http://localhost:3000/obter-ordens');
        const data = await response.json();
        const tabela = document.getElementById('minha-custodia');
        
        // Limpa e preenche a tabela com o que está no arquivo .txt
        tabela.innerHTML = data.ordens.map(ordem => {
            return `<tr><td colspan="3" style="font-size:0.8rem">${ordem}</td></tr>`;
        }).join('');
    } catch (err) {
        console.log("Servidor offline, histórico não carregado.");
    }
}

// Função para carregar o histórico do servidor Node.js
 async function carregarHistoricoServidor() {
    const response = await fetch('http://localhost:3000/obter-ordens');
    const data = await response.json();
    const tabelaCorpo = document.getElementById('minha-custodia');
    tabelaCorpo.innerHTML = "";

    // Objeto para agrupar as ações
    const carteira = {};

    data.ordens.forEach(linha => {
        const [dataHora, tipo, ativo, qtd, preco] = linha.split('|');
        const quantidade = parseInt(qtd);
        const valorUnitario = parseFloat(preco);

        if (!carteira[ativo]) {
            carteira[ativo] = { quantidade: 0, precoMedio: 0, totalInvestido: 0 };
        }

        if (tipo === 'COMPRA') {
            carteira[ativo].quantidade += quantidade;
            carteira[ativo].totalInvestido += (quantidade * valorUnitario);
        } else {
            carteira[ativo].quantidade -= quantidade;
            // Se vendeu tudo, removemos o custo base proporcionalmente
            carteira[ativo].totalInvestido -= (quantidade * valorUnitario);
        }
    });

    // Agora desenhamos apenas quem tem quantidade maior que zero
    for (let ativo in carteira) {
        const pos = carteira[ativo];
        if (pos.quantidade <= 0) continue; // Se a quantidade for 0, não mostra na tabela!

        // Busca preço atual para lucro
        const precoAtual = buscarPrecoNoCard(ativo); 
        const lucro = (precoAtual * pos.quantidade) - pos.totalInvestido;
        const classeLucro = lucro >= 0 ? "texto-alta" : "texto-queda";

        tabelaCorpo.innerHTML += `
            <tr>
                <td><b>${ativo}</b><br><small>${pos.quantidade} un</small></td>
                <td>R$ ${(pos.totalInvestido / pos.quantidade).toFixed(2)}</td>
                <td class="${classeLucro}">R$ ${lucro.toFixed(2)}</td>
                <td><button onclick="venderPosicao('${ativo}', ${pos.quantidade})" class="btn-vender-tabela">Vender</button></td>
            </tr>
        `;
    }
}

// Função auxiliar para pegar o preço do card
function buscarPrecoNoCard(ativo) {
    const cards = document.querySelectorAll('.card-b3');
    let preco = 0;
    cards.forEach(card => {
        if (card.innerText.includes(ativo)) {
            const texto = card.querySelector('b')?.innerText || "0";
            preco = parseFloat(texto.replace("R$ ", "").replace(",", "."));
        }
    });
    return preco;
}

// Modifique o seu window.onload atual para incluir a chamada:
window.onload = () => {
    document.getElementById('data-atual').innerText = new Date().toLocaleDateString('pt-BR');
    inicializarApp();
    carregarHistoricoServidor(); // <--- Adicione esta linha aqui
};

let saldoAtual = 10000.00; // Começamos com 10 mil reais fictícios

async function venderPosicao(ativo, qtd, precoCompra) {
    // 1. Pegar o preço atual do mercado
    const cards = document.querySelectorAll('.card-b3');
    let precoMercado = 0;
    cards.forEach(card => {
        if (card.innerText.includes(ativo)) {
            const precoTexto = card.querySelector('b')?.innerText || "0";
            precoMercado = parseFloat(precoTexto.replace("R$ ", "").replace(",", "."));
        }
    });

    if (precoMercado === 0) return alert("Não é possível vender: Preço de mercado não encontrado.");

    // 2. Calcular o valor da venda
    const valorVenda = precoMercado * qtd;
    saldoAtual += valorVenda;

    // 3. Atualizar o saldo na tela
    document.getElementById('saldo-valor').innerText = `R$ ${saldoAtual.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;

    // 4. Registrar a venda no Node.js
    await fetch('http://localhost:3000/executar-ordem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            ativo: ativo, 
            quantidade: qtd, 
            tipo: 'VENDA', 
            preco: precoMercado 
        })
    });

    alert(`Vendido! R$ ${valorVenda.toFixed(2)} adicionados ao saldo.`);
    carregarHistoricoServidor();
}