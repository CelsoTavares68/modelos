  // CHAVE ÚNICA PARA A BASE DE DADOS
const NOME_DB = 'sistema_gestor_fiscal_br';

// Carrega os dados salvos ou cria um novo objeto se não existir nada
let dados = JSON.parse(localStorage.getItem(NOME_DB)) || {
    classes: [{ nome: "Isento", taxa: 0 }],
    notas: []
};

// Executa assim que a página carrega
document.addEventListener('DOMContentLoaded', () => {
    atualizarInterface();
});

// Salva os dados no navegador de forma permanente
function salvar() {
    localStorage.setItem(NOME_DB, JSON.stringify(dados));
    atualizarInterface();
}

function alternarSecao(idAlvo) {
    const secao = document.getElementById(idAlvo);
    secao.classList.toggle('secao-oculta');
}

const formatar = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Registar Vendas e Compras
function processarNota(e, tipo) {
    e.preventDefault();
    const entidade = tipo === 'SAIDA' ? document.getElementById('clienteSaida').value : document.getElementById('fornecedorEntrada').value;
    const valorInput = parseFloat(tipo === 'SAIDA' ? document.getElementById('valorSaida').value : document.getElementById('valorEntrada').value);
    
    const indexClasse = tipo === 'SAIDA' ? document.getElementById('selectClasseSaida').value : document.getElementById('selectClasseEntrada').value;
    const classe = dados.classes[indexClasse];
    
    const valorImposto = valorInput * (classe.taxa / 100);
    const totalFinal = tipo === 'SAIDA' ? valorInput + valorImposto : valorInput;
    const valorBase = tipo === 'SAIDA' ? valorInput : valorInput - valorImposto;

    dados.notas.push({
        id: Date.now(),
        tipo,
        entidade,
        valorBase,
        valorImposto,
        totalFinal,
        classe: classe.nome
    });

    e.target.reset();
    salvar(); // Salva permanentemente no LocalStorage
}

// Configurar Classes de Impostos
document.getElementById('formClasse').addEventListener('submit', (e) => {
    e.preventDefault();
    const nome = document.getElementById('nomeClasse').value;
    const taxa = parseFloat(document.getElementById('taxaClasse').value);
    
    dados.classes.push({ nome, taxa });
    e.target.reset();
    salvar(); // Salva permanentemente no LocalStorage
});

document.getElementById('formEmissao').addEventListener('submit', (e) => processarNota(e, 'SAIDA'));
document.getElementById('formEntrada').addEventListener('submit', (e) => processarNota(e, 'ENTRADA'));

// Atualiza todos os elementos visuais
function atualizarInterface() {
    let totalR = 0, totalP = 0, totalI = 0;
    
    dados.notas.forEach(n => {
        if(n.tipo === 'SAIDA') { totalR += n.totalFinal; totalI += n.valorImposto; }
        else { totalP += n.totalFinal; }
    });

    document.getElementById('dashRecebido').innerText = formatar(totalR);
    document.getElementById('dashPago').innerText = formatar(totalP);
    document.getElementById('dashImposto').innerText = formatar(totalI);
    document.getElementById('dashSaldo').innerText = formatar(totalR - totalP);

    const percentual = totalR > 0 ? (totalI / totalR) * 100 : 0;
    document.getElementById('barraImposto').style.width = Math.min(percentual, 100) + "%";
    document.getElementById('percentualImposto').innerText = percentual.toFixed(1) + "% de carga tributária";

    // Atualiza os Menus de Seleção
    const htmlSelect = dados.classes.map((c, i) => `<option value="${i}">${c.nome} (${c.taxa}%)</option>`).join('');
    document.getElementById('selectClasseSaida').innerHTML = htmlSelect;
    document.getElementById('selectClasseEntrada').innerHTML = htmlSelect;

    // Atualiza Lista de Classes
    document.getElementById('listaClasses').innerHTML = dados.classes.map(c => `<li>${c.nome}: ${c.taxa}%</li>`).join('');

    // Atualiza Tabela de Histórico
    document.getElementById('corpoTabela').innerHTML = dados.notas.map(n => `
        <tr>
            <td class="tag-${n.tipo.toLowerCase()}">${n.tipo}</td>
            <td>${n.entidade} <br><small>${n.classe}</small></td>
            <td>${formatar(n.valorBase)}</td>
            <td>${formatar(n.valorImposto)}</td>
            <td><strong>${formatar(n.totalFinal)}</strong></td>
            <td><button onclick="apagarNota(${n.id})" style="background:none; border:none; color:red; cursor:pointer; font-weight:bold;">Apagar</button></td>
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
    doc.text("Relatório Fiscal", 14, 20);
    doc.autoTable({ html: '#tabelaFiscal', startY: 30, columnStyles: { 5: { display: 'none' } } });
    doc.save("relatorio.pdf");
});