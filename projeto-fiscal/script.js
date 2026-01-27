  // CHAVE ÚNICA PARA A BASE DE DADOS
const NOME_DB = 'sistema_gestor_fiscal_br';

// Carrega os dados salvos ou inicia com os Anexos do Simples Nacional
let dados = JSON.parse(localStorage.getItem(NOME_DB)) || {
    classes: [
        { nome: "Anexo I (Comércio)", taxa: 4 },
        { nome: "Anexo II (Indústria)", taxa: 4.5 },
        { nome: "Anexo III (Serviços)", taxa: 6 },
        { nome: "Anexo V (Tecnologia)", taxa: 15.5 }
    ],
    notas: [],
    valorFolha: 0
};

document.addEventListener('DOMContentLoaded', () => {
    atualizarInterface();
});

// --- FUNÇÕES DE PERSISTÊNCIA E INTERFACE ---
function salvar() {
    localStorage.setItem(NOME_DB, JSON.stringify(dados));
    atualizarInterface();
}

function alternarSecao(idAlvo) {
    document.getElementById(idAlvo).classList.toggle('secao-oculta');
}

const formatar = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// --- LÓGICA DO FATOR R ---
function salvarFolha() {
    const valor = parseFloat(document.getElementById('valorFolha').value) || 0;
    dados.valorFolha = valor;
    salvar();
    alert("Valor da folha/pró-labore atualizado com sucesso!");
}

function calcularDicaFatorR() {
    let faturamentoSaidas = 0;
    dados.notas.forEach(n => { if(n.tipo === 'SAIDA') faturamentoSaidas += n.valorBase; });
    
    if (faturamentoSaidas === 0) return "Lance vendas para calcular o Fator R";

    const relacao = (dados.valorFolha / faturamentoSaidas) * 100;
    
    // Regra: Se Folha/Faturamento >= 28%, usa Anexo III (6%), senão Anexo V (15,5%)
    if (relacao >= 28) {
        return `Fator R: ${relacao.toFixed(1)}% (Use Anexo III - Economia detectada!)`;
    } else {
        return `Fator R: ${relacao.toFixed(1)}% (Atenção: Use Anexo V ou aumente o Pró-labore)`;
    }
}

// --- PROCESSAMENTO DE NOTAS ---
function processarNota(e, tipo) {
    e.preventDefault();
    const entidade = tipo === 'SAIDA' ? document.getElementById('clienteSaida').value : document.getElementById('fornecedorEntrada').value;
    const valorInput = parseFloat(tipo === 'SAIDA' ? document.getElementById('valorSaida').value : document.getElementById('valorEntrada').value);
    
    // Captura múltiplos impostos (Checkboxes)
    const containerID = tipo === 'SAIDA' ? 'checkImpostosSaida' : 'checkImpostosEntrada';
    const checkboxes = document.querySelectorAll(`#${containerID} input:checked`);
    
    let taxaTotal = 0;
    let nomesImpostos = [];

    checkboxes.forEach(cb => {
        const classe = dados.classes[cb.value];
        taxaTotal += classe.taxa;
        nomesImpostos.push(classe.nome);
    });

    const valorImposto = valorInput * (taxaTotal / 100);
    const totalFinal = tipo === 'SAIDA' ? valorInput + valorImposto : valorInput;
    const valorBase = tipo === 'SAIDA' ? valorInput : valorInput - valorImposto;

    dados.notas.push({
        id: Date.now(),
        tipo,
        entidade,
        valorBase,
        valorImposto,
        totalFinal,
        classe: nomesImpostos.length > 0 ? nomesImpostos.join(' + ') : 'Isento'
    });

    e.target.reset();
    salvar();
}

// --- ATUALIZAÇÃO GERAL DA TELA ---
function atualizarInterface() {
    let totalR = 0, totalP = 0, totalI = 0;
    
    dados.notas.forEach(n => {
        if(n.tipo === 'SAIDA') { totalR += n.totalFinal; totalI += n.valorImposto; }
        else { totalP += n.totalFinal; }
    });

    // Dashboard
    document.getElementById('dashRecebido').innerText = formatar(totalR);
    document.getElementById('dashPago').innerText = formatar(totalP);
    document.getElementById('dashImposto').innerText = formatar(totalI);
    document.getElementById('dashSaldo').innerText = formatar(totalR - totalP);

    // Barra e Dica de Fator R
    const percCarga = totalR > 0 ? (totalI / totalR) * 100 : 0;
    document.getElementById('barraImposto').style.width = Math.min(percCarga, 100) + "%";
    document.getElementById('percentualImposto').innerHTML = `Carga: ${percCarga.toFixed(1)}% | <strong>${calcularDicaFatorR()}</strong>`;

    // Renderizar Checkboxes de Impostos
    const renderChecks = () => {
        return dados.classes.map((c, i) => `
            <div class="check-item">
                <input type="checkbox" value="${i}" id="tax${tipo = Math.random()}${i}">
                <label>${c.nome} (${c.taxa}%)</label>
            </div>
        `).join('');
    };
    document.getElementById('checkImpostosSaida').innerHTML = renderChecks();
    document.getElementById('checkImpostosEntrada').innerHTML = renderChecks();

    // Lista de Classes e Tabela
    document.getElementById('listaClasses').innerHTML = dados.classes.map(c => `<li>${c.nome}: ${c.taxa}%</li>`).join('');
    document.getElementById('valorFolha').value = dados.valorFolha;

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

// Eventos de Submissão
document.getElementById('formClasse').addEventListener('submit', (e) => {
    e.preventDefault();
    dados.classes.push({ 
        nome: document.getElementById('nomeClasse').value, 
        taxa: parseFloat(document.getElementById('taxaClasse').value) 
    });
    e.target.reset();
    salvar();
});

document.getElementById('formEmissao').addEventListener('submit', (e) => processarNota(e, 'SAIDA'));
document.getElementById('formEntrada').addEventListener('submit', (e) => processarNota(e, 'ENTRADA'));

function apagarNota(id) {
    if(confirm("Deseja apagar este registro?")) {
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