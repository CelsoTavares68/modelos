 let carrinho = [];
let editandoFornecedorId = null; // Controle exclusivo para edição de fornecedores

document.addEventListener('DOMContentLoaded', () => {
    atualizarTabelasEstoque();
    atualizarTabelaFornecedores();
    document.getElementById('idVenda')?.focus();
    
    document.getElementById('idVenda')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') adicionarItem();
    });
});

// --- INTERFACE ---
function toggleSecao(id) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('escondido');
}

// --- GESTÃO DE FORNECEDORES ---
function salvarFornecedor(e) {
    e.preventDefault();
    let fornecedores = JSON.parse(localStorage.getItem('fornecedores')) || [];
    const nome = document.getElementById('nomeFornecedor').value;

    if (editandoFornecedorId) {
        const index = fornecedores.findIndex(f => f.id === editandoFornecedorId);
        if (index !== -1) fornecedores[index].nome = nome;
        editandoFornecedorId = null;
        alert("Fornecedor atualizado!");
    } else {
        const novoId = fornecedores.length === 0 ? 1 : Math.max(...fornecedores.map(f => f.id)) + 1;
        fornecedores.push({ id: novoId, nome: nome });
        alert("Fornecedor cadastrado!");
    }

    localStorage.setItem('fornecedores', JSON.stringify(fornecedores));
    document.getElementById('fornecedorForm').reset();
    atualizarTabelaFornecedores();
    atualizarTabelasEstoque(); 
}

function prepararCorrecaoFornecedor(id) {
    const forns = JSON.parse(localStorage.getItem('fornecedores')) || [];
    const f = forns.find(forn => forn.id === id);
    if (f) {
        document.getElementById('nomeFornecedor').value = f.nome;
        editandoFornecedorId = id;
        if(document.getElementById('secao-fornecedor').classList.contains('escondido')) toggleSecao('secao-fornecedor');
        document.getElementById('nomeFornecedor').focus();
    }
}

// --- GESTÃO DE ESTOQUE ---
function verificarIdExistente() {
    const idBusca = document.getElementById('idBusca').value;
    if (!idBusca) return;
    const estoque = JSON.parse(localStorage.getItem('estoque')) || [];
    const produto = estoque.find(p => p.id === parseInt(idBusca));

    if (produto) {
        document.getElementById('nomeProduto').value = produto.nome;
        document.getElementById('nomeProduto').readOnly = true;
        document.getElementById('nomeProduto').style.background = "#e9ecef";
        document.getElementById('precoEntrada').value = produto.entrada;
        document.getElementById('idFornecedorInput').value = produto.idForn;
    } else {
        document.getElementById('nomeProduto').readOnly = false;
        document.getElementById('nomeProduto').style.background = "white";
    }
}

function prepararCorrecaoEstoque(id) {
    const estoque = JSON.parse(localStorage.getItem('estoque')) || [];
    const p = estoque.find(prod => prod.id === id);
    if (p) {
        document.getElementById('idBusca').value = p.id;
        document.getElementById('nomeProduto').value = p.nome;
        document.getElementById('quantidade').value = p.qtd;
        document.getElementById('precoEntrada').value = p.entrada;
        document.getElementById('idFornecedorInput').value = p.idForn;
        
        if(document.getElementById('secao-produto').classList.contains('escondido')) toggleSecao('secao-produto');
        document.getElementById('nomeProduto').focus();
        alert("Modo de correção ativado para: " + p.nome);
    }
}

 function salvarProduto(e) {
    e.preventDefault();
    let estoque = JSON.parse(localStorage.getItem('estoque')) || [];
    const idInf = parseInt(document.getElementById('idBusca').value);
    const qtdDigitada = parseInt(document.getElementById('quantidade').value); // Nova entrada
    const custo = parseFloat(document.getElementById('precoEntrada').value);
    
    const index = estoque.findIndex(p => p.id === idInf);
    
    if (index !== -1) {
        // --- CORREÇÃO AQUI: SOMA A QUANTIDADE ---
        // Se o produto já existe, mantemos o que tem e somamos a nova entrada
        estoque[index].nome = document.getElementById('nomeProduto').value;
        estoque[index].qtd = estoque[index].qtd + qtdDigitada; // SOMA: Atual + Nova
        estoque[index].entrada = custo;
        estoque[index].precoVenda = custo * 1.35;
        estoque[index].idForn = document.getElementById('idFornecedorInput').value;
        
        alert(`Estoque atualizado! Quantidade total agora é: ${estoque[index].qtd}`);
    } else {
        // Se for um produto novo, cria do zero
        const novoId = idInf || (estoque.length === 0 ? 101 : Math.max(...estoque.map(p => p.id)) + 1);
        estoque.push({
            id: novoId, 
            nome: document.getElementById('nomeProduto').value,
            qtd: qtdDigitada, 
            entrada: custo, 
            precoVenda: custo * 1.35,
            idForn: document.getElementById('idFornecedorInput').value
        });
        alert("Novo produto cadastrado!");
    }
    
    localStorage.setItem('estoque', JSON.stringify(estoque));
    document.getElementById('estoqueForm').reset();
    document.getElementById('nomeProduto').readOnly = false;
    document.getElementById('nomeProduto').style.background = "white";
    atualizarTabelasEstoque();
}

// --- FRENTE DE CAIXA ---
function adicionarItem() {
    const id = parseInt(document.getElementById('idVenda').value);
    const qtd = parseInt(document.getElementById('qtdVenda').value) || 1;
    const estoque = JSON.parse(localStorage.getItem('estoque')) || [];
    const produto = estoque.find(p => p.id === id);

    if (!produto) return alert("Produto não encontrado!");
    if (produto.qtd < qtd) return alert("Estoque insuficiente!");

    carrinho.push({ 
        id: produto.id, nome: produto.nome, qtdVenda: qtd, 
        precoUnit: produto.precoVenda, subtotal: produto.precoVenda * qtd 
    });
    
    renderizarCarrinho();
    document.getElementById('idVenda').value = "";
    document.getElementById('idVenda').focus();
}

function renderizarCarrinho() {
    const corpo = document.querySelector('#tabelaCarrinho tbody');
    corpo.innerHTML = "";
    let total = 0;
    carrinho.forEach((item, i) => {
        total += item.subtotal;
        corpo.innerHTML += `<tr><td>${item.nome}</td><td>${item.qtdVenda}</td><td>R$ ${item.precoUnit.toFixed(2)}</td><td>R$ ${item.subtotal.toFixed(2)}</td><td><button onclick="removerItemCarrinho(${i})">❌</button></td></tr>`;
    });
    document.getElementById('displayTotal').innerText = `R$ ${total.toFixed(2)}`;
    calcularTroco();
}

function calcularTroco() {
    const total = parseFloat(document.getElementById('displayTotal').innerText.replace('R$ ','')) || 0;
    const recebido = parseFloat(document.getElementById('valorRecebido').value) || 0;
    document.getElementById('displayTroco').innerText = `R$ ${Math.max(0, recebido - total).toFixed(2)}`;
}

 function finalizarVenda() {
    if (carrinho.length === 0) return alert("Carrinho vazio!");
    
    const total = document.getElementById('displayTotal').innerText;
    const recebido = parseFloat(document.getElementById('valorRecebido').value) || 0;
    const troco = document.getElementById('displayTroco').innerText;

    // --- CORREÇÃO DO CUPOM (ABERTURA DE JANELA) ---
    const win = window.open('', '', 'width=300,height=600');
    win.document.write(`
        <html>
        <head><title>Cupom Fiscal</title></head>
        <body style="font-family:monospace; width:250px; padding:10px;">
            <h3 style="text-align:center;">RECIBO DE VENDA</h3>
            <hr>
            ${carrinho.map(i => `<p>${i.nome}<br> ${i.qtdVenda}x R$ ${i.precoUnit.toFixed(2)} = R$ ${i.subtotal.toFixed(2)}</p>`).join('')}
            <hr>
            <p><b>TOTAL: ${total}</b></p>
            <p>RECEBIDO: R$ ${recebido.toFixed(2)}</p>
            <p>TROCO: ${troco}</p>
            <p style="text-align:center; margin-top:20px;">Obrigado pela preferência!</p>
        </body>
        </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500); // Aguarda carregar para imprimir

    // Registro para o Fechamento
    let vendas = JSON.parse(localStorage.getItem('vendasDoDia')) || [];
    carrinho.forEach(item => {
        vendas.push({
            nome: item.nome, qtd: item.qtdVenda,
            valorVenda: item.precoUnit, totalItem: item.subtotal
        });
    });
    localStorage.setItem('vendasDoDia', JSON.stringify(vendas));

    // Baixa estoque
    let estoque = JSON.parse(localStorage.getItem('estoque'));
    carrinho.forEach(item => { let p = estoque.find(x => x.id === item.id); if(p) p.qtd -= item.qtdVenda; });
    localStorage.setItem('estoque', JSON.stringify(estoque));

    // Limpeza Total e Foco
    carrinho = [];
    document.getElementById('valorRecebido').value = "";
    document.getElementById('idVenda').value = "";
    document.getElementById('displayTotal').innerText = "R$ 0,00";
    document.getElementById('displayTroco').innerText = "R$ 0,00";
    renderizarCarrinho();
    atualizarTabelasEstoque();
    alert("Venda Finalizada!");
}

// --- RELATÓRIOS PDF ---
function gerarPDFBalanco() {
    const estoque = JSON.parse(localStorage.getItem('estoque')) || [];
    let totalPatrimonio = 0;
    let html = `<h2>Balanço Geral de Estoque</h2><table border="1" style="width:100%;border-collapse:collapse;">
                <tr style="background:#eee"><th>ID</th><th>Produto</th><th>Qtd</th><th>Preço Venda</th><th>Subtotal</th></tr>`;
    
    estoque.forEach(p => {
        const sub = p.qtd * p.precoVenda;
        totalPatrimonio += sub;
        html += `<tr><td>${p.id}</td><td>${p.nome}</td><td>${p.qtd}</td><td>R$ ${p.precoVenda.toFixed(2)}</td><td>R$ ${sub.toFixed(2)}</td></tr>`;
    });
    html += `</table><h3>Patrimônio Total: R$ ${totalPatrimonio.toFixed(2)}</h3>`;
    const el = document.createElement('div'); el.innerHTML = html;
    html2pdf().from(el).save('Balanco_Geral.pdf');
}

function gerarPDFVendasDia() {
    const vendas = JSON.parse(localStorage.getItem('vendasDoDia')) || [];
    if(vendas.length === 0) return alert("Sem vendas!");
    let totalGeral = 0;
    let html = `<h2>Fechamento de Vendas - ${new Date().toLocaleDateString()}</h2>
                <table border="1" style="width:100%;border-collapse:collapse;">
                <tr style="background:#eee"><th>Mercadoria</th><th>Qtd</th><th>Vlr Unit.</th><th>Subtotal</th></tr>`;
    
    vendas.forEach(v => {
        html += `<tr><td>${v.nome}</td><td>${v.qtd}</td><td>R$ ${v.valorVenda.toFixed(2)}</td><td>R$ ${v.totalItem.toFixed(2)}</td></tr>`;
        totalGeral += v.totalItem;
    });
    html += `</table><h3>Total Geral: R$ ${totalGeral.toFixed(2)}</h3>`;
    const el = document.createElement('div'); el.innerHTML = html;
    html2pdf().from(el).save('Fechamento_Diario.pdf');
    if(confirm("Zerar vendas para amanhã?")) localStorage.removeItem('vendasDoDia');
}

// --- ATUALIZAÇÃO DE TABELAS ---
function atualizarTabelasEstoque() {
    const corpo = document.querySelector('#tabelaEstoque tbody');
    if (!corpo) return;
    const estoque = JSON.parse(localStorage.getItem('estoque')) || [];
    const fornecedores = JSON.parse(localStorage.getItem('fornecedores')) || [];

    corpo.innerHTML = estoque.map(p => {
        const forn = fornecedores.find(f => f.id == p.idForn);
        return `<tr><td>${p.id}</td><td>${p.nome}</td><td>${p.qtd}</td><td>R$ ${p.precoVenda.toFixed(2)}</td><td>${forn ? forn.nome : 'ID: '+p.idForn}</td>
                <td><button onclick="prepararCorrecaoEstoque(${p.id})" class="btn-azul">✏️</button>
                <button onclick="removerDado('estoque', ${p.id})" class="btn-excluir">🗑️</button></td></tr>`;
    }).join('');
}

function atualizarTabelaFornecedores() {
    const corpoForn = document.querySelector('#tabelaFornecedores tbody');
    if (!corpoForn) return;
    const forns = JSON.parse(localStorage.getItem('fornecedores')) || [];
    corpoForn.innerHTML = forns.map(f => `<tr><td>${f.id}</td><td>${f.nome}</td>
                <td><button onclick="prepararCorrecaoFornecedor(${f.id})" class="btn-azul">✏️</button>
                <button onclick="removerDado('fornecedores', ${f.id})" class="btn-excluir">🗑️</button></td></tr>`).join('');
}

function removerDado(chave, id) {
    if (!confirm("Excluir registro?")) return;
    let dados = JSON.parse(localStorage.getItem(chave)) || [];
    localStorage.setItem(chave, JSON.stringify(dados.filter(d => d.id !== id)));
    chave === 'fornecedores' ? atualizarTabelaFornecedores() : atualizarTabelasEstoque();
}

function removerItemCarrinho(i) {
    carrinho.splice(i, 1);
    renderizarCarrinho();
}

// Bind de formulários
const fProd = document.getElementById('estoqueForm');
if (fProd) fProd.onsubmit = salvarProduto;

const fForn = document.getElementById('fornecedorForm');
if (fForn) fForn.onsubmit = salvarFornecedor;