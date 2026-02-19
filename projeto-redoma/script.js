 let dataAtual = new Date();
const folha = document.getElementById('folha-agenda');
const textarea = document.getElementById('anotacao');

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
    document.getElementById('busca-data').value = chave;
}

// Navegação simplificada
document.getElementById('prevBtn').onclick = () => { dataAtual.setDate(dataAtual.getDate() - 1); carregarPagina(); };
document.getElementById('nextBtn').onclick = () => { dataAtual.setDate(dataAtual.getDate() + 1); carregarPagina(); };

textarea.oninput = () => { localStorage.setItem(obterChaveData(dataAtual), textarea.value); };

// O SEGREDO PARA O MOBILE:
document.getElementById('busca-data').onchange = function(e) {
    if (e.target.value) {
        const p = e.target.value.split('-');
        // Criamos a data exatamente às 12h para o fuso horário não estragar a mudança
        dataAtual = new Date(p[0], p[1] - 1, p[2], 12, 0, 0);
        carregarPagina();
    }
};

setInterval(() => {
    const agora = new Date();
    const relogio = document.getElementById('relogio');
    if (relogio) relogio.innerText = agora.toLocaleTimeString('pt-BR');
}, 1000);

carregarPagina();

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}