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
    document.getElementById('data-display').innerText = dataAtual.toLocaleDateString('pt-BR', { 
        weekday: 'long', day: 'numeric', month: 'long' 
    });
    textarea.value = localStorage.getItem(chave) || "";
    
    // SÓ atualiza o valor do calendário se a mudança NÃO veio dele próprio
    // Isso evita que o tablet "resete" a data enquanto você tenta mudar o mês
    if (!origemCalendario) {
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

// MUDANÇA CRÍTICA: Usamos 'change' em vez de 'input' para o Tablet
// O 'change' só dispara quando você clica em "OK" ou "Definir" no calendário
campoData.onchange = function() {
    if (this.value) {
        const partes = this.value.split('-').map(Number);
        // Criamos a data ao meio-dia para o fuso horário não quebrar o mês
        dataAtual = new Date(partes[0], partes[1] - 1, partes[2], 12, 0, 0);
        carregarPagina(true); // Indica que veio do calendário
    }
};

setInterval(() => {
    const relogio = document.getElementById('relogio');
    if (relogio) relogio.innerText = new Date().toLocaleTimeString('pt-BR');
}, 1000);

carregarPagina(false);

// REGISTRO DO SERVICE WORKER (v107 para forçar a limpeza total)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js?v=107');
}