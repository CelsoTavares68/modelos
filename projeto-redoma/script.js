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
    
    // Atualiza o texto visual
    document.getElementById('data-display').innerText = dataAtual.toLocaleDateString('pt-BR', { 
        weekday: 'long', day: 'numeric', month: 'long' 
    });
    
    textarea.value = localStorage.getItem(chave) || "";

    // SÓ mexemos no valor do calendário se a mudança veio dos botões ou inicialização
    if (!veioDoCalendario) {
        campoData.value = chave;
    }
}

// Navegação por botões (funciona bem em ambos)
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

// A SOLUÇÃO FINAL PARA O TABLET:
campoData.onchange = function() {
    if (this.value) {
        const valorSelecionado = this.value;
        
        // Damos 100 milissegundos para o tablet fechar a janela do calendário
        // antes de forçarmos a mudança da página. Isso evita o travamento.
        setTimeout(() => {
            const partes = valorSelecionado.split('-').map(Number);
            // Criamos a data ao meio-dia para o fuso horário não interferir
            dataAtual = new Date(partes[0], partes[1] - 1, partes[2], 12, 0, 0);
            carregarPagina(true);
        }, 100);
    }
};

setInterval(() => {
    const relogio = document.getElementById('relogio');
    if (relogio) relogio.innerText = new Date().toLocaleTimeString('pt-BR');
}, 1000);

carregarPagina(false);

// Registo simplificado (sem versões aqui para evitar erros de cache)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}