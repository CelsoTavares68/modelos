 // 1. Inicialização de Variáveis
let dataAtual = new Date();
const folha = document.getElementById('folha-agenda');
const textarea = document.getElementById('anotacao');
let notificacaoDisparadaHoje = false;

// 2. Função de Formatação de Data (À prova de erros de fuso horário)
function obterChaveData(d) {
    const ano = d.getFullYear();
    const mes = ("0" + (d.getMonth() + 1)).slice(-2);
    const dia = ("0" + d.getDate()).slice(-2);
    return `${ano}-${mes}-${dia}`; // Retorna formato AAAA-MM-DD local
}

// 3. Carregamento da Interface
function carregarPagina() {
    const chave = obterChaveData(dataAtual);
    
    // Atualiza o texto da data no topo (Ex: terça-feira, 19 de fevereiro)
    document.getElementById('data-display').innerText = dataAtual.toLocaleDateString('pt-BR', { 
        weekday: 'long', day: 'numeric', month: 'long' 
    });
    
    // Carrega o texto salvo no armazenamento local
    textarea.value = localStorage.getItem(chave) || "";
    
    // Sincroniza o valor do seletor de data (calendário)
    document.getElementById('busca-data').value = chave;
}

// 4. Navegação (Botões Laterais)
document.getElementById('prevBtn').onclick = () => { 
    dataAtual.setDate(dataAtual.getDate() - 1); 
    carregarPagina(); 
};

document.getElementById('nextBtn').onclick = () => { 
    dataAtual.setDate(dataAtual.getDate() + 1); 
    carregarPagina(); 
};

// 5. Salvar Automaticamente ao Digitar
textarea.oninput = () => { 
    localStorage.setItem(obterChaveData(dataAtual), textarea.value); 
};

// 6. Lógica do Calendário (Ajustada para Mobile/Tablet)
const campoData = document.getElementById('busca-data');

// O evento 'input' é o mais fiável em ecrãs tácteis para detetar a mudança imediata
campoData.addEventListener('input', function(e) {
    const valor = e.target.value; 
    if (valor) {
        // Divide a string "AAAA-MM-DD" para evitar conversões automáticas de fuso horário
        const partes = valor.split('-').map(Number);
        
        // Cria o objeto de data forçando as 12:00h
        // Isso impede que o fuso horário (ex: Brasil UTC-3) recue o dia para a véspera
        dataAtual = new Date(partes[0], partes[1] - 1, partes[2], 12, 0, 0);
        
        carregarPagina();
    }
});

// 7. Relógio e Verificação de Alertas
function verificarAlerta() {
    const agora = new Date();
    // Alerta programado para as 07:00 da manhã
    if (agora.getHours() === 7 && agora.getMinutes() === 0 && agora.getSeconds() === 0) {
        if (!notificacaoDisparadaHoje) {
            const textoHoje = localStorage.getItem(obterChaveData(agora));
            if (textoHoje && textoHoje.trim() !== "") {
                if (Notification.permission === "granted") {
                    navigator.serviceWorker.ready.then(reg => {
                        reg.showNotification("Agenda Redoma", { 
                            body: "Tens tarefas anotadas para hoje!",
                            icon: "icon.png"
                        });
                    });
                }
            }
            notificacaoDisparadaHoje = true;
        }
    }
    // Reseta o gatilho da notificação à meia-noite
    if (agora.getHours() === 0) notificacaoDisparadaHoje = false;
}

// Atualiza o relógio a cada segundo
setInterval(() => {
    const agora = new Date();
    const relogio = document.getElementById('relogio');
    if (relogio) relogio.innerText = agora.toLocaleTimeString('pt-BR');
    verificarAlerta();
}, 1000);

// 8. Inicialização ao abrir o site
carregarPagina();

// 9. Registo do Service Worker para PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
    .then(reg => console.log("Service Worker ativo!"))
    .catch(err => console.log("Erro no SW:", err));
}