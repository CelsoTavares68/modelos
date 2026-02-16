 let dataAtual = new Date();
const folha = document.getElementById('folha-agenda');
const textarea = document.getElementById('anotacao');

// Variável para evitar que a notificação dispare várias vezes no mesmo segundo
let notificacaoDisparadaHoje = false;

function formatarDataChave(data) {
    return data.toISOString().split('T')[0];
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
    // Força meio-dia para evitar problemas de fuso horário na conversão
    dataAtual = new Date(e.target.value + "T12:00:00");
    carregarPagina();
});

// Suporte a Swipe (Deslizar) no Mobile
let xDown = null;
folha.addEventListener('touchstart', e => xDown = e.touches[0].clientX);
folha.addEventListener('touchend', e => {
    if (!xDown) return;
    let xUp = e.changedTouches[0].clientX;
    let xDiff = xDown - xUp;
    if (Math.abs(xDiff) > 50) xDiff > 0 ? mudarDia(1) : mudarDia(-1);
    xDown = null;
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

    // Verifica se são 07:00:00
    if (horas === 7 && minutos === 0 && segundos === 0) {
        if (!notificacaoDisparadaHoje) {
            const hojeChave = formatarDataChave(agora);
            const conteudo = localStorage.getItem(hojeChave);

            // Só avisa se houver algo escrito para hoje
            if (conteudo && conteudo.trim() !== "") {
                dispararNotificacao("Agenda Redoma: Bom dia!", "Tens anotações para hoje. Toca para conferir.");
            }
            notificacaoDisparadaHoje = true;
        }
    }

    // Reset à meia-noite para o dia seguinte
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
    
    // Verifica o alerta a cada segundo junto com o relógio
    verificarAlertaMatinal();
}

// --- INICIALIZAÇÃO ---

// Inicia o relógio e a página
atualizarRelogio();
setInterval(atualizarRelogio, 1000);
carregarPagina();

// Registo do Service Worker para PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
    .then(() => console.log("App pronto para instalação!"));
}

// Pedido de permissão para notificações
if ("Notification" in window) {
    Notification.requestPermission().then(permission => {
        if (permission === "granted") {
            console.log("Notificações permitidas!");
        }
    });
}