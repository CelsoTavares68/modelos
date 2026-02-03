// script.js (localStorage)
// Mantive suas funções e acrescentei persistência via localStorage

const STORAGE_KEY = 'agendamentos_v1';

function agendar() {
    const nome = document.getElementById('nome').value;
    const servico = document.getElementById('servico').value;
    const data = document.getElementById('data').value;
    const hora = document.getElementById('hora').value;

    if(!nome || !servico || !data || !hora) {
        alert("Preencha todos os campos!");
        return;
    }

    const timestamp = new Date(`${data}T${hora}`).getTime();
    const agendamento = { nome, servico, data, hora, timestamp };

    // salva localmente
    salvarLocal(agendamento);

    // renderiza (a função limpar e inserção de card são iguais)
    inserirCard(agendamento);

    limparCampos();
}

function salvarLocal(agendamento) {
    const arr = carregarLocal();
    arr.push(agendamento);
    // ordenar por timestamp asc
    arr.sort((a,b) => a.timestamp - b.timestamp);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

function carregarLocal() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try { return JSON.parse(raw); } catch(e) { return []; }
}

function inserirCard(ag) {
    const lista = document.getElementById('listaAgendamentos');
    // cria o card da mesma forma que antes
    const card = document.createElement('div');
    card.className = "agendamento-card";
    card.dataset.timestamp = ag.timestamp;

    const partesData = ag.data.split("-");
    const dataBR = `${partesData[2]}/${partesData[1]}/${partesData[0]}`;

    card.innerHTML = `
      <p><strong>${ag.nome}</strong> agendou <strong>${ag.servico}</strong></p>
      <p> Dia ${dataBR} às ${ag.hora} horas</p>`;

    // inserir ordenado
    let inserido = false;
    const cardsExistentes = lista.querySelectorAll('.agendamento-card');
    for (let c of cardsExistentes) {
        if (ag.timestamp < parseInt(c.dataset.timestamp)) {
            lista.insertBefore(card, c);
            inserido = true;
            break;
        }
    }
    if (!inserido) lista.appendChild(card);
}

function carregarEExibirLocal() {
    const arr = carregarLocal();
    const lista = document.getElementById('listaAgendamentos');
    lista.innerHTML = '<h2>Agendamentos:</h2>';
    arr.forEach(ag => inserirCard(ag));
}

function limparCampos() {
   document.getElementById('nome').value = '';
   document.getElementById('servico').value = '';
   document.getElementById('data').value = '';
   document.getElementById('hora').value = '';
}

// inicializa
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', carregarEExibirLocal);
} else {
    carregarEExibirLocal();
}