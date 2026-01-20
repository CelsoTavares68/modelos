 // Banco de Dados e Inicialização
    let contas = JSON.parse(localStorage.getItem('contas_v3')) || [
        { id: '1', code: '1.01', name: 'Caixa', tipo: 'A' },
        { id: '2', code: '1.02', name: 'Banco', tipo: 'A' },
        { id: '3', code: '2.01', name: 'Fornecedores', tipo: 'P' },
        { id: '4', code: '3.01', name: 'Receita de Vendas', tipo: 'R' },
        { id: '5', code: '2.03', name: 'Capital Social', tipo: 'PL' }
    ];

    let lancamentos = JSON.parse(localStorage.getItem('lanc_v3')) || [];
    let abaAtual = 'diario';

    function init() {
        atualizarSelects();
        document.getElementById('filtro-ini').value = '2026-01-01';
        document.getElementById('filtro-fim').value = '2026-12-31';
        document.getElementById('f-data').valueAsDate = new Date();
        renderizar();
    }

    // --- FUNÇÕES DE LÓGICA DE CONTA ---
    function atualizarSelects() {
        const selects = ['f-conta-d', 'f-conta-c', 'filtro-conta-razao'];
        const options = contas.sort((a,b) => a.code.localeCompare(b.code))
                              .map(c => `<option value="${c.id}">${c.code} - ${c.name}</option>`).join('');
        selects.forEach(id => document.getElementById(id).innerHTML = options);
    }

    function buscarPorCodigo(tipo) {
        const cod = document.getElementById(`cod-${tipo}`).value;
        const conta = contas.find(c => c.code === cod);
        if(conta) document.getElementById(`f-conta-${tipo}`).value = conta.id;
    }

    function sincronizarCodigo(tipo) {
        const id = document.getElementById(`f-conta-${tipo}`).value;
        const conta = contas.find(c => c.id === id);
        if(conta) document.getElementById(`cod-${tipo}`).value = conta.code;
    }

    function cadastrarConta() {
        const nome = document.getElementById('nc-nome').value;
        const cod = document.getElementById('nc-cod').value;
        const tipo = document.getElementById('nc-tipo').value;
        if(!nome || !cod) return alert("Preencha o nome e código.");
        contas.push({ id: Date.now().toString(), code: cod, name: nome, tipo: tipo });
        localStorage.setItem('contas_v3', JSON.stringify(contas));
        atualizarSelects();
        alert("Conta criada!");
    }

    // --- LANÇAMENTOS ---
    function salvarLancamento() {
        const data = document.getElementById('f-data').value;
        const desc = document.getElementById('f-desc').value;
        const d = document.getElementById('f-conta-d').value;
        const c = document.getElementById('f-conta-c').value;
        const valor = parseFloat(document.getElementById('f-valor').value);

        if(!data || !desc || isNaN(valor)) return alert("Dados incompletos!");

        lancamentos.push({ data, desc, d, c, valor: Math.round(valor * 100) });
        localStorage.setItem('lanc_v3', JSON.stringify(lancamentos));
        
        document.getElementById('f-desc').value = '';
        document.getElementById('f-valor').value = '';
        renderizar();
    }

    // --- RENDERIZAÇÃO ---
    function setAba(aba) {
        abaAtual = aba;
        document.querySelectorAll('.btn-tab').forEach(b => b.classList.remove('active'));
        document.getElementById('t-' + aba).classList.add('active');
        document.getElementById('filtro-conta-razao').style.display = (aba === 'razao' ? 'inline' : 'none');
        renderizar();
    }

    const fmt = v => (v/100).toLocaleString('pt-BR', {style:'currency', currency:'BRL'});

    function renderizar() {
        const ini = document.getElementById('filtro-ini').value;
        const fim = document.getElementById('filtro-fim').value;
        const filtrados = lancamentos.filter(l => l.data >= ini && l.data <= fim);
        const container = document.getElementById('tabela-render');
        
        let html = `<table>`;

        if(abaAtual === 'diario') {
            html += `<thead><tr><th>Data</th><th>Histórico / Contas</th><th class="valor">Débito</th><th class="valor">Crédito</th></tr></thead><tbody>`;
            filtrados.forEach(l => {
                const cD = contas.find(x => x.id === l.d).name;
                const cC = contas.find(x => x.id === l.c).name;
                html += `<tr><td>${l.data}</td><td><b>${cD}</b><br><i>&nbsp;&nbsp;a ${cC}</i><br><small>${l.desc}</small></td><td class="valor">${fmt(l.valor)}</td><td class="valor">${fmt(l.valor)}</td></tr>`;
            });
        }
        else if(abaAtual === 'balancete') {
            html += `<thead><tr><th>Código</th><th>Conta</th><th class="valor">Saldo</th></tr></thead><tbody>`;
            contas.forEach(c => {
                let saldo = filtrados.reduce((acc, l) => acc + (l.d === c.id ? l.valor : (l.c === c.id ? -l.valor : 0)), 0);
                if(saldo !== 0) html += `<tr><td>${c.code}</td><td>${c.name}</td><td class="valor">${fmt(saldo)}</td></tr>`;
            });
        }
        else if(abaAtual === 'balanco') {
            html += `<thead><tr><th>ATIVO</th><th>PASSIVO + PL</th></tr></thead><tbody>`;
            const ativos = contas.filter(c => c.tipo === 'A');
            const ppl = contas.filter(c => c.tipo === 'P' || c.tipo === 'PL');
            for(let i=0; i < Math.max(ativos.length, ppl.length); i++) {
                let sA = ativos[i] ? filtrados.reduce((acc, l) => acc + (l.d === ativos[i].id ? l.valor : (l.c === ativos[i].id ? -l.valor : 0)), 0) : null;
                let sP = ppl[i] ? filtrados.reduce((acc, l) => acc + (l.d === ppl[i].id ? l.valor : (l.c === ppl[i].id ? -l.valor : 0)), 0) : null;
                html += `<tr>
                    <td>${ativos[i] ? ativos[i].name + ': ' + fmt(sA) : ''}</td>
                    <td>${ppl[i] ? ppl[i].name + ': ' + fmt(Math.abs(sP)) : ''}</td>
                </tr>`;
            }
        }
        else if(abaAtual === 'razao') {
            const cid = document.getElementById('filtro-conta-razao').value;
            html += `<thead><tr><th>Data</th><th>Histórico</th><th class="valor">Débito</th><th class="valor">Crédito</th></tr></thead><tbody>`;
            filtrados.filter(l => l.d === cid || l.c === cid).forEach(l => {
                html += `<tr><td>${l.data}</td><td>${l.desc}</td><td class="valor">${l.d === cid ? fmt(l.valor) : ''}</td><td class="valor">${l.c === cid ? fmt(l.valor) : ''}</td></tr>`;
            });
        }

        container.innerHTML = html + `</tbody></table>`;
    }

    function exportarPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.text("RELATÓRIO CONTÁBIL: " + abaAtual.toUpperCase(), 14, 15);
        doc.autoTable({ html: 'table', startY: 25 });
        doc.save(`relatorio_${abaAtual}.pdf`);
    }

    init();