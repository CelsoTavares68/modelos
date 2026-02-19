 let dataAtual = new Date();
const folha = document.getElementById('folha-agenda');
const textarea = document.getElementById('anotacao');

let notificacaoDisparadaHoje = false;

// Formatação que ignora fusos horários problemáticos no mobile
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

document.getElementById('prevBtn').addEventListener('click', () => mudarDia(-1));
document.getElementById('nextBtn').addEventListener('click', () => mudarDia(1));

textarea.addEventListener('input', () => {
    localStorage.setItem(formatarDataChave(dataAtual), textarea.value);
});

document.getElementById('busca-data').addEventListener('change', (e) => {
    if (e.target.value) {
        const partes = e.target.value.split('-');
        // Criar a data por partes é o método mais seguro para Tablets/Celulares
        dataAtual = new Date(partes[0], partes[1] - 1, partes[2]);
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
                vibrate: [200, 100, 200],
                badge: 'icon.png'
            });
        });
    }
}

function verificarAlertaMatinal() {
    const agora = new Date();
    const horas = agora.getHours();
    const minutos = agora.getMinutes();
    const segundos = agora.getSeconds();

    // Notificação às 07:00
    if (horas === 7 && minutos === 0 && segundos === 0) {
        if (!notificacaoDisparadaHoje) {
            const hojeChave = formatarDataChave(agora);
            const conteudo = localStorage.getItem(hojeChave);
            if (conteudo && conteudo.trim() !== "") {
                dispararNotificacao("Agenda Redoma: Bom dia!", "Você tem anotações para hoje.");
            }
            notificacaoDisparadaHoje = true;
        }
    }

    if (horas === 0 && minutos === 0 && segundos === 0) {
        notificacaoDisparadaHoje = false;
        
        // AUTO-UPDATE: Se você estiver na página de "Hoje" e passar da meia-noite, 
        // a agenda vira a folha sozinha para o novo dia.
        const hojeReal = formatarDataChave(new Date());
        if (formatarDataChave(dataAtual) !== hojeReal) {
             dataAtual = new Date();
             carregarPagina();
        }
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