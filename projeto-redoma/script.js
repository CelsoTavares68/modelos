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

    if (!origemCalendario) {
        campoData.value = chave;
    }
}

// Corrigido: Evento 'input' é mais rápido que 'change' para calendários mobile
campoData.addEventListener('input', function() {
    if (this.value) {
        const partes = this.value.split('-').map(Number);
        // Criamos a data e forçamos o meio-dia para evitar erros de fuso horário
        dataAtual = new Date(partes[0], partes[1] - 1, partes[2], 12, 0, 0);
        
        // Pequeno atraso para o navegador mobile processar a escolha antes de atualizar a tela
        setTimeout(() => {
            carregarPagina(true);
            this.blur(); 
        }, 50);
    }
});

document.getElementById('prevBtn').onclick = () => { dataAtual.setDate(dataAtual.getDate() - 1); carregarPagina(false); };
document.getElementById('nextBtn').onclick = () => { dataAtual.setDate(dataAtual.getDate() + 1); carregarPagina(false); };
textarea.oninput = () => { localStorage.setItem(obterChaveData(dataAtual), textarea.value); };

setInterval(() => {
    const relogio = document.getElementById('relogio');
    if (relogio) relogio.innerText = new Date().toLocaleTimeString('pt-BR');
}, 1000);

carregarPagina(false);