 let dataAtual = new Date();
const textarea = document.getElementById('anotacao');
const campoData = document.getElementById('busca-data');

function obterChaveData(d) {
    const ano = d.getFullYear();
    const mes = ("0" + (d.getMonth() + 1)).slice(-2);
    const dia = ("0" + d.getDate()).slice(-2);
    return `${ano}-${mes}-${dia}`;
}

// Adicionamos um parâmetro para saber se a mudança veio do calendário
function carregarPagina(origemCalendario = false) {
    const chave = obterChaveData(dataAtual);
    
    document.getElementById('data-display').innerText = dataAtual.toLocaleDateString('pt-BR', { 
        weekday: 'long', day: 'numeric', month: 'long' 
    });
    
    textarea.value = localStorage.getItem(chave) || "";

    // A MUDANÇA ESTÁ AQUI:
    // Se a mudança veio do calendário, NÃO forçamos o valor para o campo.
    // Isso permite que o Android termine de processar a escolha sem ser interrompido.
    if (!origemCalendario) {
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

// Evento de mudança no Calendário
campoData.addEventListener('change', function() {
    if (this.value) {
        const partes = this.value.split('-').map(Number);
        // Usamos 12:00 para evitar que fusos horários joguem a data para o dia anterior
        dataAtual = new Date(partes[0], partes[1] - 1, partes[2], 12, 0, 0);
        
        // Avisamos que a origem é o calendário (true)
        carregarPagina(true);
        
        // Forçamos o campo a perder o foco para confirmar a seleção no mobile
        this.blur();
    }
});

// Relógio
setInterval(() => {
    const relogio = document.getElementById('relogio');
    if (relogio) relogio.innerText = new Date().toLocaleTimeString('pt-BR');
}, 1000);

carregarPagina(false);