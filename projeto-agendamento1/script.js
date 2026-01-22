let pacienteAtualAtendimento = null;

// Inicialização do Sistema
document.addEventListener('DOMContentLoaded', () => {
    const dataInput = document.getElementById('dataConsulta');
    if(dataInput) dataInput.value = new Date().toISOString().split('T')[0];
    
    carregarTabelas();
    
    // Atualiza o monitor e o relógio a cada segundo
    setInterval(atualizarMonitor, 1000);
    setInterval(() => { 
        const relogio = document.getElementById('relogioMonitor');
        if(relogio) relogio.innerText = new Date().toLocaleTimeString(); 
    }, 1000);
});

// --- FUNÇÃO DE GERAÇÃO DE PDF (Original) ---
async function gerarPDFReal() {
    const { jsPDF } = window.jspdf;
    
    // Alimenta a folha oculta com os dados que estão nos inputs do modal
    document.getElementById('pdf_nome').innerText = document.getElementById('p_nome').value || "---";
    document.getElementById('pdf_nasc').innerText = document.getElementById('p_nasc').value || "---";
    document.getElementById('pdf_peso_val').innerText = document.getElementById('p_peso').value || "---";
    document.getElementById('pdf_altura_val').innerText = document.getElementById('p_altura').value || "---";
    document.getElementById('pdf_pa_val').innerText = document.getElementById('p_pa').value || "---";
    document.getElementById('pdf_anamnese_val').innerText = document.getElementById('p_anamnese').value || "";
    document.getElementById('pdf_prescricao_val').innerText = document.getElementById('p_prescricao').value || "";
    document.getElementById('pdf_medico_val').innerText = document.getElementById('p_medico').value || "Assinatura do Responsável";
    
    const elemento = document.getElementById('folha-prontuario');
    html2canvas(elemento, { scale: 2 }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
        pdf.save(`Prontuario_${document.getElementById('p_nome').value}.pdf`);
    });
}

// --- GESTÃO DE TABELAS E FILTROS ---
function carregarTabelas() {
    const dataF = document.getElementById('dataConsulta').value;
    const fRecepcao = document.getElementById('filtroEspecialidadeRecepcao')?.value || "Todos";
    const fMedico = document.getElementById('filtroEspecialidade')?.value || "Todos";
    
    const ag = JSON.parse(localStorage.getItem('scc_agendados')) || [];
    const tr = JSON.parse(localStorage.getItem('scc_triagem')) || [];
    const es = JSON.parse(localStorage.getItem('scc_espera')) || [];
    const dc = JSON.parse(localStorage.getItem('scc_docs')) || [];

    // 1. Lista da Recepção (Filtra por data e especialidade)
    document.getElementById('listaAgendamentos').innerHTML = ag
        .filter(p => p.data === dataF && (fRecepcao === "Todos" || p.esp === fRecepcao))
        .sort((a,b) => a.hora.localeCompare(b.hora))
        .map(p => `
            <tr>
                <td><small>${p.esp}</small><br><strong>${p.hora} - ${p.nome}</strong></td>
                <td>
                    <button onclick="confirmarChegada(${p.id})" style="background:#27ae60; color:white;">✔</button>
                    <button onclick="editarAgendamento(${p.id})">✏</button>
                </td>
            </tr>`).join('');

    // 2. Lista da Triagem (Pacientes que chegaram)
    document.getElementById('listaTriagem').innerHTML = tr
        .map(p => `<tr><td><strong>${p.nome}</strong><br><small>${p.esp}</small></td><td><button onclick="abrirTriagem(${p.id})" style="background:#6c5ce7; color:white;">Triar</button></td></tr>`).join('');

    // 3. Lista do Médico (Pacientes triados)
    document.getElementById('listaEspera').innerHTML = es
        .filter(p => fMedico === "Todos" || p.esp === fMedico)
        .map(p => `<tr><td><strong>${p.nome}</strong><br><small>${p.esp}</small></td><td><button onclick="chamar(${p.id})" style="background:orange">Chamar</button></td></tr>`).join('');

    // 4. Lista do Arquivo (Prontuários finalizados)
    document.getElementById('listaArquivamento').innerHTML = dc.map(p => `
        <tr>
            <td><strong>${p.paciente}</strong><br><small>Médico: ${p.medico || '---'}</small></td>
            <td><button onclick="verProntuario(${p.id})">VER</button></td>
        </tr>`).join('');
}

// --- FLUXO DO PACIENTE ---

function agendar() {
    const nome = document.getElementById('nome').value;
    const esp = document.getElementById('especialidade').value;
    const data = document.getElementById('data').value;
    const hora = document.getElementById('hora').value;
    if(!nome || !esp || !data || !hora) return alert("Preencha todos os campos do agendamento!");
    
    let ag = JSON.parse(localStorage.getItem('scc_agendados')) || [];
    ag.push({ id: Date.now(), nome, esp, data, hora });
    localStorage.setItem('scc_agendados', JSON.stringify(ag));
    
    document.getElementById('nome').value = "";
    carregarTabelas();
}

function confirmarChegada(id) {
    let ag = JSON.parse(localStorage.getItem('scc_agendados')) || [];
    let tr = JSON.parse(localStorage.getItem('scc_triagem')) || [];
    const p = ag.find(x => x.id == id);
    if(p) {
        tr.push(p);
        localStorage.setItem('scc_triagem', JSON.stringify(tr));
        localStorage.setItem('scc_agendados', JSON.stringify(ag.filter(x => x.id != id)));
        carregarTabelas();
    }
}

function abrirTriagem(id) {
    let tr = JSON.parse(localStorage.getItem('scc_triagem')) || [];
    pacienteAtualAtendimento = tr.find(x => x.id == id);
    
    document.getElementById('formProntuario').reset();
    document.getElementById('p_nome').value = pacienteAtualAtendimento.nome;
    document.getElementById('modalProntuario').style.display = 'block';
    
    // Configura o botão Salvar para enviar para o Médico
    document.getElementById('btnAcaoModal').onclick = function() {
        let es = JSON.parse(localStorage.getItem('scc_espera')) || [];
        const triado = {
            ...pacienteAtualAtendimento,
            nasc: document.getElementById('p_nasc').value,
            peso: document.getElementById('p_peso').value,
            altura: document.getElementById('p_altura').value,
            pa: document.getElementById('p_pa').value,
            anamnese: document.getElementById('p_anamnese').value
        };
        es.push(triado);
        localStorage.setItem('scc_espera', JSON.stringify(es));
        localStorage.setItem('scc_triagem', JSON.stringify(tr.filter(x => x.id != id)));
        fecharProntuario();
        carregarTabelas();
    };
}

function chamar(id) {
    let es = JSON.parse(localStorage.getItem('scc_espera')) || [];
    pacienteAtualAtendimento = es.find(x => x.id == id);
    
    // Registra chamada para o monitor
    localStorage.setItem('scc_chamada_atual', JSON.stringify({ ...pacienteAtualAtendimento, time: Date.now() }));
    
    // Salva no histórico do painel
    let hi = JSON.parse(localStorage.getItem('scc_historico_painel')) || [];
    if (!hi.includes(pacienteAtualAtendimento.nome)) {
        hi.unshift(pacienteAtualAtendimento.nome);
        localStorage.setItem('scc_historico_painel', JSON.stringify(hi.slice(0, 4)));
    }
    
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(`Paciente ${pacienteAtualAtendimento.nome}`));
    document.getElementById('areaRechamar').style.display = 'block';
}

function abrirProntuarioNovo() {
    if(!pacienteAtualAtendimento) return;
    
    // Carrega dados vindos da triagem
    document.getElementById('p_nome').value = pacienteAtualAtendimento.nome;
    document.getElementById('p_nasc').value = pacienteAtualAtendimento.nasc || "";
    document.getElementById('p_peso').value = pacienteAtualAtendimento.peso || "";
    document.getElementById('p_altura').value = pacienteAtualAtendimento.altura || "";
    document.getElementById('p_pa').value = pacienteAtualAtendimento.pa || "";
    document.getElementById('p_anamnese').value = pacienteAtualAtendimento.anamnese || "";
    document.getElementById('p_prescricao').value = "";
    
    document.getElementById('modalProntuario').style.display = 'block';
    
    // Configura o botão Salvar para enviar para a Recepção (Arquivo)
    document.getElementById('btnAcaoModal').onclick = enviarParaRecepcao;
}

function enviarParaRecepcao() {
    let dc = JSON.parse(localStorage.getItem('scc_docs')) || [];
    let es = JSON.parse(localStorage.getItem('scc_espera')) || [];
    
    const d = { 
        id: Date.now(), 
        paciente: document.getElementById('p_nome').value, 
        nasc: document.getElementById('p_nasc').value,
        peso: document.getElementById('p_peso').value,
        altura: document.getElementById('p_altura').value,
        pa: document.getElementById('p_pa').value,
        anamnese: document.getElementById('p_anamnese').value, 
        prescricao: document.getElementById('p_prescricao').value, 
        medico: document.getElementById('p_medico').value 
    };
    
    dc.unshift(d);
    localStorage.setItem('scc_docs', JSON.stringify(dc));
    localStorage.setItem('scc_espera', JSON.stringify(es.filter(x => x.id != pacienteAtualAtendimento.id)));
    
    fecharProntuario();
    carregarTabelas();
    alert("Prontuário arquivado com sucesso!");
}

// --- MONITOR E AUXILIARES ---

function atualizarMonitor() {
    const c = JSON.parse(localStorage.getItem('scc_chamada_atual'));
    const hi = JSON.parse(localStorage.getItem('scc_historico_painel')) || [];
    
    if(c && (Date.now() - c.time < 30000)) {
        document.getElementById('nomeChamado').innerText = c.nome;
        document.getElementById('salaChamada').innerText = "CONSULTÓRIO: " + c.esp;
    } else {
        document.getElementById('nomeChamado').innerText = "PAINEL DE SENHAS";
        document.getElementById('salaChamada').innerText = "Aguardando chamada...";
    }
    
    document.getElementById('listaHistoricoPainel').innerHTML = hi.map(n => `<div class="item-historico">${n}</div>`).join('');
}

function verProntuario(id) {
    const dc = JSON.parse(localStorage.getItem('scc_docs')) || [];
    const p = dc.find(x => x.id == id);
    if(p) {
        document.getElementById('p_nome').value = p.paciente;
        document.getElementById('p_nasc').value = p.nasc;
        document.getElementById('p_peso').value = p.peso || "";
        document.getElementById('p_altura').value = p.altura || "";
        document.getElementById('p_pa').value = p.pa || "";
        document.getElementById('p_anamnese').value = p.anamnese || "";
        document.getElementById('p_prescricao').value = p.prescricao;
        document.getElementById('p_medico').value = p.medico;
        document.getElementById('modalProntuario').style.display = 'block';
        // Desabilita o salvar na visualização
        document.getElementById('btnAcaoModal').style.display = 'none';
    }
}

function fecharProntuario() { 
    document.getElementById('modalProntuario').style.display = 'none'; 
    document.getElementById('btnAcaoModal').style.display = 'block'; // Garante que o botão volte
}

function limparArquivos() {
    if(confirm("Deseja limpar todos os prontuários arquivados?")) {
        localStorage.removeItem('scc_docs');
        carregarTabelas();
    }
}

function limparHistoricoPainel() {
    localStorage.removeItem('scc_historico_painel');
    atualizarMonitor();
}

function repetirUltimaChamada() {
    const c = JSON.parse(localStorage.getItem('scc_chamada_atual'));
    if(c) window.speechSynthesis.speak(new SpeechSynthesisUtterance(`Paciente ${c.nome}`));
}