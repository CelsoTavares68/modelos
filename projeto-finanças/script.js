 let transacoes = [];
let filtroTipo = 'todos';
let tipoSelecionado = 'receita'; 
let meuGrafico = null;

function formatarMoeda(v) { 
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); 
}

function inicializar() {
    const hoje = new Date();
    const mesAtual = hoje.toISOString().substring(0, 7);
    document.getElementById('mes-referencia').value = mesAtual;
    document.getElementById('dia').value = hoje.getDate();
    carregarDados();
}

function carregarDados() {
    const dados = localStorage.getItem('minhasTransacoesBRL');
    if (dados) { transacoes = JSON.parse(dados); }
    atualizarInterface();
}

function selecionarTipo(tipo) {
    tipoSelecionado = tipo;
    document.getElementById('btn-tipo-receita').classList.remove('ativo');
    document.getElementById('btn-tipo-despesa').classList.remove('ativo');
    document.getElementById(`btn-tipo-${tipo}`).classList.add('ativo');
    
    adicionarTransicao();
}

function adicionarTransicao() {
    const diaInput = parseInt(document.getElementById('dia').value);
    const desc = document.getElementById('descricao').value.trim();
    const valor = parseFloat(document.getElementById('valor').value);
    const tipo = tipoSelecionado; 
    const mes = document.getElementById('mes-referencia').value;

    if (!desc || isNaN(valor) || isNaN(diaInput)) return;

    const dia = Math.min(Math.max(diaInput, 1), 31);

    transacoes.push({ dia, desc, valor, tipo, mes });
    salvar();
    atualizarInterface();
    
    document.getElementById('descricao').value = "";
    document.getElementById('valor').value = "";
    document.getElementById('dia').value = new Date().getDate();
}

function atualizarInterface() {
    const corpo = document.querySelector('#tabela-contas tbody');
    const mesSelecionado = document.getElementById('mes-referencia').value;
    corpo.innerHTML = "";
    let saldoAcumulado = 0;

    const transacoesDoMes = transacoes
        .filter(t => t.mes === mesSelecionado)
        .sort((a, b) => (a.dia || 1) - (b.dia || 1));

    transacoesDoMes.forEach((t) => {
        if (t.tipo === 'receita') saldoAcumulado += t.valor;
        else saldoAcumulado -= t.valor;

        if (filtroTipo !== 'todos' && t.tipo !== filtroTipo) return;

        const indexReal = transacoes.indexOf(t);
        const linha = corpo.insertRow();
        
        linha.innerHTML = `
            <td style="font-weight: 600;">${t.dia || '1'}</td>
            <td>${t.desc}</td>
            <td style="color:${t.tipo==='receita'?'#2e7d32':'#d32f2f'}; font-weight: 600;">${formatarMoeda(t.valor)}</td>
            <td class="linha-tipo" style="color:${t.tipo==='receita'?'#2e7d32':'#d32f2f'}">${t.tipo.toUpperCase()}</td>
            <td class="linha-saldo" style="font-weight:bold">${formatarMoeda(saldoAcumulado)}</td>
            <td style="text-align:center;"><button class="btn-excluir" onclick="removerItem(${indexReal})">X</button></td>
        `;
    });
    
    document.getElementById('valor-total').innerText = formatarMoeda(saldoAcumulado);
    document.getElementById('valor-total').className = saldoAcumulado >= 0 ? 'saldo-positivo' : 'saldo-negativo';

    atualizarRelatorioAnual(mesSelecionado);
}

function calcularDadosAnuais(ano) {
    const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    let mesesReceitas = new Array(12).fill(0);
    let mesesDespesas = new Array(12).fill(0);
    let mesesSaldos = new Array(12).fill(0);
    let totalReceitasAno = 0;
    let totalDespesasAno = 0;

    for (let i = 0; i < 12; i++) {
        const mesStr = `${ano}-${String(i + 1).padStart(2, '0')}`;
        const transDoMes = transacoes.filter(t => t.mes === mesStr);

        let rec = 0;
        let desp = 0;
        transDoMes.forEach(t => {
            if (t.tipo === 'receita') rec += t.valor;
            else desp += t.valor;
        });

        mesesReceitas[i] = rec;
        mesesDespesas[i] = desp;
        mesesSaldos[i] = rec - desp;
        totalReceitasAno += rec;
        totalDespesasAno += desp;
    }

    const saldoTotalAno = totalReceitasAno - totalDespesasAno;
    let statusTexto = "EQUILÍBRIO";
    if (saldoTotalAno > 0) statusTexto = "SUPERÁVIT";
    else if (saldoTotalAno < 0) statusTexto = "DÉFICIT";

    return {
        mesesNomes,
        mesesReceitas,
        mesesDespesas,
        mesesSaldos,
        totalReceitasAno,
        totalDespesasAno,
        saldoTotalAno,
        statusTexto
    };
}

function atualizarRelatorioAnual(mesSelecionado) {
    if (!mesSelecionado) return;
    const ano = mesSelecionado.split('-')[0];
    document.getElementById('ano-atual-label').innerText = ano;

    const corpoAnual = document.querySelector('#tabela-anual tbody');
    const rodapeAnual = document.querySelector('#tabela-anual tfoot');
    corpoAnual.innerHTML = "";
    rodapeAnual.innerHTML = "";

    const dados = calcularDadosAnuais(ano);

    for (let i = 0; i < 12; i++) {
        const linha = corpoAnual.insertRow();
        linha.innerHTML = `
            <td>${dados.mesesNomes[i]}</td>
            <td style="color: #2e7d32;">${formatarMoeda(dados.mesesReceitas[i])}</td>
            <td style="color: #d32f2f;">${formatarMoeda(dados.mesesDespesas[i])}</td>
            <td style="font-weight: bold; color: ${dados.mesesSaldos[i] >= 0 ? '#2e7d32' : '#d32f2f'};">${formatarMoeda(dados.mesesSaldos[i])}</td>
        `;
    }

    let statusCor = "#555";
    if (dados.saldoTotalAno > 0) statusCor = "#2e7d32";
    else if (dados.saldoTotalAno < 0) statusCor = "#d32f2f";

    const linhaTotal = rodapeAnual.insertRow();
    linhaTotal.className = "linha-total-anual";
    linhaTotal.innerHTML = `
        <td><strong>TOTAL</strong></td>
        <td style="color: #2e7d32;"><strong>${formatarMoeda(dados.totalReceitasAno)}</strong></td>
        <td style="color: #d32f2f;"><strong>${formatarMoeda(dados.totalDespesasAno)}</strong></td>
        <td style="color: ${statusCor};">
            <strong>${formatarMoeda(dados.saldoTotalAno)}</strong><br>
            <span class="badge-status" style="background-color: ${statusCor};">${dados.statusTexto}</span>
        </td>
    `;

    renderizarGraficoAnual(dados.mesesNomes, dados.mesesSaldos);
}

function renderizarGraficoAnual(labels, saldos) {
    const ctx = document.getElementById('graficoAnual').getContext('2d');

    if (meuGrafico) {
        meuGrafico.destroy();
    }

    meuGrafico = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Saldo Total',
                    data: saldos,
                    borderColor: '#1a73e8',
                    backgroundColor: 'rgba(26, 115, 232, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.2,
                    pointBackgroundColor: saldos.map(v => v >= 0 ? '#2e7d32' : '#d32f2f'),
                    pointRadius: 5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false, // Garante captura imediata para PDF
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false
                }
            }
        }
    });
}

// PDF DO EXTRATO MENSAL
function exportarPDF() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const mes = document.getElementById('mes-referencia').value;
        
        doc.setFontSize(18);
        doc.setTextColor(26, 115, 232);
        doc.text("Extrato de Fluxo de Caixa", 14, 20);
        
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(`Referência: ${mes}`, 14, 28);
        
        let saldoEvolutivo = 0;
        const linhasPDF = transacoes
            .filter(t => t.mes === mes)
            .sort((a, b) => (a.dia || 1) - (b.dia || 1))
            .map(t => {
                saldoEvolutivo = (t.tipo === 'receita') ? saldoEvolutivo + t.valor : saldoEvolutivo - t.valor;
                return [String(t.dia || '1'), t.desc, formatarMoeda(t.valor), t.tipo.toUpperCase(), formatarMoeda(saldoEvolutivo)];
            });

        if(linhasPDF.length === 0) {
            alert("Não há dados para exportar neste mês.");
            return;
        }

        doc.autoTable({
            head: [["Dia", "Descrição", "Valor", "Tipo", "Saldo Acumulado"]],
            body: linhasPDF,
            startY: 35,
            theme: 'striped',
            headStyles: { fillColor: [26, 115, 232] }
        });

        doc.save(`Extrato_${mes}.pdf`);
    } catch (e) {
        alert("Erro ao gerar PDF. Verifique sua conexão com a internet.");
        console.error(e);
    }
}

// PDF DO BALANÇO ANUAL + GRÁFICO
function exportarPDFAnual() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const mesSelecionado = document.getElementById('mes-referencia').value;
        const ano = mesSelecionado.split('-')[0];
        const dados = calcularDadosAnuais(ano);

        doc.setFontSize(18);
        doc.setTextColor(26, 115, 232);
        doc.text(`Balanço Anual - ${ano}`, 14, 20);

        const corpoTabela = [];
        for (let i = 0; i < 12; i++) {
            corpoTabela.push([
                dados.mesesNomes[i],
                formatarMoeda(dados.mesesReceitas[i]),
                formatarMoeda(dados.mesesDespesas[i]),
                formatarMoeda(dados.mesesSaldos[i])
            ]);
        }

        doc.autoTable({
            head: [["Mês", "Receitas", "Despesas", "Saldo"]],
            body: corpoTabela,
            foot: [[
                "TOTAL ANUAL",
                formatarMoeda(dados.totalReceitasAno),
                formatarMoeda(dados.totalDespesasAno),
                `${formatarMoeda(dados.saldoTotalAno)} (${dados.statusTexto})`
            ]],
            startY: 28,
            theme: 'striped',
            headStyles: { fillColor: [26, 115, 232] },
            footStyles: { 
                fillColor: dados.saldoTotalAno >= 0 ? [46, 125, 50] : [211, 47, 47],
                textColor: [255, 255, 255],
                fontStyle: 'bold'
            }
        });

        // Adiciona a imagem do gráfico abaixo da tabela no PDF
        const canvas = document.getElementById('graficoAnual');
        if (canvas) {
            const imgData = canvas.toDataURL('image/png', 1.0);
            const finalY = doc.lastAutoTable.finalY + 10;
            
            doc.setFontSize(13);
            doc.setTextColor(60);
            doc.text("Evolução Anual do Saldo", 14, finalY);
            
            doc.addImage(imgData, 'PNG', 14, finalY + 5, 180, 75);
        }

        doc.save(`Balanco_Anual_${ano}.pdf`);
    } catch (e) {
        alert("Erro ao gerar Balanço Anual PDF.");
        console.error(e);
    }
}

// ENCERRAR E ZERAR O ANO
function zerarAnoAtual() {
    const mesSelecionado = document.getElementById('mes-referencia').value;
    const ano = mesSelecionado.split('-')[0];

    const transacoesDoAno = transacoes.filter(t => t.mes.startsWith(ano));
    if (transacoesDoAno.length === 0) {
        alert(`Não há lançamentos registrados no ano de ${ano} para zerar.`);
        return;
    }

    if (confirm(`ATENÇÃO: Deseja realmente encerrar o ano de ${ano} e ZERAR todos os lançamentos deste ano?\n\nRecomendamos gerar o Balanço Anual PDF antes de continuar.`)) {
        if (confirm(`Confirmação final: Todos os ${transacoesDoAno.length} registros de ${ano} serão apagados permanentemente. Confirmar?`)) {
            transacoes = transacoes.filter(t => !t.mes.startsWith(ano));
            salvar();
            atualizarInterface();
            alert(`O ano de ${ano} foi encerrado e todos os dados foram zerados com sucesso!`);
        }
    }
}

function removerItem(i) {
    if (confirm("Excluir este lançamento?")) {
        transacoes.splice(i, 1);
        salvar();
        atualizarInterface();
    }
}

function salvar() { 
    localStorage.setItem('minhasTransacoesBRL', JSON.stringify(transacoes)); 
}

function filtrar(tipo) {
    filtroTipo = tipo;
    document.querySelectorAll('.btn-filtro').forEach(b => b.classList.remove('ativo'));
    document.getElementById('f-'+tipo).classList.add('ativo');
    atualizarInterface();
}