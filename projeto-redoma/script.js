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
    
    // Atualiza o texto visual
    document.getElementById('data-display').innerText = dataAtual.toLocaleDateString('pt-BR', { 
        weekday: 'long', day: 'numeric', month: 'long' 
    });
    
    // Carrega o texto
    textarea.value = localStorage.getItem(chave) || "";

    // ATUALIZA O CALENDÁRIO SEM CONFLITO
    const campoData = document.getElementById('busca-data');
    if (campoData) {
        campoData.value = chave;
    }
}

// Navegação por botões
document.getElementById('prevBtn').onclick = () => { dataAtual.setDate(dataAtual.getDate() - 1); carregarPagina(); };
document.getElementById('nextBtn').onclick = () => { dataAtual.setDate(dataAtual.getDate() + 1); carregarPagina(); };

textarea.oninput = () => { localStorage.setItem(obterChaveData(dataAtual), textarea.value); };

// ESCUTADOR DE EVENTO DIRETO (MÉTODO ROBUSTO)
document.addEventListener('change', function(e) {
    if (e.target && e.target.id === 'busca-data') {
        const valor = e.target.value;
        if (valor) {
            const partes = valor.split('-').map(Number);
            // Meio-dia para evitar bug de fuso horário
            dataAtual = new Date(partes[0], partes[1] - 1, partes[2], 12, 0, 0);
            
            // Forçamos o navegador a "soltar" o campo antes de carregar
            e.target.blur();
            
            // Pequeno atraso para o Android fechar o seletor nativo
            setTimeout(carregarPagina, 100);
        }
    }
});

// Relógio simples
setInterval(() => {
    const relogio = document.getElementById('relogio');
    if (relogio) relogio.innerText = new Date().toLocaleTimeString('pt-BR');
}, 1000);

// Inicia
carregarPagina();