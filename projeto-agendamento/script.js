  let pacienteAtualAtendimento = null;
let idMembroEmEdicao = null;

// ==========================================
// 1. INICIALIZAÇÃO
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const dataInput = document.getElementById('dataConsulta');
    if (dataInput) dataInput.value = new Date().toISOString().split('T')[0];

    atualizarTabela(); 
    carregarTabelas();
    
    setInterval(atualizarMonitor, 1000);
    setInterval(() => {
        const relogio = document.getElementById('relogioMonitor');
        if (relogio) relogio.innerText = new Date().toLocaleTimeString();
    }, 1000);

    // Botão Exibir/Ocultar Lista
    const btnToggle = document.getElementById('btnToggleLista');
    const tabelaMembros = document.getElementById('lista-corpo')?.closest('table');
    if (btnToggle && tabelaMembros) {
        tabelaMembros.style.display = 'none'; 
        btnToggle.onclick = function() {
            if (tabelaMembros.style.display === 'none') {
                tabelaMembros.style.display = 'table';
                btnToggle.innerText = "⭐ Ocultar Lista de Membros";
            } else {
                tabelaMembros.style.display = 'none';
                btnToggle.innerText = "👁️ Exibir Lista de Membros";
            }
        };
    }
});

// Funções de Scroll (Melhoria visual sugerida)
function bloquearScroll() { document.body.style.overflow = 'hidden'; }
function liberarScroll() { document.body.style.overflow = 'auto'; }

// ==========================================
// 2. CADASTRO (USANDO inome)
// ==========================================
function salvarCadastro() {
    const n = document.getElementById('inome'); // ID CORRIGIDO AQUI
    const d = document.getElementById('documento');
    const e = document.getElementById('endereco');
    const nasc = document.getElementById('inascimento'); 

    if (!n || !n.value) return alert("O nome é obrigatório!");

    let cadastros = JSON.parse(localStorage.getItem('meusCadastros')) || [];

    if (idMembroEmEdicao !== null) {
        const i = cadastros.findIndex(m => m.id === idMembroEmEdicao);
        if (i !== -1) {
            cadastros[i].nome = n.value.toUpperCase();
            cadastros[i].documento = d.value;
            cadastros[i].endereco = e.value;
            cadastros[i].nascimento = nasc ? nasc.value : "";
        }
        idMembroEmEdicao = null;
        alert("Cadastro atualizado com sucesso!");
    } else {
        const novo = {
            id: Math.floor(10000000 + Math.random() * 90000000),
            nome: n.value.toUpperCase(),
            documento: d.value,
            endereco: e.value,
            nascimento: nasc ? nasc.value : ""
        };
        cadastros.push(novo);
        alert("Novo paciente cadastrado!");
    }

    localStorage.setItem('meusCadastros', JSON.stringify(cadastros));
    
    // Limpa apenas os campos de cadastro
    n.value = ""; d.value = ""; e.value = ""; 
    if(nasc) nasc.value = "";
    
    atualizarTabela();
}

function prepararEdicao(id) {
    const cadastros = JSON.parse(localStorage.getItem('meusCadastros')) || [];
    const p = cadastros.find(m => m.id === id);
    if (p) {
        // Preenche o formulário de cadastro (inome)
        document.getElementById('inome').value = p.nome;
        document.getElementById('documento').value = p.documento;
        document.getElementById('endereco').value = p.endereco;
        if(document.getElementById('inascimento')) document.getElementById('inascimento').value = p.nascimento || "";
        
        idMembroEmEdicao = p.id;
        
        // Scroll suave para o topo (onde está o inome)
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// ==========================================
// 3. AGENDAMENTO (USANDO nome)
// ==========================================
function agendar() {
    const busca = document.getElementById('nome').value.trim(); // ID DO AGENDAMENTO
    const esp = document.getElementById('especialidade').value;
    const data = document.getElementById('data').value;
    const hora = document.getElementById('hora').value;

    if (!busca || !data || !hora) return alert("Preencha os dados do agendamento!");

    const cadastros = JSON.parse(localStorage.getItem('meusCadastros')) || [];
    const p = cadastros.find(m => m.id.toString() === busca || m.nome.toUpperCase() === busca.toUpperCase());

    let ag = JSON.parse(localStorage.getItem('scc_agendados')) || [];
    ag.push({
        id: Date.now(),
        nome: p ? p.nome : busca.toUpperCase(),
        nasc: p ? p.nascimento : "",
        esp: esp, data: data, hora: hora
    });

    localStorage.setItem('scc_agendados', JSON.stringify(ag));
    document.getElementById('nome').value = ""; // Limpa campo de agendamento
    carregarTabelas();
    alert("Agendado com sucesso!");
}

// ==========================================
// 4. TRIAGEM -> MÉDICO (MOTOR DE ENVIO)
// ==========================================
function abrirTriagem(id) {
    let tr = JSON.parse(localStorage.getItem('scc_triagem')) || [];
    let p = tr.find(x => x.id == id);
    if (!p) return;

    document.getElementById('formProntuario').reset();
    document.getElementById('p_nome').value = p.nome;
    document.getElementById('p_nasc').value = p.nasc || "";
    
    bloquearScroll();
    document.getElementById('modalProntuario').style.display = 'block';
    const btn = document.getElementById('btnAcaoModal');
    btn.style.display = 'block';
    btn.innerText = "Enviar para o Médico";

    btn.onclick = function() {
        let es = JSON.parse(localStorage.getItem('scc_espera')) || [];
        es.push({ 
            ...p, 
            nasc: document.getElementById('p_nasc').value, 
            anamnese: "TRIAGEM: " + document.getElementById('p_anamnese').value,
            pa: document.getElementById('p_pa')?.value || "",
            peso: document.getElementById('p_peso')?.value || ""
        });
        localStorage.setItem('scc_espera', JSON.stringify(es));
        localStorage.setItem('scc_triagem', JSON.stringify(tr.filter(x => x.id != id)));
        fecharProntuario(); 
        carregarTabelas();
    };
}

// ... (Restantes funções carregarTabelas, chamar, verProntuario, atualizarTabela iguais às anteriores, garantindo a conexão)

function carregarTabelas() {
    const dataF = document.getElementById('dataConsulta').value;
    const espF = document.getElementById('especialidade').value;

    const ag = JSON.parse(localStorage.getItem('scc_agendados')) || [];
    const tr = JSON.parse(localStorage.getItem('scc_triagem')) || [];
    const es = JSON.parse(localStorage.getItem('scc_espera')) || [];
    const dc = JSON.parse(localStorage.getItem('scc_docs')) || [];

    document.getElementById('listaAgendamentos').innerHTML = ag
        .filter(p => p.data === dataF && p.esp === espF)
        .map(p => `<tr><td><strong>${p.hora} - ${p.nome}</strong></td><td><button onclick=\"confirmarChegada(${p.id})\" style=\"background:#27ae60; color:white; border:none; border-radius:3px;\">✔</button></td></tr>`).join('');

    document.getElementById('listaTriagem').innerHTML = tr
        .filter(p => p.esp === espF)
        .map(p => `<tr><td><strong>${p.nome}</strong></td><td><button onclick=\"abrirTriagem(${p.id})\" style=\"background:#6c5ce7; color:white; border:none; border-radius:3px;\">Triar</button></td></tr>`).join('');

    document.getElementById('listaEspera').innerHTML = es
        .filter(p => p.esp === espF)
        .map(p => `<tr><td><strong>${p.nome}</strong></td><td><button onclick=\"chamar(${p.id})\" style=\"background:orange; color:white; border:none; border-radius:3px;\">Chamar</button></td></tr>`).join('');

    const arquivoHTML = document.getElementById('listaArquivamento');
    if (arquivoHTML) {
        arquivoHTML.innerHTML = dc.map(p => `<tr><td><strong>${p.paciente}</strong></td><td><button onclick=\"verProntuario(${p.id})\" style=\"background:#34495e; color:white; border:none; border-radius:3px;\">VER</button></td></tr>`).join('');
    }
}

function atualizarTabela() {
    const cadastros = JSON.parse(localStorage.getItem('meusCadastros')) || [];
    const corpo = document.getElementById('lista-corpo');
    if (!corpo) return;

    corpo.innerHTML = cadastros.map((p, index) => `
        <tr>
            <td><strong>${p.id}</strong></td>
            <td>${p.nome}</td>
            <td>${p.documento}</td>
            <td>
                <button onclick=\"visualizarMembro(${index})\" style=\"background:#3498db; color:white; border:none; border-radius:3px; padding:5px;\">🪪</button>
                <button onclick=\"prepararEdicao(${p.id})\" style=\"background:#f1c40f; color:white; border:none; border-radius:3px; padding:5px; margin-left:5px;\">✏️</button>
            </td>
        </tr>`).join('');
}

function chamar(id) {
    let es = JSON.parse(localStorage.getItem('scc_espera')) || [];
    pacienteAtualAtendimento = es.find(x => x.id == id);
    if (!pacienteAtualAtendimento) return;

    localStorage.setItem('scc_chamada_atual', JSON.stringify({ ...pacienteAtualAtendimento, time: Date.now() }));
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(`Paciente ${pacienteAtualAtendimento.nome}`));
    
    document.getElementById('p_nome').value = pacienteAtualAtendimento.nome;
    document.getElementById('p_nasc').value = pacienteAtualAtendimento.nasc || "";
    document.getElementById('p_anamnese').value = pacienteAtualAtendimento.anamnese || "";
    
    bloquearScroll();
    document.getElementById('modalProntuario').style.display = 'block';
    const btn = document.getElementById('btnAcaoModal');
    btn.style.display = 'block';
    btn.innerText = "Finalizar Atendimento Médico";

    btn.onclick = function() {
        let dc = JSON.parse(localStorage.getItem('scc_docs')) || [];
        dc.unshift({ 
            id: Date.now(), 
            paciente: document.getElementById('p_nome').value, 
            nasc: document.getElementById('p_nasc').value,
            anamnese: document.getElementById('p_anamnese').value, 
            prescricao: document.getElementById('p_prescricao').value 
        });
        localStorage.setItem('scc_docs', JSON.stringify(dc));
        localStorage.setItem('scc_espera', JSON.stringify(es.filter(x => x.id != id)));
        fecharProntuario(); 
        carregarTabelas();
    };
}

function fecharProntuario() { document.getElementById('modalProntuario').style.display = 'none'; liberarScroll(); }
function fecharModal() { document.getElementById('area-carteirinha').style.display = 'none'; liberarScroll(); }

function confirmarChegada(id) {
    let ag = JSON.parse(localStorage.getItem('scc_agendados')) || [];
    let tr = JSON.parse(localStorage.getItem('scc_triagem')) || [];
    const p = ag.find(x => x.id == id);
    if (p) { 
        tr.push(p); 
        localStorage.setItem('scc_triagem', JSON.stringify(tr)); 
        localStorage.setItem('scc_agendados', JSON.stringify(ag.filter(x => x.id != id))); 
        carregarTabelas(); 
    }
}

function verProntuario(id) {
    const dc = JSON.parse(localStorage.getItem('scc_docs')) || [];
    const p = dc.find(x => x.id == id);
    if (p) {
        document.getElementById('p_nome').value = p.paciente;
        document.getElementById('p_nasc').value = p.nasc || "";
        document.getElementById('p_anamnese').value = p.anamnese || "";
        document.getElementById('p_prescricao').value = p.prescricao || "";
        bloquearScroll();
        document.getElementById('modalProntuario').style.display = 'block';
        document.getElementById('btnAcaoModal').style.display = 'none'; 
    }
}

function atualizarMonitor() {
    const c = JSON.parse(localStorage.getItem('scc_chamada_atual'));
    const n = document.getElementById('nomeChamado');
    const s = document.getElementById('salaChamada');
    if (c && (Date.now() - c.time < 30000)) {
        if(n) n.innerText = c.nome;
        if(s) s.innerText = "CONSULTÓRIO: " + (c.esp || "GERAL");
    } else {
        if(n) n.innerText = "PAINEL DE SENHAS";
        if(s) s.innerText = "Aguardando...";
    }
}

function visualizarMembro(index) {
    const cadastros = JSON.parse(localStorage.getItem('meusCadastros')) || [];
    const p = cadastros[index];
    document.getElementById('res-nome').innerText = p.nome;
    document.getElementById('res-doc').innerText = p.documento;
    document.getElementById('res-end').innerText = p.endereco;
    document.getElementById('res-id').innerText = "#" + p.id;
    bloquearScroll();
    document.getElementById('area-carteirinha').style.display = 'flex';
}