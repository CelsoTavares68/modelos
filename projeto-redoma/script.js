 let dataAtual = new Date();
const textarea = document.getElementById('anotacao');
const campoData = document.getElementById('busca-data');

function obterChaveData(d) {
    const ano = d.getFullYear();
    const mes = ("0" + (d.getMonth() + 1)).slice(-2);
    const dia = ("0" + d.getDate()).slice(-2);
    return `${ano}-${mes}-${dia}`;
}

function carregarPagina() {
    const chave = obterChaveData(dataAtual);
    document.getElementById('data-display').innerText = dataAtual.toLocaleDateString('pt-BR', { 
        weekday: 'long', day: 'numeric', month: 'long' 
    });
    textarea.value = localStorage.getItem(chave) || "";
    campoData.value = chave;
}

// Navegação por botões
document.getElementById('prevBtn').onclick = () => { 
    dataAtual.setDate(dataAtual.getDate() - 1); 
    carregarPagina(); 
};

document.getElementById('nextBtn').onclick = () => { 
    dataAtual.setDate(dataAtual.getDate() + 1); 
    carregarPagina(); 
};

// Salvar ao digitar
textarea.oninput = () => { 
    localStorage.setItem(obterChaveData(dataAtual), textarea.value); 
};

// CORREÇÃO DEFINITIVA DO CALENDÁRIO PARA MOBILE
campoData.oninput = function() {
    if (this.value) {
        const partes = this.value.split('-').map(Number);
        // Criamos a data às 12:00 para evitar que o fuso horário (UTC-3) mude o dia/mês
        dataAtual = new Date(partes[0], partes[1] - 1, partes[2], 12, 0, 0);
        carregarPagina();
    }
};

// Relógio em tempo real
setInterval(() => {
    const relogio = document.getElementById('relogio');
    if (relogio) relogio.innerText = new Date().toLocaleTimeString('pt-BR');
}, 1000);

// Inicialização
carregarPagina();

// Registro do Service Worker (Sincronizado com a versão v104 do index e sw)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js?v=104');
}