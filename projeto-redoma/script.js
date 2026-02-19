  let dataAtual = new Date();
const folha = document.getElementById('folha-agenda');
const textarea = document.getElementById('anotacao');
let notificacaoDisparadaHoje = false;

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

function mudarDia(delta) {
    dataAtual.setDate(dataAtual.getDate() + delta);
    carregarPagina();
}

document.getElementById('prevBtn').onclick = () => mudarDia(-1);
document.getElementById('nextBtn').onclick = () => mudarDia(1);

textarea.oninput = () => {
    localStorage.setItem(obterChaveData(dataAtual), textarea.value);
};

// --- NOVA LÓGICA PARA MOBILE ---
const campoData = document.getElementById('busca-data');

// No mobile, o evento 'change' às vezes falha, usamos um listener direto
campoData.addEventListener('change', function() {
    if (this.value) {
        const p = this.value.split('-');
        // Criamos a data e forçamos o carregamento imediato
        dataAtual = new Date(p[0], p[1] - 1, p[2], 12, 0, 0);
        carregarPagina();
    }
});

// Relógio e Notificações (Sem interferência de foco)
function verificarAlerta() {
    const agora = new Date();
    if (agora.getHours() === 7 && agora.getMinutes() === 0 && agora.getSeconds() === 0) {
        if (!notificacaoDisparadaHoje) {
            const texto = localStorage.getItem(obterChaveData(agora));
            if (texto && texto.trim() !== "") {
                navigator.serviceWorker.ready.then(reg => {
                    reg.showNotification("Agenda Redoma", { body: "Tens tarefas para hoje!" });
                });
            }
            notificacaoDisparadaHoje = true;
        }
    }
    if (agora.getHours() === 0) notificacaoDisparadaHoje = false;
}

setInterval(() => {
    const agora = new Date();
    document.getElementById('relogio').innerText = agora.toLocaleTimeString('pt-BR');
    verificarAlerta();
}, 1000);

carregarPagina();

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(reg => {
        reg.onupdatefound = () => {
            const installingWorker = reg.installing;
            installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // Isso avisa o navegador para atualizar a página assim que o código novo baixar
                    window.location.reload();
                }
            };
        };
    });
}