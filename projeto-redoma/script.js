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
    
    // Evita loop infinito no mobile
    if (campoData.value !== chave) {
        campoData.value = chave;
    }
}

// Navegação
document.getElementById('prevBtn').onclick = () => { dataAtual.setDate(dataAtual.getDate() - 1); carregarPagina(); };
document.getElementById('nextBtn').onclick = () => { dataAtual.setDate(dataAtual.getDate() + 1); carregarPagina(); };

textarea.oninput = () => { localStorage.setItem(obterChaveData(dataAtual), textarea.value); };

// RESOLUÇÃO PARA O CALENDÁRIO MOBILE
campoData.onchange = function() {
    if (this.value) {
        // Quebramos a string AAAA-MM-DD
        const partes = this.value.split('-');
        // Criamos a data explicitamente como LOCAL às 12:00:00
        // Isso impede que o fuso horário (UTC-3) mude o dia ou mês selecionado
        dataAtual = new Date(
            parseInt(partes[0]), 
            parseInt(partes[1]) - 1, 
            parseInt(partes[2]), 
            12, 0, 0
        );
        carregarPagina();
    }
};

// Relógio
setInterval(() => {
    const relogio = document.getElementById('relogio');
    if (relogio) relogio.innerText = new Date().toLocaleTimeString('pt-BR');
}, 1000);

carregarPagina();

// Registro único do Service Worker (v106 para bater com seu sw.js e index)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js?v=107');
}