 let dataAtual = new Date();
const folha = document.getElementById('folha-agenda');
const textarea = document.getElementById('anotacao');

let notificacaoDisparadaHoje = false;

// Função de formatação que evita qualquer erro de fuso horário
function formatarDataChave(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

function carregarPagina() {
    const chave = formatarDataChave(dataAtual);
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

// --- EVENTOS DE INTERAÇÃO ---

document.getElementById('prevBtn').addEventListener('click', (e) => {
    e.preventDefault();
    mudarDia(-1);
});

document.getElementById('nextBtn').addEventListener('click', (e) => {
    e.preventDefault();
    mudarDia(1);
});

textarea.addEventListener('input', () => {
    localStorage.setItem(formatarDataChave(dataAtual), textarea.value);
});

// TROCA DE 'CHANGE' POR 'INPUT' - Mais garantido em Tablets e Celulares
document.getElementById('busca-data').addEventListener('input', (e) => {
    const valor = e.target.value;
    if (valor) {
        const partes = valor.split('-');
        // Forçamos a criação da data local pura
        dataAtual = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
        carregarPagina();
    }
});

// --- SISTEMA DE HORÁRIO E NOTIFICAÇÕES ---

function dispararNotificacao(titulo, mensagem) {
    if (Notification.permission === "granted") {
        navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(titulo, {
                body: mensagem,
                icon: 'icon.png',
                vibrate: [200, 100, 200]
            });
        });
    }
}

function verificarAlertaMatinal() {
    const agora = new Date();
    const horas = agora.getHours();
    const minutos = agora.getMinutes();
    const segundos = agora.getSeconds();

    if (horas === 7 && minutos === 0 && segundos === 0) {
        if (!notificacaoDisparadaHoje) {
            const hojeChave = formatarDataChave(agora);
            const conteudo = localStorage.getItem(hojeChave);
            if (conteudo && conteudo.trim() !== "") {
                dispararNotificacao("Agenda Redoma", "Você tem anotações para hoje.");
            }
            notificacaoDisparadaHoje = true;
        }
    }

    if (horas === 0 && minutos === 0 && segundos === 0) {
        notificacaoDisparadaHoje = false;
    }
}

function atualizarRelogio() {
    const agora = new Date();
    const relogioElemento = document.getElementById('relogio');
    if (relogioElemento) {
        relogioElemento.innerText = agora.toLocaleTimeString('pt-BR');
    }
    verificarAlertaMatinal();
}

// --- INICIALIZAÇÃO ---

atualizarRelogio();
setInterval(atualizarRelogio, 1000);
carregarPagina();

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}

if ("Notification" in window) {
    Notification.requestPermission();
}