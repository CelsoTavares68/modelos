 let dataAtual = new Date();
const textarea = document.getElementById('anotacao');
const campoData = document.getElementById('busca-data');

function obterChaveData(d) {
    const ano = d.getFullYear();
    const mes = ("0" + (d.getMonth() + 1)).slice(-2);
    const dia = ("0" + d.getDate()).slice(-2);
    return `${ano}-${mes}-${dia}`;
}

function carregarPagina(pularInput = false) {
    const chave = obterChaveData(dataAtual);
    
    // Atualiza o texto da folha
    document.getElementById('data-display').innerText = dataAtual.toLocaleDateString('pt-BR', { 
        weekday: 'long', day: 'numeric', month: 'long' 
    });
    
    // Carrega o texto
    textarea.value = localStorage.getItem(chave) || "";

    // SEGREDO: Se pularInput for true, o JS NÃO mexe no calendário.
    // Isso evita que o Android entre em loop e resete a data.
    if (!pularInput) {
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

textarea.oninput = () => { 
    localStorage.setItem(obterChaveData(dataAtual), textarea.value); 
};

// CORREÇÃO FINAL PARA O CALENDÁRIO (TABLET)
campoData.onchange = function() {
    if (this.value) {
        const valorData = this.value; // Guarda o que você escolheu
        
        // Damos 150ms para o Android processar o fechamento do calendário
        // antes de mudarmos a data no sistema.
        setTimeout(() => {
            const partes = valorData.split('-').map(Number);
            // Criamos a data ao meio-dia (12:00) para matar o erro de fuso horário
            dataAtual = new Date(partes[0], partes[1] - 1, partes[2], 12, 0, 0);
            
            // Carregamos a página pedindo para o JS não mexer no valor do input
            carregarPagina(true);
        }, 150);
    }
};

// Relógio
setInterval(() => {
    const relogio = document.getElementById('relogio');
    if (relogio) relogio.innerText = new Date().toLocaleTimeString('pt-BR');
}, 1000);

// Inicia a página
carregarPagina(false);