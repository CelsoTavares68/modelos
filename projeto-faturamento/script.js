// CHAVE ÚNICA DE PERSISTÊNCIA
const DB_NAME = 'gestor_fiscal_br_vFinal';

// Carregar dados ou iniciar novo
let dados = JSON.parse(localStorage.getItem(DB_NAME)) || {
    classes: [
        { nome: "ISS", taxa: 5 },
        { nome: "ICMS", taxa: 18 }
    ],
    notas: []
};

document.addEventListener('DOMContentLoaded', () => {
    atualizarInterface();
});

// Funções de Sistema
function salvar() {
    localStorage.setItem(DB_NAME, JSON.stringify(dados));
    atualizarInterface();
}

function alternarSecao(idAlvo) {
    document.getElementById(idAlvo).classList.toggle('secao-oculta');
}

const formatar = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Lógica de Impostos
function processarNota(e, tipo) {
    e.preventDefault();
    const entidade = tipo === 'SAIDA' ? document.getElementById('clienteSaida').value : document.getElementById('fornecedorEntrada').value;
    const valorInput = parseFloat(tipo === 'SAIDA' ? document.getElementById('valorSaida').value : document.getElementById('valorEntrada').value);
    
    // Capturar checkboxes selecionados
    const containerID = tipo === 'SAIDA' ? 'checkImpostosSaida' : 'checkImpostosEntrada';
    const checks = document.querySelectorAll(`#${containerID} input:checked`);
    
    let taxaSomada = 0;
    let nomes = [];

    checks.forEach(c => {
        const classe = dados.classes[c.value];
        taxaSomada += classe.taxa;
        nomes.push(classe.nome);
    });

    const vImposto = valorInput * (taxaSomada / 100);
    const vTotal = tipo === 'SAIDA' ? valorInput + vImposto : valorInput;
    const vBase = tipo === 'SAIDA' ? valorInput : valorInput - vImposto;

    dados.notas.push({
        id: Date.now(),
        tipo,
        entidade,
        valorBase: vBase,
        valorImposto: vImposto,
        totalFinal: vTotal,
        classe: nomes.length > 0 ? nomes.join(' + ') : 'Isento'
    });

    e.target.reset();
    salvar();
}

// Eventos de Formulário
document.getElementById('formClasse').addEventListener('submit', (e) => {
    e.preventDefault();
    dados.classes.push({ 
        nome: document.getElementById('nomeClasse').value.toUpperCase(), 
        taxa: parseFloat(document.getElementById('taxaClasse').value) 
    });
    e.target.reset();
    salvar();
});

document.getElementById('formEmissao').addEventListener('submit', (e) => processarNota(e, 'SAIDA'));
document.getElementById('formEntrada').addEventListener('submit', (e) => processarNota(e, 'ENTRADA'));

// Renderização
function atualizarInterface() {
    let totR = 0, totP = 0, totI = 0;
    dados.notas.forEach(n => {
        if(n.tipo === 'SAIDA') { totR += n.totalFinal; totI += n.valorImposto; }
        else { totP += n.totalFinal; }
    });

    // Dashboard
    document.getElementById('dashRecebido').innerText = formatar(totR);
    document.getElementById('dashPago').innerText = formatar(totP);
    document.getElementById('dashImposto').innerText = formatar(totI);
    document.getElementById('dashSaldo').innerText = formatar(totR - totP);

    const perc = totR > 0 ? (totI / totR) * 100 : 0;
    document.getElementById('barraImposto').style.width = Math.min(perc, 100) + "%";
    document.getElementById('percentualImposto').innerText = perc.toFixed(1) + "% de carga tributária";

    // Gerar Checkboxes
    const htmlChecks = dados.classes.map((c, i) => `
        <div class="check-item">
            <input type="checkbox" value="${i}" id="cb${tipo = Math.random()}${i}">
            <label>${c.nome} (${c.taxa}%)</label>
        </div>
    `).join('');
    
    // Atualizar os containers de check sem perder o reset
    document.getElementById('checkImpostosSaida').innerHTML = dados.classes.map((c, i) => `
        <div class="check-item"><input type="checkbox" value="${i}"> <label>${c.nome} (${c.taxa}%)</label></div>`).join('');
    document.getElementById('checkImpostosEntrada').innerHTML = dados.classes.map((c, i) => `
        <div class="check-item"><input type="checkbox" value="${i}"> <label>${c.nome} (${c.taxa}%)</label></div>`).join('');

    // Listas e Tabelas
    document.getElementById('listaClasses').innerHTML = dados.classes.map(c => `<li>${c.nome}: ${c.taxa}%</li>`).join('');
    document.getElementById('corpoTabela').innerHTML = dados.notas.map(n => `
        <tr>
            <td class="tag-${n.tipo.toLowerCase()}">${n.tipo}</td>
            <td>${n.entidade} <br><small>${n.classe}</small></td>
            <td>${formatar(n.valorBase)}</td>
            <td>${formatar(n.valorImposto)}</td>
            <td><strong>${formatar(n.totalFinal)}</strong></td>
            <td><button onclick="apagarNota(${n.id})" style="color:red; border:none; background:none; cursor:pointer; font-weight:bold;">X</button></td>
        </tr>
    `).join('');
}

function apagarNota(id) {
    if(confirm("Deseja apagar este registo permanentemente?")) {
        dados.notas = dados.notas.filter(n => n.id !== id);
        salvar();
    }
}

document.getElementById('btnPDF').addEventListener('click', () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("Relatório Fiscal Consolidado", 14, 20);
    doc.autoTable({ html: '#tabelaFiscal', startY: 30, columnStyles: { 5: { display: 'none' } } });
    doc.save("relatorio_fiscal.pdf");
});