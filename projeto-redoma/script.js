 // Força a data inicial sempre como o momento do carregamento
let dataAtual = new Date();
const folha = document.getElementById('folha-agenda');
const textarea = document.getElementById('anotacao');
let notificacaoDisparadaHoje = false;

// 1. FUNÇÃO DE DATA À PROVA DE ERROS (Não usa ISOString para evitar fuso horário)
function obterChaveData(d) {
    const ano = d.getFullYear();
    const mes = ("0" + (d.getMonth() + 1)).slice(-2);
    const dia = ("0" + d.getDate()).slice(-2);
    return `${ano}-${mes}-${dia}`;
}

// 2. CARREGAMENTO DA PÁGINA
function carregarPagina() {
    const chave = obterChaveData(dataAtual);
    
    // Atualiza o texto da data no topo
    document.getElementById('data-display').innerText = dataAtual.toLocaleDateString('pt-BR', { 
        weekday: 'long', day: 'numeric', month: 'long' 
    });
    
    // Carrega o texto salvo
    textarea.value = localStorage.getItem(chave) || "";
    
    // Sincroniza o valor do calendário
    document.getElementById('busca-data').value = chave;
}

// 3. NAVEGAÇÃO PELAS SETAS
function mudarDia(delta) {
    dataAtual.setDate(dataAtual.getDate() + delta);
    carregarPagina();
}

document.getElementById('prevBtn').onclick = () => mudarDia(-1);
document.getElementById('nextBtn').onclick = () => mudarDia(1);

// 4. SALVAMENTO AUTOMÁTICO
textarea.oninput = () => {
    localStorage.setItem(obterChaveData(dataAtual), textarea.value);
};

// 5. SOLUÇÃO DEFINITIVA PARA O CALENDÁRIO NO MOBILE
// Usamos 'oninput' e 'onchange' juntos para garantir que qualquer sistema (Android/iOS) detecte
const inputData = document.getElementById('busca-data');

const tratarMudancaData = (e) => {
    const novoValor = e.target.value;
    if (novoValor) {
        const partes = novoValor.split('-');
        // Criamos a data garantindo que seja meio-dia para evitar pulo de dia por fuso
        dataAtual = new Date(partes[0], partes[1] - 1, partes[2], 12, 0, 0);
        carregarPagina();
    }
};

inputData.oninput = tratarMudancaData;
inputData.onchange = tratarMudancaData;

// 6. RELÓGIO E NOTIFICAÇÃO (Sem o evento de 'focus' que estava quebrando tudo)
function verificarAlerta() {
    const agora = new Date();
    if (agora.getHours() === 7 && agora.getMinutes() === 0 && agora.getSeconds() === 0) {
        if (!notificacaoDisparadaHoje) {
            const textoHoje = localStorage.getItem(obterChaveData(agora));
            if (textoHoje && textoHoje.trim() !== "") {
                if (Notification.permission === "granted") {
                    navigator.serviceWorker.ready.then(reg => {
                        reg.showNotification("Agenda Redoma", { body: "Você tem tarefas para hoje!" });
                    });
                }
            }
            notificacaoDisparadaHoje = true;
        }
    }
    if (agora.getHours() === 0) notificacaoDisparadaHoje = false;
}

setInterval(() => {
    const agora = new Date();
    const relogio = document.getElementById('relogio');
    if (relogio) relogio.innerText = agora.toLocaleTimeString('pt-BR');
    verificarAlerta();
}, 1000);

// Inicialização
carregarPagina();

// PWA e Notificações
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
if ("Notification" in window) Notification.requestPermission();