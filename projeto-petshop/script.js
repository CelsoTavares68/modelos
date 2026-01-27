 let petAtualAtendimento = null;
let idPetEmEdicao = null;

const TABELA_PRECOS = {
    "Banho": 50.00,
    "Tosa": 60.00,
    "Banho e Tosa": 100.00,
    "Veterinario": 150.00
};

// ==========================================
// INICIALIZAÇÃO
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const hoje = new Date().toISOString().split('T')[0];
    if (document.getElementById('dataConsulta')) document.getElementById('dataConsulta').value = hoje;
    if (document.getElementById('dataAgendamento')) document.getElementById('dataAgendamento').value = hoje;
    if (document.getElementById('filtroDataAgenda')) document.getElementById('filtroDataAgenda').value = hoje;

    // Lógica do Botão Exibir Lista de Pets
    const btnToggle = document.getElementById('btnToggleLista');
    const containerLista = document.getElementById('containerListaPets');
    if (btnToggle && containerLista) {
        btnToggle.onclick = function() {
            if (containerLista.style.display === 'none') {
                containerLista.style.display = 'block';
                atualizarTabelaMembros(); // Carrega os dados ao abrir
            } else {
                containerLista.style.display = 'none';
            }
        };
    }

    window.addEventListener('storage', () => {
        carregarTabelas();
        atualizarHistoricoPainel();
    });

    carregarTabelas();
    atualizarTabelaMembros();
    atualizarHistoricoPainel();
    
    setInterval(() => {
        const r = document.getElementById('relogioMonitor');
        if(r) r.innerText = new Date().toLocaleTimeString();
    }, 1000);
});

// ==========================================
// CADASTRO E EDIÇÃO
// ==========================================
function salvarCadastro() {
    const nome = document.getElementById('inome').value.trim().toUpperCase();
    const raca = document.getElementById('documento').value.trim();
    const idade = document.getElementById('endereco').value.trim();

    if (!nome) { alert("Nome do Pet é obrigatório!"); return; }

    let pets = JSON.parse(localStorage.getItem('pet_cadastros')) || [];

    if (idPetEmEdicao) {
        const idx = pets.findIndex(p => p.id === idPetEmEdicao);
        if (idx !== -1) {
            pets[idx] = { ...pets[idx], nome, raca, idade };
        }
        idPetEmEdicao = null;
        document.querySelector('.btn-salvar').innerText = "Cadastrar Pet";
    } else {
        pets.push({
            id: Math.floor(1000 + Math.random() * 9000),
            nome, raca, idade,
            dataCadastro: new Date().toLocaleDateString()
        });
    }

    localStorage.setItem('pet_cadastros', JSON.stringify(pets));
    document.getElementById('inome').value = "";
    document.getElementById('documento').value = "";
    document.getElementById('endereco').value = "";
    
    atualizarTabelaMembros();
    alert("Dados do Pet salvos!");
}

function prepararEdicao(id) {
    const pets = JSON.parse(localStorage.getItem('pet_cadastros')) || [];
    const p = pets.find(pet => pet.id === id);
    if (p) {
        document.getElementById('inome').value = p.nome;
        document.getElementById('documento').value = p.raca;
        document.getElementById('endereco').value = p.idade;
        idPetEmEdicao = id;
        document.querySelector('.btn-salvar').innerText = "Atualizar Cadastro";
        window.scrollTo(0,0);
    }
}

function atualizarTabelaMembros() {
    const pets = JSON.parse(localStorage.getItem('pet_cadastros')) || [];
    const corpo = document.getElementById('lista-corpo');
    if (corpo) {
        corpo.innerHTML = pets.map(p => `
            <tr>
                <td>${p.id}</td>
                <td><b>${p.nome}</b></td>
                <td>${p.raca}</td>
                <td>
                    <button onclick="gerarCarteirinha(${p.id})" style="background:#3498db; color:white;">🖨️</button>
                    <button onclick="prepararEdicao(${p.id})" style="background:#f39c12; color:white;">Ed</button>
                </td>
            </tr>`).join('');
    }
}

// ==========================================
// AGENDAMENTO E RECEPÇÃO
// ==========================================
function agendar() {
    const busca = document.getElementById('nome').value.trim().toUpperCase();
    const servico = document.getElementById('especialidade').value;
    const data = document.getElementById('dataAgendamento').value;
    const hora = document.getElementById('hora').value;

    if (!busca || !data || !hora) { alert("Preencha todos os campos!"); return; }

    const cadastros = JSON.parse(localStorage.getItem('pet_cadastros')) || [];
    const pet = cadastros.find(p => p.id.toString() === busca || p.nome === busca);

    let agendados = JSON.parse(localStorage.getItem('pet_agendados')) || [];
    agendados.push({
        id: Date.now(),
        nome: pet ? pet.nome : busca,
        raca: pet ? pet.raca : "N/I",
        idade: pet ? pet.idade : "N/I",
        servico: servico,
        preco: TABELA_PRECOS[servico] || 0,
        data: data,
        hora: hora
    });

    localStorage.setItem('pet_agendados', JSON.stringify(agendados));
    document.getElementById('nome').value = "";
    carregarTabelas();
    alert("Agendado com sucesso!");
}

function carregarTabelas() {
    const filtroData = document.getElementById('filtroDataAgenda').value;
    const servF = document.getElementById('especialidade').value;

    const ag = JSON.parse(localStorage.getItem('pet_agendados')) || [];
    const es = JSON.parse(localStorage.getItem('pet_espera')) || [];
    const dc = JSON.parse(localStorage.getItem('pet_prontuarios')) || [];

    // Recepção (Mostra todos os serviços do dia)
    const listaAg = document.getElementById('listaAgendamentos');
    const doDia = ag.filter(p => p.data === filtroData).sort((a,b) => a.hora.localeCompare(b.hora));
    
    listaAg.innerHTML = doDia.length === 0 ? '<tr><td>Nenhum agendamento.</td></tr>' : 
        doDia.map(p => `<tr><td><b>${p.hora}</b> - ${p.nome}<br><small>${p.servico}</small></td>
        <td><button onclick="confirmarChegada(${p.id})" style="background:#2ecc71; color:white;">✔</button></td></tr>`).join('');

    // Espera Profissional
    document.getElementById('listaEspera').innerHTML = es.filter(p => p.servico === servF)
        .map(p => `<tr><td><b>${p.nome}</b></td><td><button onclick="chamar(${p.id})" style="background:#f39c12; color:white;">Chamar</button></td></tr>`).join('');

    // Arquivo
    document.getElementById('listaArquivamento').innerHTML = dc.map(p => `
        <tr><td>${p.nome} (${p.data})</td><td><button onclick="verProntuario(${p.id})">VER</button></td></tr>`).join('');
}

// ==========================================
// FLUXO DE CHAMADA E MONITOR
// ==========================================
function confirmarChegada(id) {
    let ag = JSON.parse(localStorage.getItem('pet_agendados')) || [];
    let es = JSON.parse(localStorage.getItem('pet_espera')) || [];
    const p = ag.find(x => x.id == id);
    if (p) {
        es.push(p);
        localStorage.setItem('pet_espera', JSON.stringify(es));
        localStorage.setItem('pet_agendados', JSON.stringify(ag.filter(x => x.id != id)));
        carregarTabelas();
    }
}

function chamar(id) {
    let es = JSON.parse(localStorage.getItem('pet_espera')) || [];
    petAtualAtendimento = es.find(x => x.id == id);
    
    if (petAtualAtendimento) {
        const chamada = { ...petAtualAtendimento, time: Date.now() };
        localStorage.setItem('pet_chamada_monitor', JSON.stringify(chamada));
        
        let hist = JSON.parse(localStorage.getItem('pet_historico')) || [];
        hist.unshift(chamada);
        if (hist.length > 4) hist.pop();
        localStorage.setItem('pet_historico', JSON.stringify(hist));

        window.speechSynthesis.speak(new SpeechSynthesisUtterance(`Pet ${petAtualAtendimento.nome}`));
        atualizarHistoricoPainel();
        
        document.getElementById('modalProntuario').style.display = 'block';
        document.getElementById('p_nome').value = petAtualAtendimento.nome;
        document.getElementById('btnAcaoModal').style.display = 'block';
        
        document.getElementById('btnAcaoModal').onclick = function() {
            let dc = JSON.parse(localStorage.getItem('pet_prontuarios')) || [];
            dc.unshift({
                id: petAtualAtendimento.id,
                nome: petAtualAtendimento.nome,
                relatorio: document.getElementById('p_prescricao').value,
                data: new Date().toLocaleDateString()
            });
            localStorage.setItem('pet_prontuarios', JSON.stringify(dc));
            localStorage.setItem('pet_espera', JSON.stringify(es.filter(x => x.id != id)));
            fecharProntuario();
            carregarTabelas();
        };
    }
}

function atualizarHistoricoPainel() {
    const hist = JSON.parse(localStorage.getItem('pet_historico')) || [];
    const painel = document.getElementById('historicoPainel');
    if (painel) {
        painel.innerHTML = hist.map(p => `<div style="background:#2c3e50; color:white; padding:8px; margin-bottom:5px; border-radius:4px; border-left:5px solid #f1c40f;"><b>${p.nome}</b><br><small>${p.servico}</small></div>`).join('');
    }
}

// ==========================================
// IMPRESSÕES E MODAL
// ==========================================
function verProntuario(id) {
    const dc = JSON.parse(localStorage.getItem('pet_prontuarios')) || [];
    const p = dc.find(x => x.id == id);
    if (p) {
        document.getElementById('modalProntuario').style.display = 'block';
        document.getElementById('p_nome').value = p.nome;
        document.getElementById('p_prescricao').value = p.relatorio;
        document.getElementById('btnAcaoModal').style.display = 'none';
        
        let btnP = document.getElementById('btnImprimirProntuario');
        if (!btnP) {
            btnP = document.createElement('button');
            btnP.id = 'btnImprimirProntuario';
            btnP.innerText = "🖨️ Imprimir Ficha";
            btnP.style.background = "#3498db"; btnP.style.color = "white"; btnP.style.marginLeft = "10px";
            btnP.onclick = () => {
                const win = window.open('', '', 'width=600,height=600');
                win.document.write(`<h2>Ficha Clínica: ${p.nome}</h2><p>Data: ${p.data}</p><hr><p style="white-space:pre-wrap;">${p.relatorio}</p><script>window.print();</script>`);
            };
            document.querySelector('.botoes-modal').appendChild(btnP);
        }
    }
}

function gerarCarteirinha(id) {
    const pets = JSON.parse(localStorage.getItem('pet_cadastros')) || [];
    const p = pets.find(pet => pet.id === id);
    if (!p) return;
    const win = window.open('', '', 'width=500,height=650');
    win.document.write(`
        <div style="width:400px; border:3px solid #3498db; padding:25px; border-radius:15px; font-family:sans-serif; background:white;">
            <h2 style="color:#3498db; text-align:center; margin-top:0;">🐾 PET CARD</h2>
            <div style="display:flex; gap:15px; align-items:center;">
                <div style="width:110px; height:110px; border:2px dashed #3498db; border-radius:10px; display:flex; align-items:center; justify-content:center; color:#ccc; font-size:10px;">FOTO 3x4</div>
                <div style="line-height:1.6;">
                    <b>ID:</b> #${p.id}<br><b>NOME:</b> ${p.nome}<br><b>RAÇA:</b> ${p.raca}<br><b>IDADE:</b> ${p.idade}
                </div>
            </div>
            <div style="margin-top:20px; border-top:2px solid #eee; padding-top:10px; background:#fcfcfc; padding:10px; border-radius:10px;">
                <b style="color:#e67e22; font-size:12px;">📅 CRONOGRAMA DE RETORNOS:</b><br><br>
                ${[1,2,3,4,5].map(i => `<div style="border-bottom:1px dashed #ccc; margin-bottom:10px; padding-bottom:5px; font-size:11px; color:#7f8c8d;">${i}º ____/____/____ Obs: ________________</div>`).join('')}
            </div>
            <p style="text-align:center; font-size:10px; color:#999; margin-top:15px;">Pet Manager Pro - "Cuidando com Carinho"</p>
        </div>
        <script>setTimeout(() => { window.print(); window.close(); }, 600);</script>
    `);
}

function fecharProntuario() {
    document.getElementById('modalProntuario').style.display = 'none';
    document.getElementById('p_prescricao').value = "";
    const b = document.getElementById('btnImprimirProntuario'); if(b) b.remove();
}

// Função para limpar apenas o histórico visual do monitor
function limparHistoricoPainel() {
    if (confirm("Deseja limpar a lista de últimos chamados do monitor?")) {
        // Remove os dados do armazenamento local
        localStorage.removeItem('pet_historico');
        localStorage.removeItem('pet_chamada_monitor');
        
        // Atualiza a interface instantaneamente
        atualizarHistoricoPainel();
        
        // Se houver um monitor aberto em outra aba, ele também será limpo via evento 'storage'
        alert("Monitor limpo!");
    }
}

function limparArquivos() { if(confirm("Deseja apagar os prontuários arquivados?")) { localStorage.removeItem('pet_prontuarios'); carregarTabelas(); } }