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
    
    // ATUALIZAÇÃO FORÇADA DO TEXTO NA REDOMA
    const opcoes = { weekday: 'long', day: 'numeric', month: 'long' };
    const textoFormatado = dataAtual.toLocaleDateString('pt-BR', opcoes);
    displayData.innerText = textoFormatado.charAt(0).toUpperCase() + textoFormatado.slice(1);
    
    // Carrega a anotação
    textarea.value = localStorage.getItem(chave) || "";

    // SÓ atualiza o valor do seletor se NÃO veio do calendário
    if (!veioDoCalendario) {
        campoData.value = chave;
    }
}

// Escutador Robusto para Calendário no Tablet
campoData.addEventListener('input', function() {
    if (this.value) {
        const partes = this.value.split('-').map(Number);
        // Meio-dia para evitar erros de fuso horário no mobile
        dataAtual = new Date(partes[0], partes[1] - 1, partes[2], 12, 0, 0);
        
        // Força a atualização da redoma imediatamente
        carregarPagina(true);
        
        // Remove o foco para o Android confirmar a escolha e fechar o seletor
        this.blur();
    }
});

// Botões de navegação
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

setInterval(() => {
    const relogio = document.getElementById('relogio');
    if (relogio) relogio.innerText = new Date().toLocaleTimeString('pt-BR');
}, 1000);

// Inicialização
carregarPagina(false);