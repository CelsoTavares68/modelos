 let dataAtual = new Date();
const textarea = document.getElementById('anotacao');
const campoData = document.getElementById('busca-data');
const displayData = document.getElementById('data-display');

function obterChaveData(d) {
    const ano = d.getFullYear();
    const mes = ("0" + (d.getMonth() + 1)).slice(-2);
    const dia = ("0" + d.getDate()).slice(-2);
    return `${ano}-${mes}-${dia}`;
}

function carregarPagina(veioDoCalendario = false) {
    const chave = obterChaveData(dataAtual);
    
    // FORÇA A MUDANÇA NA REDOMA
    const textoData = dataAtual.toLocaleDateString('pt-BR', { 
        weekday: 'long', day: 'numeric', month: 'long' 
    });
    displayData.innerText = textoData.charAt(0).toUpperCase() + textoData.slice(1);
    
    textarea.value = localStorage.getItem(chave) || "";

    // SÓ atualiza o valor do input se NÃO veio do calendário
    if (!veioDoCalendario) {
        campoData.value = chave;
    }
}

// EVENTO PARA O TABLET
campoData.addEventListener('change', function() {
    if (this.value) {
        const partes = this.value.split('-').map(Number);
        // 12:00:00 evita que o fuso horário mude o dia no Brasil
        dataAtual = new Date(partes[0], partes[1] - 1, partes[2], 12, 0, 0);
        
        this.blur(); // Fecha o teclado/calendário no Android
        
        setTimeout(() => {
            carregarPagina(true);
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