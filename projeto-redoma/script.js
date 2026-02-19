 let dataAtual = new Date();
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

document.getElementById('prevBtn').onclick = () => { dataAtual.setDate(dataAtual.getDate() - 1); carregarPagina(); };
document.getElementById('nextBtn').onclick = () => { dataAtual.setDate(dataAtual.getDate() + 1); carregarPagina(); };

textarea.oninput = () => { localStorage.setItem(obterChaveData(dataAtual), textarea.value); };

// LÓGICA DE BUSCA: Forçamos o evento 'input' para mobile
document.getElementById('busca-data').addEventListener('input', function(e) {
    if (this.value) {
        const p = this.value.split('-').map(Number);
        // Criamos a data ao meio-dia para o fuso horário não "pular" o dia
        dataAtual = new Date(p[0], p[1] - 1, p[2], 12, 0, 0);
        carregarPagina();
    }
});

setInterval(() => {
    const relogio = document.getElementById('relogio');
    if (relogio) relogio.innerText = new Date().toLocaleTimeString('pt-BR');
}, 1000);

carregarPagina();

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js?v=100');
}