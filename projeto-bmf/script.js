    const TOKEN = "8gRPKYrszFRi4JCDaARwuJ"; 
const ATIVOS = "BGI,CCM,SJW,ICF,WDO,PETR4,WTI"; 
let meuGrafico = null;

async function fetchMercado() {
    const tbody = document.getElementById("corpo-cotacoes");
    const status = document.getElementById("status-conexao");

    try {
        const response = await fetch(`https://brapi.dev/api/quote/${ATIVOS}?token=${TOKEN}`);
        const data = await response.json();

        if (data.results) {
            tbody.innerHTML = "";
            data.results.forEach(item => {
                const tr = document.createElement("tr");
                const variacao = item.regularMarketChangePercent || 0;
                const corVar = variacao >= 0 ? "subida" : "queda";

                tr.innerHTML = `
                    <td><strong>${item.symbol}</strong></td>
                    <td>${item.shortName || 'Commodity'}</td>
                    <td>R$ ${(item.regularMarketPrice || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                    <td class="${corVar}">${variacao.toFixed(2)}%</td>
                    <td><img src="${item.logourl || ''}" width="20" onerror="this.style.display='none'"></td>
                `;
                tbody.appendChild(tr);
            });
            atualizarGrafico(data.results);
            status.innerText = "Online - " + new Date().toLocaleTimeString();
        }
    } catch (e) {
        status.innerText = "Erro na conexão.";
    }
}

function atualizarGrafico(dados) {
    const ctx = document.getElementById('graficoPerformance');
    if (!ctx) return;
    const labels = dados.map(item => item.symbol);
    const valores = dados.map(item => item.regularMarketChangePercent || 0);
    const cores = valores.map(v => v >= 0 ? '#0ecb81' : '#f6465d');

    if (meuGrafico) meuGrafico.destroy();
    meuGrafico = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{ data: valores, backgroundColor: cores, borderRadius: 5 }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: '#333' }, ticks: { color: '#848e9c' } },
                y: { ticks: { color: '#fff' } }
            }
        }
    });
}

function toggleAjuda() {
    const p = document.getElementById("painel-ajuda");
    p.style.display = p.style.display === "none" ? "block" : "none";
}

window.onload = () => {
    fetchMercado();
    setInterval(fetchMercado, 60000);
};