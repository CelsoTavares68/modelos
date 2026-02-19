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
    document.getElementById('data-display').innerText = dataAtual.toLocaleDateString('pt-BR', { 
        weekday: 'long', day: 'numeric', month: 'long' 
    });
    textarea.value = localStorage.getItem(chave) || "";
    
    // Se você selecionou no calendário, não deixamos o script reescrever o valor agora
    if (!veioDoCalendario) {
        campoData.value = chave;
    }
}

// Evento Change (O mais seguro para Tablets)
campoData.onchange = function() {
    if (this.value) {
        const partes = this.value.split('-').map(Number);
        // Meio-dia para evitar erro de fuso
        dataAtual = new Date(partes[0], partes[1] - 1, partes[2], 12, 0, 0);
        
        // Forçamos o fechamento do seletor
        this.blur();
        
        // Pequeno atraso para o tablet respirar
        setTimeout(() => carregarPagina(true), 50);
    }
};

document.getElementById('prevBtn').onclick = () => { dataAtual.setDate(dataAtual.getDate() - 1); carregarPagina(false); };
document.getElementById('nextBtn').onclick = () => { dataAtual.setDate(dataAtual.getDate() + 1); carregarPagina(false); };
textarea.oninput = () => { localStorage.setItem(obterChaveData(dataAtual), textarea.value); };

setInterval(() => {
    const relogio = document.getElementById('relogio');
    if (relogio) relogio.innerText = new Date().toLocaleTimeString('pt-BR');
}, 1000);

carregarPagina(false);