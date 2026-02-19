 let dataAtual = new Date();
const textarea = document.getElementById('anotacao');
const campoData = document.getElementById('busca-data');

function obterChaveData(d) {
    const ano = d.getFullYear();
    const mes = ("0" + (d.getMonth() + 1)).slice(-2);
    const dia = ("0" + d.getDate()).slice(-2);
    return `${ano}-${mes}-${dia}`;
}

// A função agora recebe um parâmetro para saber se a mudança veio do calendário
function carregarPagina(veioDoCalendario = false) {
    const chave = obterChaveData(dataAtual);
    
    // Atualiza o texto da folha
    document.getElementById('data-display').innerText = dataAtual.toLocaleDateString('pt-BR', { 
        weekday: 'long', day: 'numeric', month: 'long' 
    });
    
    // Carrega o texto
    textarea.value = localStorage.getItem(chave) || "";

    // SEGREDO: Se você mudou a data pelo calendário, NÃO reescrevemos o valor dele aqui.
    // Isso evita que o tablet "resete" a sua escolha por conflito de milissegundos.
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

// Salvar anotação
textarea.oninput = () => { 
    localStorage.setItem(obterChaveData(dataAtual), textarea.value); 
};

// DEFINIÇÃO DE DATA PELO CALENDÁRIO (Lado do Relógio)
campoData.oninput = function() {
    if (this.value) {
        // Quebra a string AAAA-MM-DD
        const partes = this.value.split('-').map(Number);
        
        // Criamos a data forçando 12:00:00. 
        // Se usar 00:00:00, o fuso horário de Brasília (UTC-3) faz o tablet 
        // entender que é o dia anterior às 21h, travando a mudança de mês.
        dataAtual = new Date(partes[0], partes[1] - 1, partes[2], 12, 0, 0);
        
        // Chamamos a atualização avisando que veio do calendário para não haver conflito
        carregarPagina(true);
    }
};

// Relógio
setInterval(() => {
    const relogio = document.getElementById('relogio');
    if (relogio) relogio.innerText = new Date().toLocaleTimeString('pt-BR');
}, 1000);

// Início
carregarPagina(false);

// Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}