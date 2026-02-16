  let dataAtual = new Date();
const folha = document.getElementById('folha-agenda');
const textarea = document.getElementById('anotacao');

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

// Eventos
document.getElementById('prevBtn').addEventListener('click', () => mudarDia(-1));
document.getElementById('nextBtn').addEventListener('click', () => mudarDia(1));
textarea.addEventListener('input', () => {
    localStorage.setItem(formatarDataChave(dataAtual), textarea.value);
});
document.getElementById('busca-data').addEventListener('change', (e) => {
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

function atualizarRelogio() {
    const agora = new Date();
    const relogioElemento = document.getElementById('relogio');
    if (relogioElemento) {
        relogioElemento.innerText = agora.toLocaleTimeString('pt-BR');
    }
}

// Inicia o relógio imediatamente e depois a cada segundo
atualizarRelogio();
setInterval(atualizarRelogio, 1000);

carregarPagina();

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
    .then(() => console.log("App pronto para instalação!"));
}