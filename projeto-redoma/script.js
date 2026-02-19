  let dataAtual = new Date();
const textarea = document.getElementById('anotacao');
const campoData = document.getElementById('busca-data');

function obterChaveData(d) {
    const ano = d.getFullYear();
    const mes = ("0" + (d.getMonth() + 1)).slice(-2);
    const dia = ("0" + d.getDate()).slice(-2);
    return `${ano}-${mes}-${dia}`;
}

function carregarPagina(veioDoCalendario = false) {
    const chave = obterChaveData(dataAtual);
    
    // Atualiza o texto da data no topo
    document.getElementById('data-display').innerText = dataAtual.toLocaleDateString('pt-BR', { 
        weekday: 'long', day: 'numeric', month: 'long' 
    });
    
    // Carrega a anotação
    textarea.value = localStorage.getItem(chave) || "";
    
    // TRAVA DE SEGURANÇA: Se o utilizador mudou a data pelo calendário, 
    // NÃO deixamos o JS reescrever o valor do campo agora.
    if (!veioDoCalendario) {
        campoData.value = chave;
    }
}

// Botões de navegação
document.getElementById('prevBtn').onclick = () => { 
    dataAtual.setDate(dataAtual.getDate() - 1); 
    carregarPagina(false); 
};

document.getElementById('nextBtn').onclick = () => { 
    dataAtual.setDate(dataAtual.getDate() + 1); 
    carregarPagina(false); 
};

textarea.oninput = () => { 
    localStorage.setItem(obterChaveData(dataAtual), textarea.value); 
};

// SOLUÇÃO PARA TABLET: Mudamos para 'change' e adicionamos um pequeno atraso
campoData.onchange = function() {
    if (this.value) {
        const partes = this.value.split('-').map(Number);
        
        // Criamos a nova data às 12h00
        const novaData = new Date(partes[0], partes[1] - 1, partes[2], 12, 0, 0);
        
        // Atualizamos a variável global
        dataAtual = novaData;
        
        // Executamos a atualização avisando que o calendário é o "dono" da mudança
        carregarPagina(true);
    }
};

// Relógio
setInterval(() => {
    const relogio = document.getElementById('relogio');
    if (relogio) relogio.innerText = new Date().toLocaleTimeString('pt-BR');
}, 1000);

// Inicialização inicial
carregarPagina(false);

// Registo do Service Worker (Mantenha sem a versão se o seu ficheiro for apenas 'sw.js')
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}