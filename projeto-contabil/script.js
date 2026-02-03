     let transacoes = [];
let filtroTipo = 'todos';

function formatarMoeda(v) { 
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); 
}

function inicializar() {
    const hoje = new Date();
    const mesAtual = hoje.toISOString().substring(0, 7);
    document.getElementById('mes-referencia').value = mesAtual;
    carregarDados();
}

function carregarDados() {
    const dados = localStorage.getItem('minhasTransacoesBRL');
    if (dados) { transacoes = JSON.parse(dados); }
    atualizarInterface();
}

function adicionarTransicao() {
    const desc = document.getElementById('descricao').value;
    const valor = parseFloat(document.getElementById('valor').value);
    const tipo = document.getElementById('tipo').value;
    const mes = document.getElementById('mes-referencia').value;

    if (!desc || isNaN(valor)) return alert("Preencha os campos corretamente.");

    transacoes.push({ desc, valor, tipo, mes });
    salvar();
    atualizarInterface();
    
    document.getElementById('descricao').value = "";
    document.getElementById('valor').value = "";
}

function atualizarInterface() {
    const corpo = document.querySelector('#tabela-contas tbody');
    const mesSelecionado = document.getElementById('mes-referencia').value;
    corpo.innerHTML = "";
    let saldoAcumulado = 0;

    const transacoesDoMes = transacoes.filter(t => t.mes === mesSelecionado);

    transacoesDoMes.forEach((t) => {
        if (t.tipo === 'receita') saldoAcumulado += t.valor;
        else saldoAcumulado -= t.valor;

        if (filtroTipo !== 'todos' && t.tipo !== filtroTipo) return;

        const indexReal = transacoes.indexOf(t);
        const linha = corpo.insertRow();
        linha.innerHTML = `
            <td>${t.desc}</td>
            <td>${formatarMoeda(t.valor)}</td>
            <td style="color:${t.tipo==='receita'?'green':'red'}">${t.tipo.toUpperCase()}</td>
            <td style="font-weight:bold">${formatarMoeda(saldoAcumulado)}</td>
            <td><button class="btn-excluir" onclick="removerItem(${indexReal})">X</button></td>
        `;
    });
    
    document.getElementById('valor-total').innerText = formatarMoeda(saldoAcumulado);
    document.getElementById('valor-total').className = saldoAcumulado >= 0 ? 'saldo-positivo' : 'saldo-negativo';
}

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
            .map(t => {
                saldoEvolutivo = (t.tipo === 'receita') ? saldoEvolutivo + t.valor : saldoEvolutivo - t.valor;
                return [t.desc, formatarMoeda(t.valor), t.tipo.toUpperCase(), formatarMoeda(saldoEvolutivo)];
            });

        if(linhasPDF.length === 0) {
            alert("Não há dados para exportar neste mês.");
            return;
        }

        doc.autoTable({
            head: [["Descrição", "Valor", "Tipo", "Saldo Acumulado"]],
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