  let totalAtual = 0;
let itensAtuais = [];

// Variáveis de controle para processos em etapas (Modais)
let bebidaPendente = null;
let precoPendente = 0;
let itemParaAdicionarComObs = null;

// 1. BANCO DE DADOS DE INGREDIENTES
const ingredientes = {
    'Carpaccio de Carne': 'Carne bovina fatiada finamente, alcaparras, parmesão e molho mostarda.',
    'Dadinho de Tapioca': 'Cubos de tapioca com queijo coalho fritos, acompanha geleia de pimenta.',
    'Bruschetta Parma': 'Pão italiano tostado, presunto de parma, tomate cereja e manjericão.',
    'Camarão Empanado': '6 camarões rosa grandes empanados na farinha panko.',
    'Ceviche Clássico': 'Peixe branco marinado no limão, cebola roxa, coentro e pimenta.',
    'Burrata com Pesto': 'Queijo burrata cremoso, molho pesto artesanal e tomates confitados.',
    'Picanha Premium': 'Corte nobre grelhado (500g), acompanha arroz, farofa e batatas rústicas.',
    'Risoto Al Mare': 'Arroz arbóreo com camarões, lulas e mariscos frescos.',
    'Salmão Grelhado': 'Filé de salmão ao molho de ervas e purê de mandioquinha.',
    'Filé Mignon': 'Medalhão ao molho madeira com risoto de parmesão.',
    'Nhoque Trufado': 'Nhoque artesanal de batata com azeite de trufas brancas.',
    'Lagosta Grelhada': 'Cauda de lagosta na manteiga de ervas e legumes salteados.',
    'Petit Gâteau': 'Bolinho quente de chocolate com sorvete de baunilha.',
    'Tiramisù': 'Clássica sobremesa italiana com café, cacau e mascarpone.',
    'Cheesecake': 'Torta de queijo com calda artesanal de frutas vermelhas.',
    'Crème Brûlée': 'Creme de baunilha com crosta crocante de açúcar queimado.',
    'Brownie': 'Brownie de chocolate amargo com nozes e calda quente.',
    'Frutas': 'Seleção de frutas da estação laminadas.'
};

// --- 2. LÓGICA DE SELEÇÃO E ADIÇÃO ---

/**
 * Passo 1: Inicia a adição (Abre modal de Observação)
 */
function adicionarItem(nome, preco) {
    itemParaAdicionarComObs = { nome, preco };
    document.getElementById('obs-titulo').textContent = "Observação: " + nome;
    document.getElementById('campo-obs').value = ''; // Limpa texto anterior
    document.getElementById('modal-obs').style.display = 'block';
}

/**
 * Passo 2: Confirma a inclusão final na lista
 */
function confirmarComObs() {
    const obs = document.getElementById('campo-obs').value.trim();
    // Formata o nome para incluir a observação se existir
    const nomeFinal = obs ? `${itemParaAdicionarComObs.nome} (* ${obs})` : itemParaAdicionarComObs.nome;
    
    itensAtuais.push({ nome: nomeFinal, preco: itemParaAdicionarComObs.preco });
    totalAtual += itemParaAdicionarComObs.preco;
    
    atualizarComandaVisual();
    fecharModalObs();
}

/**
 * Atualiza a lista lateral da tela
 */
function atualizarComandaVisual() {
    const lista = document.getElementById('lista-comanda');
    lista.innerHTML = '';
    itensAtuais.forEach(item => {
        const li = document.createElement('li');
        li.style.display = 'flex'; 
        li.style.justifyContent = 'space-between';
        li.style.fontSize = '0.9rem';
        li.style.borderBottom = '1px solid #eee';
        li.style.padding = '4px 0';
        li.innerHTML = `<span>${item.nome}</span> <span>R$ ${item.preco.toFixed(2)}</span>`;
        lista.appendChild(li);
    });
    document.getElementById('valor-total').textContent = totalAtual.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
}

// --- 3. MODAIS DE SABORES E INGREDIENTES ---

function abrirOpcoesBebida(nome, preco, opcoes) {
    bebidaPendente = nome;
    precoPendente = preco;
    const modal = document.getElementById('modal-bebidas');
    const container = document.getElementById('lista-opcoes-bebida');
    document.getElementById('bebida-titulo').textContent = "Sabor/Marca: " + nome;
    
    container.innerHTML = ''; 
    opcoes.forEach(opcao => {
        const btn = document.createElement('button');
        btn.className = 'btn-acao';
        btn.style.background = '#0984e3';
        btn.textContent = opcao;
        btn.onclick = function() {
            const nomeComSabor = `${bebidaPendente} (${opcao})`;
            fecharModalBebida();
            adicionarItem(nomeComSabor, precoPendente); // Vai para o modal de Observação
        };
        container.appendChild(btn);
    });
    modal.style.display = 'block';
}

function abrirIngredientes(nome) {
    document.getElementById('modal-titulo').textContent = nome;
    document.getElementById('modal-texto').textContent = ingredientes[nome] || "Ingredientes não detalhados.";
    document.getElementById('modal-ingredientes').style.display = 'block';
}

function fecharModal() { document.getElementById('modal-ingredientes').style.display = 'none'; }
function fecharModalBebida() { document.getElementById('modal-bebidas').style.display = 'none'; }
function fecharModalObs() { document.getElementById('modal-obs').style.display = 'none'; }

// Fechar modais ao clicar fora da caixa branca
window.onclick = function(e) {
    if(e.target.classList.contains('modal')) {
        fecharModal();
        fecharModalBebida();
        fecharModalObs();
    }
}

// --- 4. FLUXO DE PEDIDOS (COZINHA/CAIXA) ---

function enviarParaCozinha() {
    const mesa = document.getElementById('mesa').value;
    if(!mesa || itensAtuais.length === 0) return alert("Informe a mesa e escolha os itens!");
    
    const hora = new Date().toLocaleTimeString('pt-BR');
    
    // 1. Imprime via de produção
    imprimir(mesa, totalAtual, itensAtuais, 'cozinha', hora);

    // 2. Manda para o painel da cozinha
    const painel = document.getElementById('pedidos-cozinha');
    const dadosPedido = JSON.stringify(itensAtuais);
    const div = document.createElement('div');
    div.className = 'card-pedido';
    div.innerHTML = `
        <div style="display:flex; justify-content:space-between">
            <strong>MESA ${mesa}</strong> 
            <small style="color:#e67e22">🕒 ${hora}</small>
        </div>
        <p style="margin-top:5px; font-size:0.9rem;">${itensAtuais.map(i => i.nome).join('<br>')}</p>
        <button class="btn-acao" onclick='passarCaixa(this, "${mesa}", ${totalAtual}, ${dadosPedido}, "${hora}")'>PRONTO (Mandar Caixa)</button>
    `;
    painel.appendChild(div);
    limparSelecao();
}

function passarCaixa(btn, mesa, total, itens, hora) {
    btn.parentElement.remove();
    const painelCaixa = document.getElementById('pedidos-caixa');
    const div = document.createElement('div');
    div.className = 'card-pedido'; 
    div.style.borderLeftColor = '#0984e3';
    div.innerHTML = `
        <div style="display:flex; justify-content:space-between">
            <strong>MESA ${mesa}</strong>
            <small>Desde: ${hora}</small>
        </div>
        <p>Total: R$ ${total.toFixed(2)}</p>
        <button class="btn-acao" style="background:#0984e3" onclick='fecharMesa(this, "${mesa}", ${total}, ${JSON.stringify(itens)}, "${hora}")'>IMPRIMIR CONTA</button>
    `;
    painelCaixa.appendChild(div);
}

function fecharMesa(btn, mesa, total, itens, hora) {
    imprimir(mesa, total, itens, 'caixa', hora);
    setTimeout(() => {
        if(confirm("Deseja confirmar o pagamento e encerrar a mesa " + mesa + "?")) {
            btn.parentElement.remove();
        }
    }, 500);
}

// --- 5. FUNÇÃO DE IMPRESSÃO PROFISSIONAL (80mm) ---

function imprimir(mesa, total, itens, tipo, hora) {
    document.getElementById('print-mesa').textContent = mesa;
    document.getElementById('print-hora').textContent = hora;
    document.getElementById('print-data').textContent = new Date().toLocaleDateString('pt-BR');
    
    const titulo = document.getElementById('print-titulo');
    const rodape = document.getElementById('print-rodape');
    const totalElement = document.getElementById('print-total');
    
    if (tipo === 'cozinha') {
        titulo.textContent = "PEDIDO DE PRODUÇÃO";
        rodape.textContent = "VIA COZINHA - BOM TRABALHO!";
        totalElement.textContent = "";
    } else {
        titulo.textContent = "CONTA DE CONSUMO";
        rodape.textContent = "OBRIGADO PELA PREFERÊNCIA!";
        totalElement.textContent = "TOTAL: R$ " + total.toFixed(2);
    }
    
    const container = document.getElementById('print-itens');
    container.innerHTML = '';

    itens.forEach(i => {
        // Separa nome e observação para o ticket
        const partes = i.nome.split(' (* ');
        const nomePrincipal = partes[0];
        const observacao = partes[1] ? partes[1].replace(')', '') : null;

        const div = document.createElement('div');
        div.style.marginBottom = "6px";
        div.style.borderBottom = "0.1mm dashed #ccc";
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; font-weight:bold;">
                <span>${nomePrincipal}</span>
                <span>${tipo === 'caixa' ? i.preco.toFixed(2) : ''}</span>
            </div>
            ${observacao ? `<div style="font-size: 0.85rem; font-style: italic; margin-left: 5mm;"> -> OBS: ${observacao}</div>` : ''}
        `;
        container.appendChild(div);
    });

    window.print();
}

function limparSelecao() {
    totalAtual = 0;
    itensAtuais = [];
    document.getElementById('lista-comanda').innerHTML = '';
    document.getElementById('valor-total').textContent = 'R$ 0,00';
    document.getElementById('mesa').value = '';
    itemParaAdicionarComObs = null;
}