 class ContaContabil {
    constructor(id, code, name, tipo) {
        this.id = id || Date.now().toString() + Math.random().toString(36).substr(2, 5);
        this.code = code;
        this.name = name;
        this.tipo = tipo;
    }
    get natureza() {
        return ['A', 'D'].includes(this.tipo) ? 'DEVEDORA' : 'CREDORA';
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
        const contasPadrao = [
            { id: '101', code: '1.01.01.001', name: 'Caixa Geral', tipo: 'A' },
            { id: '102', code: '1.01.01.002', name: 'Banco Conta Movimento', tipo: 'A' },
            { id: '201', code: '2.01.01.001', name: 'Fornecedores Nacionais', tipo: 'P' },
            { id: '5',   code: '2.03.01.001', name: 'Capital Social', tipo: 'PL' },
            { id: '401', code: '3.01.01.001', name: 'Venda de Mercadorias', tipo: 'R' },
            { id: '501', code: '4.01.01.001', name: 'Custo das Mercadorias Vendidas', tipo: 'D' }
        ];
        const salvas = JSON.parse(localStorage.getItem('contas_v3'));
        this.contas = (salvas && salvas.length > 0 ? salvas : contasPadrao).map(c => new ContaContabil(c.id, c.code, c.name, c.tipo));
        this.lancamentos = JSON.parse(localStorage.getItem('lanc_v3')) || [];
    }

    salvarContas() { localStorage.setItem('contas_v3', JSON.stringify(this.contas)); }
    salvarLancamentos() { localStorage.setItem('lanc_v3', JSON.stringify(this.lancamentos)); }

    calcularSaldo(id, filtrados) {
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
    const sorted = ERP.contas.sort((a, b) => a.code.localeCompare(b.code));
    const options = sorted.map(c => `<option value="${c.id}">${c.code} - ${c.name}</option>`).join('');
    ['f-conta-d', 'f-conta-c', 'filtro-conta-razao'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = options;
    });

    const lista = document.getElementById('gestao-contas-lista');
    if (lista) {
        lista.innerHTML = sorted.map(c => `
            <div style="display:flex; justify-content:space-between; padding:5px; border-bottom:1px solid #eee; font-size:12px;">
                <span>${c.code} - ${c.name}</span>
                <div>
                    <button class="btn-acao" onclick="editarConta('${c.id}')">✏️</button>
                    <button class="btn-acao" onclick="excluirConta('${c.id}')">🗑️</button>
                </div>
            </div>
        `).join('');
    }
}

// --- BUSCA POR CÓDIGO ---
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

// --- CRUD CONTAS ---
function cadastrarConta() {
    const n = document.getElementById('nc-nome'), c = document.getElementById('nc-cod'), t = document.getElementById('nc-tipo');
    if (!n.value || !c.value) return alert("Preencha os campos!");
    ERP.contas.push(new ContaContabil(null, c.value, n.value, t.value));
    ERP.salvarContas();
    n.value = ''; c.value = ''; t.selectedIndex = 0; // LIMPEZA
    atualizarSelects();
    renderizar();
}

function editarConta(id) {
    const c = ERP.contas.find(x => x.id === id);
    const novo = prompt("Novo nome da conta:", c.name);
    if (novo) { c.name = novo; ERP.salvarContas(); atualizarSelects(); renderizar(); }
}

function excluirConta(id) {
    if (ERP.lancamentos.some(l => l.d === id || l.c === id)) return alert("Conta possui lançamentos!");
    if (confirm("Excluir conta?")) { ERP.contas = ERP.contas.filter(x => x.id !== id); ERP.salvarContas(); atualizarSelects(); renderizar(); }
}

// --- CRUD LANÇAMENTOS ---
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
    const data = document.getElementById('f-data').value;
    const desc = document.getElementById('f-desc').value;
    const d = document.getElementById('f-conta-d').value;
    const c = document.getElementById('f-conta-c').value;
    const v = parseFloat(document.getElementById('f-valor').value);
    const editIndex = parseInt(document.getElementById('f-edit-index').value);

    if (!data || !desc || isNaN(v)) return alert("Preencha todos os campos corretamente!");

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
    
    // --- LIMPEZA TOTAL DOS CAMPOS ---
    document.getElementById('f-desc').value = ''; 
    document.getElementById('f-valor').value = '';
    document.getElementById('cod-d').value = '';
    document.getElementById('cod-c').value = '';
    // Reseta os selects para a primeira opção (opcional)
    document.getElementById('f-conta-d').selectedIndex = 0;
    document.getElementById('f-conta-c').selectedIndex = 0;
    
    renderizar();
}

function excluirLancamento(index) {
    if (confirm("Excluir lançamento?")) { ERP.lancamentos.splice(index, 1); ERP.salvarLancamentos(); renderizar(); }
}

function setAba(aba) {
    ERP.abaAtual = aba;
    document.querySelectorAll('.btn-tab').forEach(b => b.classList.toggle('active', b.id === 't-' + aba));
    document.getElementById('filtro-conta-razao').style.display = (aba === 'razao' ? 'inline-block' : 'none');
    renderizar();
}

// --- RENDERIZAÇÃO ---
const fmt = v => (v / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function renderizar() {
    const ini = document.getElementById('filtro-ini').value, fim = document.getElementById('filtro-fim').value;
    const filtrados = ERP.lancamentos.filter(l => l.data >= ini && l.data <= fim);
    const container = document.getElementById('tabela-render');
    let html = `<table>`;

    if (ERP.abaAtual === 'diario') {
        html += `<thead><tr><th>Data</th><th>Histórico</th><th class="valor">Débito</th><th class="valor">Crédito</th><th>Ações</th></tr></thead><tbody>`;
        filtrados.forEach((l, i) => {
            const cD = ERP.contas.find(x => x.id === l.d)?.name || '?', cC = ERP.contas.find(x => x.id === l.c)?.name || '?';
            html += `<tr><td>${l.data}</td><td><b>${cD}</b><br><i>a ${cC}</i><br><small>${l.desc}</small></td><td class="valor">${fmt(l.valor)}</td><td class="valor">${fmt(l.valor)}</td>
            <td><button class="btn-acao" onclick="carregarParaEdicao(${i})">✏️</button><button class="btn-acao" style="color:red" onclick="excluirLancamento(${i})">🗑️</button></td></tr>`;
        });
    } 
    else if (ERP.abaAtual === 'dre') {
        const receitas = ERP.contas.filter(c => c.tipo === 'R');
        const despesas = ERP.contas.filter(c => c.tipo === 'D');
        let totalR = 0, totalD = 0;

        html += `<thead><tr><th>DRE - Demonstração do Resultado</th><th class="valor">Valor</th></tr></thead><tbody>`;
        html += `<tr style="background:#f0f7ff"><td><b>(+) RECEITAS OPERACIONAIS</b></td><td class="valor"></td></tr>`;
        receitas.forEach(c => {
            let s = Math.abs(ERP.calcularSaldo(c.id, filtrados));
            totalR += s;
            if(s !== 0) html += `<tr><td>&nbsp;&nbsp;${c.name}</td><td class="valor">${fmt(s)}</td></tr>`;
        });
        html += `<tr style="background:#fff0f0"><td><b>(-) DESPESAS OPERACIONAIS</b></td><td class="valor"></td></tr>`;
        despesas.forEach(c => {
            let s = Math.abs(ERP.calcularSaldo(c.id, filtrados));
            totalD += s;
            if(s !== 0) html += `<tr><td>&nbsp;&nbsp;${c.name}</td><td class="valor">(${fmt(s)})</td></tr>`;
        });
        const res = totalR - totalD;
        html += `<tr style="background:#eee; font-weight:bold;"><td>RESULTADO LÍQUIDO</td><td class="valor" style="color:${res >= 0 ? 'green' : 'red'}">${fmt(res)}</td></tr>`;
    }
    else if (ERP.abaAtual === 'balancete') {
        html += `<thead><tr><th>Código</th><th>Conta</th><th class="valor">Saldo</th></tr></thead><tbody>`;
        ERP.contas.forEach(c => {
            let s = ERP.calcularSaldo(c.id, filtrados);
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
            let sA = ativos[i] ? ERP.calcularSaldo(ativos[i].id, filtrados) : null;
            let sP = ppl[i] ? ERP.calcularSaldo(ppl[i].id, filtrados) : null;
            html += `<tr><td>${ativos[i] ? ativos[i].name + ': ' + fmt(sA) : ''}</td><td>${ppl[i] ? ppl[i].name + ': ' + fmt(Math.abs(sP)) : ''}</td></tr>`;
        }
    }

    container.innerHTML = html + `</tbody></table>`;
}

function exportarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("RELATÓRIO CONTÁBIL: " + ERP.abaAtual.toUpperCase(), 14, 15);
    doc.autoTable({ html: 'table', startY: 25 });
    doc.save(`relatorio_${ERP.abaAtual}.pdf`);
}

function UI_executarFechamento() {
    alert("Função em desenvolvimento. Requer conta de 'Lucros/Prejuízos' configurada.");
}

window.onload = init;