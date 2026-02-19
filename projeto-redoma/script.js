  let dataAtual = new Date();
const folha = document.getElementById('folha-agenda');
const textarea = document.getElementById('anotacao');

// Variável para evitar que a notificação dispare várias vezes no mesmo segundo
let notificacaoDisparadaHoje = false;

 // 1. Ajuste na formatação para ignorar o fuso horário UTC do ISOString
function formatarDataChave(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

// 2. Melhore a lógica de mudança de data no input
document.getElementById('busca-data').addEventListener('change', (e) => {
    if (e.target.value) {
        // Criar a data usando partes separadas evita confusão de fuso horário
        const partes = e.target.value.split('-');
        dataAtual = new Date(partes[0], partes[1] - 1, partes[2]);
        carregarPagina();
    }
});

// 3. Proteja o reset automático para não ignorar sua navegação manual
window.addEventListener('focus', () => {
    const agora = new Date();
    const hojeFormatado = formatarDataChave(agora);
    const exibidaFormatada = formatarDataChave(dataAtual);
});

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

// --- EVENTOS DE INTERAÇÃO (APENAS BOTÕES E INPUTS) ---

// Navegação restrita aos botões laterais
document.getElementById('prevBtn').addEventListener('click', () => mudarDia(-1));
document.getElementById('nextBtn').addEventListener('click', () => mudarDia(1));

textarea.addEventListener('input', () => {
    localStorage.setItem(formatarDataChave(dataAtual), textarea.value);
});

document.getElementById('busca-data').addEventListener('change', (e) => {
    // Força meio-dia para evitar problemas de fuso horário
    dataAtual = new Date(e.target.value + "T12:00:00");
    carregarPagina();
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

    // Verifica se são exatas 07:00:00
    if (horas === 7 && minutos === 0 && segundos === 0) {
        if (!notificacaoDisparadaHoje) {
            const hojeChave = formatarDataChave(agora);
            const conteudo = localStorage.getItem(hojeChave);

            if (conteudo && conteudo.trim() !== "") {
                dispararNotificacao("Agenda Redoma: Bom dia!", "Você tem anotações para hoje. Toque para conferir.");
            }
            notificacaoDisparadaHoje = true;
        }
    }

    // Reseta o gatilho à meia-noite
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

// Registro do Service Worker para PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
    .then(() => console.log("App pronto para instalação!"));
}

// Solicitação de permissão para notificações
if ("Notification" in window) {
    Notification.requestPermission().then(permission => {
        if (permission === "granted") {
            console.log("Notificações ativas!");
        }
    });
}

// Atualiza para a data de hoje sempre que a janela ganhar foco ou o app for reaberto
window.addEventListener('focus', () => {
    const hoje = new Date().toLocaleDateString('pt-BR');
    const exibida = dataAtual.toLocaleDateString('pt-BR');
    
    // Se a data na tela for diferente da data real de hoje, reseta a agenda
    if (hoje !== exibida) {
        dataAtual = new Date();
        carregarPagina();
    }
});