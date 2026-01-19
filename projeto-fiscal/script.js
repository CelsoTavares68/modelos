let contas = JSON.parse(localStorage.getItem('contas_comercio')) || [];
let idEmEdicao = null;

atualizarInterface();

function adicionarConta() {
    const descricao = document.getElementById('descricao').value;
    const valor = parseFloat(document.getElementById('valor').value);
    const documento = document.getElementById('documento').value;
    const mes = document.getElementById('mes_referencia').value;
    const tipo = document.getElementById('tipo').value;

    if (!descricao || isNaN(valor) || !mes) {
        alert("Preencha os campos obrigatórios!");
        return;
    }

    if (idEmEdicao !== null) {
        const index = contas.findIndex(c => c.id === idEmEdicao);
        contas[index] = { ...contas[index], descricao, valor, documento, mes, tipo };
        idEmEdicao = null;
        document.getElementById('btn-adicionar').innerText = "Adicionar Lançamento";
    } else {
        contas.push({ id: Date.now(), descricao, valor, documento, mes, tipo });
    }

    salvarESincronizar();
    limparFormulario();
}

function salvarESincronizar() {
    localStorage.setItem('contas_comercio', JSON.stringify(contas));
    atualizarInterface();
}

function atualizarInterface() {
    const corpoTabela = document.getElementById('lista-corpo');
    const filtroMes = document.getElementById('filtro_mes').value;
    
    // Lógica para pegar o valor do Saldo Anterior limpando o "R$"
    const inputManual = document.getElementById('saldo-anterior-manual');
    let valorLimpo = inputManual.value.replace('R$', '').replace(/\s/g, '').replace(',', '.');
    const saldoAnterior = parseFloat(valorLimpo) || 0;

    corpoTabela.innerHTML = '';
    let receber = 0, pagar = 0;

    const contasFiltradas = filtroMes ? contas.filter(c => c.mes === filtroMes) : contas;
    contasFiltradas.sort((a, b) => a.mes.localeCompare(b.mes));

    contasFiltradas.forEach(conta => {
        const linha = document.createElement('tr');
        const classeCor = conta.tipo === 'receber' ? 'cor-receber' : 'cor-pagar';
        linha.innerHTML = `
            <td>${formatarMes(conta.mes)}</td>
            <td>${conta.descricao}</td>
            <td>${conta.documento || '-'}</td>
            <td class="${classeCor}">R$ ${conta.valor.toFixed(2)}</td>
            <td>${conta.tipo === 'receber' ? 'Entrada' : 'Saída'}</td>
            <td class="no-print">
                <button onclick="prepararEdicao(${conta.id})">✏️</button>
                <button onclick="excluirConta(${conta.id})">🗑️</button>
            </td>
        `;
        corpoTabela.appendChild(linha);
        if (conta.tipo === 'receber') receber += conta.valor; else pagar += conta.valor;
    });

    document.getElementById('total-receber').innerText = `R$ ${receber.toFixed(2)}`;
    document.getElementById('total-pagar').innerText = `R$ ${pagar.toFixed(2)}`;
    document.getElementById('saldo-total').innerText = `R$ ${(saldoAnterior + receber - pagar).toFixed(2)}`;
}

// FUNÇÕES DO SALDO ANTERIOR (ENTER E TRAVA)
function verificarEnter(event) {
    if (event.key === "Enter") {
        const input = document.getElementById('saldo-anterior-manual');
        let valor = parseFloat(input.value.replace(',', '.')) || 0;
        input.value = `R$ ${valor.toFixed(2).replace('.', ',')}`;
        input.blur();
        input.disabled = true;
        atualizarInterface();
    }
}

function reativarInput() {
    const input = document.getElementById('saldo-anterior-manual');
    if (input.disabled) {
        input.disabled = false;
        let valorAtual = input.value.replace('R$', '').replace(/\s/g, '').replace(',', '.');
        input.value = valorAtual;
        input.focus();
    }
}

function limparFiltro() {
    document.getElementById('filtro_mes').value = '';
    atualizarInterface();
}

function formatarMes(mesAno) {
    if (!mesAno) return "";
    const [ano, mes] = mesAno.split('-');
    return `${mes}/${ano}`;
}

function excluirConta(id) {
    if (confirm("Deseja excluir?")) {
        contas = contas.filter(c => c.id !== id);
        salvarESincronizar();
    }
}

function prepararEdicao(id) {
    const conta = contas.find(c => c.id === id);
    document.getElementById('descricao').value = conta.descricao;
    document.getElementById('valor').value = conta.valor;
    document.getElementById('documento').value = conta.documento;
    document.getElementById('mes_referencia').value = conta.mes;
    document.getElementById('tipo').value = conta.tipo;
    idEmEdicao = id;
    document.getElementById('btn-adicionar').innerText = "Salvar Alterações";
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function limparFormulario() {
    document.getElementById('descricao').value = '';
    document.getElementById('valor').value = '';
    document.getElementById('documento').value = '';
}

function imprimirRelatorio() { window.print(); }