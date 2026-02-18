 class ContaContabil {
    constructor(id, code, name, tipo) {
        this.id = id || Date.now().toString() + Math.random().toString(36).substr(2, 5);
        this.code = code;
        this.name = name;
        this.tipo = tipo; 
    }

    get natureza() {
        // Natureza Devedora: 1 (Ativo) e 4 (Despesas) 
        // Natureza Credora: 2 (Passivo/PL) e 3 (Receitas)
        const prefixo = this.code.split('.')[0];
        return (prefixo === '1' || prefixo === '4') ? 'DEVEDORA' : 'CREDORA';
    }
}

class GerenciadorContabil {
    constructor() {
        this.contas = [];
        this.lancamentos = [];
        this.abaAtual = 'diario';
        this.carregarDados();
    }

    carregarDados() {
        // ESTRUTURA EXATA DO PLANO DE CONTAS ENVIADO
        const contasPadrao = [
            // 1. ATIVO (Natureza Devedora)
            { id: 'c1', code: '1', name: 'ATIVO', tipo: 'A' },
            { id: 'c2', code: '1.01', name: 'ATIVO CIRCULANTE', tipo: 'A' },
            { id: 'c3', code: '1.01.01', name: 'Disponibilidades', tipo: 'A' },
            { id: 'c4', code: '1.01.01.001', name: 'Caixa Geral', tipo: 'A' },
            { id: 'c5', code: '1.01.01.002', name: 'Bancos Conta Movimento', tipo: 'A' },
            { id: 'c6', code: '1.01.02', name: 'Contas a Receber', tipo: 'A' },
            { id: 'c7', code: '1.01.02.001', name: 'Clientes Nacionais', tipo: 'A' },
            { id: 'c8', code: '1.01.03', name: 'Estoques', tipo: 'A' },
            { id: 'c9', code: '1.01.03.001', name: 'Mercadorias para Revenda', tipo: 'A' },
            { id: 'c10', code: '1.02', name: 'ATIVO NÃO CIRCULANTE', tipo: 'A' },
            { id: 'c11', code: '1.02.01', name: 'Imobilizado', tipo: 'A' },
            { id: 'c12', code: '1.02.01.001', name: 'Máquinas e Equipamentos', tipo: 'A' },
            { id: 'c13', code: '1.02.01.002', name: 'Móveis e Utensílios', tipo: 'A' },
            { id: 'c14', code: '1.02.01.003', name: 'Veículos', tipo: 'A' },

            // 2. PASSIVO E PATRIMÔNIO LÍQUIDO (Natureza Credora)
            { id: 'c15', code: '2', name: 'PASSIVO E PATRIMÔNIO LÍQUIDO', tipo: 'P' },
            { id: 'c16', code: '2.01', name: 'PASSIVO CIRCULANTE', tipo: 'P' },
            { id: 'c17', code: '2.01.01', name: 'Obrigações Comerciais', tipo: 'P' },
            { id: 'c18', code: '2.01.01.001', name: 'Fornecedores Nacionais', tipo: 'P' },
            { id: 'c19', code: '2.01.02', name: 'Obrigações Trabalhistas', tipo: 'P' },
            { id: 'c20', code: '2.01.02.001', name: 'Salários a Pagar', tipo: 'P' },
            { id: 'c21', code: '2.01.02.002', name: 'FGTS/INSS a Recolher', tipo: 'P' },
            { id: 'c22', code: '2.01.03', name: 'Obrigações Tributárias', tipo: 'P' },
            { id: 'c23', code: '2.01.03.001', name: 'Simples Nacional a Recolher', tipo: 'P' },
            { id: 'c24', code: '2.03', name: 'PATRIMÔNIO LÍQUIDO', tipo: 'PL' },
            { id: 'c25', code: '2.03.01', name: 'Capital Realizado', tipo: 'PL' },
            { id: 'c26', code: '2.03.01.001', name: 'Capital Social', tipo: 'PL' },
            { id: 'c27', code: '2.03.02', name: 'Reservas e Lucros', tipo: 'PL' },
            { id: 'c28', code: '2.03.02.001', name: 'Lucros ou Prejuízos Acumulados', tipo: 'PL' },

            // 3. RECEITAS (Natureza Credora)
            { id: 'c29', code: '3', name: 'RECEITAS', tipo: 'R' },
            { id: 'c30', code: '3.01', name: 'RECEITA BRUTA', tipo: 'R' },
            { id: 'c31', code: '3.01.01.001', name: 'Venda de Mercadorias', tipo: 'R' },
            { id: 'c32', code: '3.01.01.002', name: 'Prestação de Serviços', tipo: 'R' },
            { id: 'c33', code: '3.02', name: 'DEDUÇÕES DA RECEITA', tipo: 'R' },
            { id: 'c34', code: '3.02.01.001', name: 'Impostos sobre Vendas (Simples Nacional)', tipo: 'R' },

            // 4. DESPESAS E CUSTOS (Natureza Devedora)
            { id: 'c35', code: '4', name: 'DESPESAS E CUSTOS', tipo: 'D' },
            { id: 'c36', code: '4.01', name: 'CUSTOS DAS VENDAS', tipo: 'D' },
            { id: 'c37', code: '4.01.01.001', name: 'Custo das Mercadorias Vendidas (CMV)', tipo: 'D' },
            { id: 'c38', code: '4.02', name: 'DESPESAS OPERACIONAIS', tipo: 'D' },
            { id: 'c39', code: '4.02.01.001', name: 'Pró-Labore', tipo: 'D' },
            { id: 'c40', code: '4.02.01.002', name: 'Aluguéis e Taxas', tipo: 'D' },
            { id: 'c41', code: '4.02.01.003', name: 'Energia, Água e Telefone', tipo: 'D' },
            { id: 'c42', code: '4.02.01.004', name: 'Material de Escritório', tipo: 'D' }
        ];

        const salvas = JSON.parse(localStorage.getItem('contas_v3'));
        this.contas = (salvas && salvas.length > 0 ? salvas : contasPadrao).map(c => new ContaContabil(c.id, c.code, c.name, c.tipo));
        this.lancamentos = JSON.parse(localStorage.getItem('lanc_v3')) || [];
    }

    salvarContas() { localStorage.setItem('contas_v3', JSON.stringify(this.contas)); }
    salvarLancamentos() { localStorage.setItem('lanc_v3', JSON.stringify(this.lancamentos)); }

    calcularSaldoConta(id, filtrados) {
        return filtrados.reduce((acc, l) => {
            if (l.d === id) return acc + l.valor;
            if (l.c === id) return acc - l.valor;
            return acc;
        }, 0);
    }
}

const ERP = new GerenciadorContabil();

// --- INICIALIZAÇÃO ---
function init() {
    atualizarSelects();
    document.getElementById('filtro-ini').value = '2026-01-01';
    document.getElementById('filtro-fim').value = '2026-12-31';
    document.getElementById('f-data').valueAsDate = new Date();
    renderizar();
}

function atualizarSelects() {
    // Ordenação numérica correta para códigos (1.01 antes de 1.10)
    const sorted = ERP.contas.sort((a, b) => a.code.localeCompare(b.code, undefined, {numeric: true, sensitivity: 'base'}));
    
    const options = sorted.map(c => `<option value="${c.id}">${c.code} - ${c.name}</option>`).join('');
    
    ['f-conta-d', 'f-conta-c', 'filtro-conta-razao'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = options;
    });

    const lista = document.getElementById('gestao-contas-lista');
    if (lista) {
        lista.innerHTML = sorted.map(c => `
            <div style="display:flex; justify-content:space-between; padding:5px; border-bottom:1px solid #eee; font-size:12px;">
                <span><b>${c.code}</b> - ${c.name}</span>
                <div>
                    <button class="btn-acao" onclick="editarConta('${c.id}')">✏️</button>
                    <button class="btn-acao" onclick="excluirConta('${c.id}')">🗑️</button>
                </div>
            </div>
        `).join('');
    }
}

function buscarPorCodigo(tipo) {
    const cod = document.getElementById(`cod-${tipo}`).value;
    const conta = ERP.contas.find(c => c.code === cod);
    if (conta) document.getElementById(`f-conta-${tipo}`).value = conta.id;
}

function sincronizarCodigo(tipo) {
    const id = document.getElementById(`f-conta-${tipo}`).value;
    const conta = ERP.contas.find(c => c.id === id);
    if (conta) document.getElementById(`cod-${tipo}`).value = conta.code;
}

function cadastrarConta() {
    const n = document.getElementById('nc-nome'), c = document.getElementById('nc-cod'), t = document.getElementById('nc-tipo');
    if (!n.value || !c.value) return alert("Preencha código e nome!");
    ERP.contas.push(new ContaContabil(null, c.value, n.value, t.value));
    ERP.salvarContas();
    n.value = ''; c.value = ''; t.selectedIndex = 0;
    atualizarSelects();
    renderizar();
}

function editarConta(id) {
    const c = ERP.contas.find(x => x.id === id);
    const novo = prompt("Novo nome:", c.name);
    if (novo) { c.name = novo; ERP.salvarContas(); atualizarSelects(); renderizar(); }
}

function excluirConta(id) {
    if (ERP.lancamentos.some(l => l.d === id || l.c === id)) return alert("Conta em uso!");
    if (confirm("Excluir?")) { ERP.contas = ERP.contas.filter(x => x.id !== id); ERP.salvarContas(); atualizarSelects(); renderizar(); }
}

function carregarParaEdicao(index) {
    const l = ERP.lancamentos[index];
    document.getElementById('f-data').value = l.data;
    document.getElementById('f-desc').value = l.desc;
    document.getElementById('f-conta-d').value = l.d;
    document.getElementById('f-conta-c').value = l.c;
    document.getElementById('f-valor').value = (l.valor / 100);
    document.getElementById('f-edit-index').value = index;
    sincronizarCodigo('d'); sincronizarCodigo('c');
    const btn = document.getElementById('btn-salvar-lanc');
    btn.innerHTML = "📝 Atualizar";
    btn.style.background = "var(--secundaria)";
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function salvarLancamento() {
    const data = document.getElementById('f-data').value, desc = document.getElementById('f-desc').value;
    const d = document.getElementById('f-conta-d').value, c = document.getElementById('f-conta-c').value;
    const v = parseFloat(document.getElementById('f-valor').value);
    const editIndex = parseInt(document.getElementById('f-edit-index').value);

    if (!data || !desc || isNaN(v)) return alert("Dados inválidos!");
    const obj = { data, desc, d, c, valor: Math.round(v * 100) };

    if (editIndex > -1) {
        ERP.lancamentos[editIndex] = obj;
        document.getElementById('f-edit-index').value = "-1";
        const btn = document.getElementById('btn-salvar-lanc');
        btn.innerHTML = "💾 Salvar";
        btn.style.background = "var(--sucesso)";
    } else {
        ERP.lancamentos.push(obj);
    }

    ERP.salvarLancamentos();
    document.getElementById('f-desc').value = ''; document.getElementById('f-valor').value = '';
    document.getElementById('cod-d').value = ''; document.getElementById('cod-c').value = '';
    renderizar();
}

function excluirLancamento(index) {
    if (confirm("Excluir?")) { ERP.lancamentos.splice(index, 1); ERP.salvarLancamentos(); renderizar(); }
}

function setAba(aba) {
    ERP.abaAtual = aba;
    document.querySelectorAll('.btn-tab').forEach(b => b.classList.toggle('active', b.id === 't-' + aba));
    document.getElementById('filtro-conta-razao').style.display = (aba === 'razao' ? 'inline-block' : 'none');
    renderizar();
}

const fmt = v => (v / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function renderizar() {
    const ini = document.getElementById('filtro-ini').value, fim = document.getElementById('filtro-fim').value;
    const filtrados = ERP.lancamentos.filter(l => l.data >= ini && l.data <= fim);
    const container = document.getElementById('tabela-render');
    let html = `<table>`;

    if (ERP.abaAtual === 'diario') {
        html += `<thead><tr><th>Data</th><th>Histórico (D/C)</th><th class="valor">Débito</th><th class="valor">Crédito</th><th>Ações</th></tr></thead><tbody>`;
        filtrados.forEach((l, i) => {
            const cD = ERP.contas.find(x => x.id === l.d)?.name, cC = ERP.contas.find(x => x.id === l.c)?.name;
            html += `<tr><td>${l.data}</td><td><b>${cD}</b><br><i>a ${cC}</i><br><small>${l.desc}</small></td><td class="valor">${fmt(l.valor)}</td><td class="valor">${fmt(l.valor)}</td>
            <td><button class="btn-acao" onclick="carregarParaEdicao(${i})">✏️</button><button class="btn-acao" style="color:red" onclick="excluirLancamento(${i})">🗑️</button></td></tr>`;
        });
    } 
    else if (ERP.abaAtual === 'dre') {
        const receitas = ERP.contas.filter(c => c.tipo === 'R');
        const despesas = ERP.contas.filter(c => c.tipo === 'D');
        let totalR = 0, totalD = 0;
        html += `<thead><tr><th>DRE - Estrutura da Associação</th><th class="valor">Valor</th></tr></thead><tbody>`;
        html += `<tr style="background:#f0f7ff"><td><b>(+) RECEITAS</b></td><td></td></tr>`;
        receitas.forEach(c => {
            let s = Math.abs(ERP.calcularSaldoConta(c.id, filtrados)); totalR += s;
            if (s !== 0) html += `<tr><td>&nbsp;&nbsp;${c.name}</td><td class="valor">${fmt(s)}</td></tr>`;
        });
        html += `<tr style="background:#fff0f0"><td><b>(-) DESPESAS E CUSTOS</b></td><td></td></tr>`;
        despesas.forEach(c => {
            let s = Math.abs(ERP.calcularSaldoConta(c.id, filtrados)); totalD += s;
            if (s !== 0) html += `<tr><td>&nbsp;&nbsp;${c.name}</td><td class="valor">(${fmt(s)})</td></tr>`;
        });
        const res = totalR - totalD;
        html += `<tr style="background:#eee; font-weight:bold;"><td>RESULTADO LÍQUIDO</td><td class="valor" style="color:${res >= 0 ? 'green' : 'red'}">${fmt(res)}</td></tr>`;
    }
    else if (ERP.abaAtual === 'balancete') {
        html += `<thead><tr><th>Código</th><th>Conta</th><th class="valor">Saldo</th></tr></thead><tbody>`;
        ERP.contas.forEach(c => {
            let s = ERP.calcularSaldoConta(c.id, filtrados);
            if (s !== 0) html += `<tr><td>${c.code}</td><td>${c.name}</td><td class="valor">${fmt(c.natureza === 'CREDORA' ? s * -1 : s)}</td></tr>`;
        });
    }
    else if (ERP.abaAtual === 'razao') {
        const cid = document.getElementById('filtro-conta-razao').value;
        html += `<thead><tr><th>Data</th><th>Histórico</th><th class="valor">Débito</th><th class="valor">Crédito</th></tr></thead><tbody>`;
        filtrados.filter(l => l.d === cid || l.c === cid).forEach(l => {
            html += `<tr><td>${l.data}</td><td>${l.desc}</td><td class="valor">${l.d === cid ? fmt(l.valor) : ''}</td><td class="valor">${l.c === cid ? fmt(l.valor) : ''}</td></tr>`;
        });
    }
    else if (ERP.abaAtual === 'balanco') {
        html += `<thead><tr><th>ATIVO</th><th>PASSIVO + PL</th></tr></thead><tbody>`;
        const ativos = ERP.contas.filter(c => c.tipo === 'A');
        const ppl = ERP.contas.filter(c => ['P', 'PL'].includes(c.tipo));
        for (let i = 0; i < Math.max(ativos.length, ppl.length); i++) {
            let sA = ativos[i] ? ERP.calcularSaldoConta(ativos[i].id, filtrados) : null;
            let sP = ppl[i] ? ERP.calcularSaldoConta(ppl[i].id, filtrados) : null;
            html += `<tr><td>${ativos[i] ? ativos[i].name + ': ' + fmt(sA) : ''}</td><td>${ppl[i] ? ppl[i].name + ': ' + fmt(Math.abs(sP)) : ''}</td></tr>`;
        }
    }
    container.innerHTML = html + `</tbody></table>`;
}

function exportarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("RELATÓRIO: " + ERP.abaAtual.toUpperCase(), 14, 15);
    doc.autoTable({ html: 'table', startY: 25 });
    doc.save(`relatorio_${ERP.abaAtual}.pdf`);
}

function UI_executarFechamento() { alert("Fechamento anual em desenvolvimento."); }

window.onload = init;  