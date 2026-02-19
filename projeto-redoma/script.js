  let dataAtual = new Date();
const textarea = document.getElementById('anotacao');
const campoData = document.getElementById('busca-data');

function obterChaveData(d) {
    const ano = d.getFullYear();
    const mes = ("0" + (d.getMonth() + 1)).slice(-2);
    const dia = ("0" + d.getDate()).slice(-2);
    return `${ano}-${mes}-${dia}`;
}

function carregarPagina(bloquearInput = false) {
    const chave = obterChaveData(dataAtual);
    document.getElementById('data-display').innerText = dataAtual.toLocaleDateString('pt-BR', { 
        weekday: 'long', day: 'numeric', month: 'long' 
    });
    textarea.value = localStorage.getItem(chave) || "";
    
    // Se estivermos mudando pelo calendário, NÃO tocamos no campo de data agora.
    // Isso evita que o Android perca o foco e ignore a seleção.
    if (!bloquearInput) {
        campoData.value = chave;
    }
}

// Navegação por botões
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

// A SOLUÇÃO DEFINITIVA: 
// Usamos 'blur' para garantir que o Android só processe a data após fechar o seletor.
campoData.addEventListener('change', function() {
    if (this.value) {
        const partes = this.value.split('-').map(Number);
        // Meio-dia (12h) mata o problema de fuso horário no Brasil (UTC-3)
        dataAtual = new Date(partes[0], partes[1] - 1, partes[2], 12, 0, 0);
        
        // Pequeno delay para o navegador mobile "respirar"
        setTimeout(() => {
            carregarPagina(true); 
        }, 50);
    }
});

// Relógio
setInterval(() => {
    const relogio = document.getElementById('relogio');
    if (relogio) relogio.innerText = new Date().toLocaleTimeString('pt-BR');
}, 1000);

carregarPagina(false);

// Service Worker simples
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}