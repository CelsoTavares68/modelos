 let dataAtual = new Date();
const textarea = document.getElementById('anotacao');
const campoData = document.getElementById('busca-data');

function obterChaveData(d) {
    const ano = d.getFullYear();
    const mes = ("0" + (d.getMonth() + 1)).slice(-2);
    const dia = ("0" + d.getDate()).slice(-2);
    return `${ano}-${mes}-${dia}`;
}

function carregarPagina(origemCalendario = false) {
    const chave = obterChaveData(dataAtual);
    
    // Atualiza o display de texto
    document.getElementById('data-display').innerText = dataAtual.toLocaleDateString('pt-BR', { 
        weekday: 'long', day: 'numeric', month: 'long' 
    });
    
    // Carrega o texto salvo
    textarea.value = localStorage.getItem(chave) || "";

    // SÓ atualiza o valor do campo de data se a mudança NÃO veio do próprio calendário
    // Isso evita que o Android resete a data para "hoje" por conflito de foco
    if (!origemCalendario) {
        campoData.value = chave;
    }
}

// Navegação por botões
document.getElementById('prevBtn').onclick = (e) => {
    e.preventDefault();
    dataAtual.setDate(dataAtual.getDate() - 1);
    carregarPagina(false);
};

document.getElementById('nextBtn').onclick = (e) => {
    e.preventDefault();
    dataAtual.setDate(dataAtual.getDate() + 1);
    carregarPagina(false);
};

// Salvar anotação
textarea.addEventListener('input', () => {
    localStorage.setItem(obterChaveData(dataAtual), textarea.value);
});

// A SOLUÇÃO PARA O CALENDÁRIO MOBILE (Onde o erro acontece)
campoData.addEventListener('change', function(e) {
    if (this.value) {
        // 1. Bloqueia qualquer outra ação do navegador
        e.stopPropagation();
        
        // 2. Extrai a data
        const partes = this.value.split('-').map(Number);
        
        // 3. Define a data às 12h (meio-dia) para ignorar fuso horário do sistema
        const novaData = new Date(partes[0], partes[1] - 1, partes[2], 12, 0, 0);
        
        // 4. Aplica a mudança
        dataAtual = novaData;
        carregarPagina(true);
        
        // 5. Tira o foco do campo para o Android "confirmar" a escolha
        this.blur();
    }
}, true);

// Relógio
setInterval(() => {
    const relogio = document.getElementById('relogio');
    if (relogio) relogio.innerText = new Date().toLocaleTimeString('pt-BR');
}, 1000);

// Inicializa a página
carregarPagina(false);

// Service Worker (Versão limpa)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}