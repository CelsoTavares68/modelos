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

    // Carrega saldos manuais por mês (mapa month -> number). Chave especial 'initial' para quando não há filtro.
    const manualSaldos = getManualSaldos();

    // Gera lista de meses existentes (e inclui o mês filtrado para que possamos calcular mesmo sem lançamentos)
    const mesesUnicos = getUniqueMonthsIncluding(filtroMes);

    // Calcula saldos por mês (previousSaldo e periodSaldo)
    const saldosPorMes = computeSaldosPorMes(mesesUnicos, manualSaldos);

      // Determina o saldo anterior a exibir no input
    let saldoAnterior;
    if (filtroMes) {
        if (saldosPorMes[filtroMes]) saldoAnterior = saldosPorMes[filtroMes].previousSaldo;
        else {
            // se filtroMes não estiver no mapa (ex.: sem lançamentos), pegamos o último carry (ou 0)
            const sorted = Object.keys(saldosPorMes).sort();
            saldoAnterior = sorted.length ? saldosPorMes[sorted[sorted.length - 1]].periodSaldo : (manualSaldos['initial'] || 0);
        }
    } else {
        // Sem filtro, usamos o saldo manual 'initial' se existir, senão zero
        saldoAnterior = manualSaldos['initial'] !== undefined ? manualSaldos['initial'] : 0;
    }

    // Atualiza campo saldo anterior (mostra sempre formatado). Mantemos comportamento de "travamento" via Enter:
    const inputManual = document.getElementById('saldo-anterior-manual');
    inputManual.value = formatCurrency(saldoAnterior);
    // Mantemos desabilitado para evitar edição acidental — clique no card reativa para editar (reutilizamos função reativarInput)
    inputManual.disabled = true;

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
            <td class="${classeCor}">${formatCurrency(conta.valor)}</td>
            <td>${conta.tipo === 'receber' ? 'Entrada' : 'Saída'}</td>
            <td class="no-print">
                <button onclick="prepararEdicao(${conta.id})">✏️</button>
                <button onclick="excluirConta(${conta.id})">🗑️</button>
            </td>
        `;
        corpoTabela.appendChild(linha);
        if (conta.tipo === 'receber') receber += conta.valor; else pagar += conta.valor;
    });

    document.getElementById('total-receber').innerText = formatCurrency(receber);
    document.getElementById('total-pagar').innerText = formatCurrency(pagar);
    document.getElementById('saldo-total').innerText = formatCurrency((saldoAnterior || 0) + receber - pagar);
}

// FUNÇÕES DO SALDO ANTERIOR (ENTER E TRAVA)
function verificarEnter(event) {
    if (event.key === "Enter") {
        const input = document.getElementById('saldo-anterior-manual');
        // Identifica o mês atual do filtro; se não houver, utilizamos a chave 'initial'
        const filtroMes = document.getElementById('filtro_mes').value || 'initial';
        let valor = parseCurrencyToNumber(input.value) || 0;
        // armazena o saldo manual para o mês selecionado e formata o campo
        setManualSaldoForMonth(filtroMes, valor);
        input.value = formatCurrency(valor);
        input.blur();
        input.disabled = true;
        atualizarInterface();
    }
}

function reativarInput() {
    const input = document.getElementById('saldo-anterior-manual');
    if (input.disabled) {
        // Ao reativar, preenche com valor numérico sem formatação para editar
        const filtroMes = document.getElementById('filtro_mes').value || 'initial';
        const manualSaldos = getManualSaldos();
        let valorAtual = manualSaldos[filtroMes] !== undefined ? manualSaldos[filtroMes] : (
            // se não houver manual, tenta pegar o cálculo automático daquele mês
            (() => {
                const mesesUnicos = getUniqueMonthsIncluding(filtroMes === 'initial' ? '' : filtroMes);
                const saldos = computeSaldosPorMes(mesesUnicos, manualSaldos);
                if (filtroMes !== 'initial' && saldos[filtroMes]) return saldos[filtroMes].previousSaldo;
                return manualSaldos['initial'] || 0;
            })()
        );
        // exibe valor sem formatação para facilitar edição (com ponto decimal)
        input.value = valorAtual.toString().replace('.', ',');
        input.disabled = false;
        input.focus();
        // Nota: não removemos o saldo manual salvo até que o usuário sobrescreva e pressione Enter
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

// Nova versão: abre uma janela com apenas os saldos (do topo para baixo) + lista e chama print()
// Sem cabeçalho, como você pediu.
function imprimirRelatorio() {
    const filtroMes = document.getElementById('filtro_mes').value;
    const contasFiltradas = filtroMes ? contas.filter(c => c.mes === filtroMes) : contas.slice().sort((a, b) => a.mes.localeCompare(b.mes));

    // Calcula saldos para o filtro atual
    const manualSaldos = getManualSaldos();
    const mesesUnicos = getUniqueMonthsIncluding(filtroMes);
    const saldosPorMes = computeSaldosPorMes(mesesUnicos, manualSaldos);
    let saldoAnterior = 0;
    if (filtroMes) {
        if (saldosPorMes[filtroMes]) saldoAnterior = saldosPorMes[filtroMes].previousSaldo;
        else {
            const sorted = Object.keys(saldosPorMes).sort();
            saldoAnterior = sorted.length ? saldosPorMes[sorted[sorted.length - 1]].periodSaldo : (manualSaldos['initial'] || 0);
        }
    } else {
        saldoAnterior = manualSaldos['initial'] !== undefined ? manualSaldos['initial'] : 0;
    }
    const receber = contasFiltradas.filter(c => c.tipo === 'receber').reduce((s, c) => s + Number(c.valor || 0), 0);
    const pagar = contasFiltradas.filter(c => c.tipo === 'pagar').reduce((s, c) => s + Number(c.valor || 0), 0);
    const saldoPeriodo = (saldoAnterior || 0) + receber - pagar;

      // Estilos mínimos inline para a página de impressão
    const styles = `
    <style>
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #222; padding: 20px; }
      .resumo { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:14px; }
      .card { flex:1; min-width:150px; padding:10px; border-radius:6px; color:white; text-align:center; }
      .card small { display:block; font-size:12px; color:rgba(255,255,255,0.9); margin-bottom:6px; }
      .card-1 { background:#7f8c8d } .card-2 { background:#2ecc71 } .card-3 { background:#e74c3c } .card-4 { background:#34495e }
      table { width:100%; border-collapse:collapse; font-size:12px; margin-top:6px; }
      th, td { padding:8px; border-bottom:1px solid #eee; text-align:left; }
      td.valor { text-align:right; }
      .muted { color:#666; font-size:11px; margin-top:10px; }
      @media print { body { padding:10px } .no-print { display:none } }
    </style>`;

     // Monta HTML dos cards (apenas saldos)
    const resumoHtml = `
      <div class="resumo">
        <div class="card card-1"><small>Saldo Anterior</small><div style="font-weight:bold">${formatCurrency(saldoAnterior)}</div></div>
        <div class="card card-2"><small>Total a Receber</small><div style="font-weight:bold">${formatCurrency(receber)}</div></div>
        <div class="card card-3"><small>Total a Pagar</small><div style="font-weight:bold">${formatCurrency(pagar)}</div></div>
        <div class="card card-4"><small>Saldo do Período</small><div style="font-weight:bold">${formatCurrency(saldoPeriodo)}</div></div>
      </div>`;

    // Monta tabela (sem cabeçalho extra)
    let rowsHtml = '';
    contasFiltradas.forEach(conta => {
        rowsHtml += `<tr>
            <td>${formatarMes(conta.mes)}</td>
            <td>${conta.descricao}</td>
            <td>${conta.documento || '-'}</td>
            <td class="valor">${formatCurrency(conta.valor)}</td>
            <td>${conta.tipo === 'receber' ? 'Entrada' : 'Saída'}</td>
        </tr>`;
    });

    const tableHtml = `
      <table>
        <thead>
          <tr>
            <th>Mês/Ref</th>
            <th>Descrição</th>
            <th>Doc/NF</th>
            <th style="text-align:right">Valor</th>
            <th>Tipo</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>`;

    const footer = `<div class="muted">Relatório gerado em: ${new Date().toLocaleString('pt-BR')}</div>`;

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Relatório</title>${styles}</head><body>${resumoHtml}${tableHtml}${footer}</body></html>`;

        // Abre nova janela e imprime (usuário pode escolher "Salvar como PDF")
    const win = window.open('', '_blank');
    if (!win) {
        alert('Não foi possível abrir a janela de impressão. Verifique bloqueadores de pop-up e tente novamente.');
        return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();

    // Dá tempo para o navegador renderizar antes de chamar print()
    const tryPrint = () => {
        try {
            win.focus();
            win.print();
            // fecha a janela automaticamente após impressão (não garante em todos os navegadores)
            setTimeout(() => { try { win.close(); } catch(e) {} }, 700);
        } catch (e) {
            console.error('Erro ao imprimir:', e);
        }
    };
    // aguarda um pequeno intervalo
    setTimeout(tryPrint, 500);
}

function loadScript(src, timeout = 10000) {
    return new Promise((resolve, reject) => {
        // já carregado?
        if (document.querySelector(`script[src="${src}"]`)) {
            // espera um ciclo para garantir o carregamento
            return resolve();
        }
        const s = document.createElement('script');
        s.src = src;
        s.async = true;
        let finished = false;
        const timer = setTimeout(() => {
            if (!finished) {
                finished = true;
                reject(new Error('Timeout ao carregar script ' + src));
            }
        }, timeout);
        s.onload = () => {
            if (!finished) {
                finished = true;
                clearTimeout(timer);
                resolve();
            }
        };
         s.onerror = (err) => {
            if (!finished) {
                finished = true;
                clearTimeout(timer);
                reject(err || new Error('Erro ao carregar script ' + src));
            }
        };
        document.head.appendChild(s);
    });
}

/* ----------------- Funções utilitárias para moeda e gestão de saldos por mês ----------------- */

function formatCurrency(valor) {
    // Usa Intl para formato brasileiro com R$
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor) || 0);
}

function parseCurrencyToNumber(str) {
    if (str === null || str === undefined) return 0;
    // Remove R$, espaços; remove pontos (milhares); substitui vírgula por ponto
    const cleaned = String(str).replace(/\s/g, '').replace('R$', '').replace(/\./g, '').replace(',', '.');
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
}

function getManualSaldos() {
    try {
        return JSON.parse(localStorage.getItem('saldos_anteriores_por_mes')) || {};
    } catch (e) {
        return {};
    }
}

function setManualSaldoForMonth(monthKey, value) {
    const map = getManualSaldos();
    map[monthKey] = Number(value) || 0;
    localStorage.setItem('saldos_anteriores_por_mes', JSON.stringify(map));
}

function removeManualSaldoForMonth(monthKey) {
    const map = getManualSaldos();
    if (map[monthKey] !== undefined) {
        delete map[monthKey];
        localStorage.setItem('saldos_anteriores_por_mes', JSON.stringify(map));
    }
}

function getUniqueMonthsIncluding(mesExtra) {
    const set = new Set(contas.map(c => c.mes).filter(Boolean));
    if (mesExtra) set.add(mesExtra);
    // transforma em array e ordena (YYYY-MM lexicograficamente ordena corretamente)
    const arr = Array.from(set);
    arr.sort();
    return arr;
}

 function computeSaldosPorMes(mesesArray, manualSaldos) {
    // Retorna um objeto { '2026-01': { previousSaldo: X, periodSaldo: Y }, ... }
    const result = {};
    // carry representa o saldo que "vem de antes" (inicia com manual 'initial' ou 0)
    let carry = manualSaldos['initial'] !== undefined ? Number(manualSaldos['initial']) : 0;

    for (const mes of mesesArray) {
        // se houver manual para este mês, ele define o previousSaldo; caso contrário usamos o carry
        const previousSaldo = manualSaldos[mes] !== undefined ? Number(manualSaldos[mes]) : carry;

        // soma entradas/saídas para esse mês
        const receber = contas.filter(c => c.mes === mes && c.tipo === 'receber').reduce((s, c) => s + Number(c.valor || 0), 0);
        const pagar = contas.filter(c => c.mes === mes && c.tipo === 'pagar').reduce((s, c) => s + Number(c.valor || 0), 0);

        const periodSaldo = previousSaldo + receber - pagar;
        result[mes] = { previousSaldo, periodSaldo };
        // próximo carry é esse periodSaldo
        carry = periodSaldo;
    }

    return result;
}