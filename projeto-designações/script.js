 document.addEventListener('DOMContentLoaded', () => {
    carregarDados();
    
    // FIXAR O MÊS: Salva automaticamente no localStorage ao alterar
    const campoMes = document.getElementById('mes-referencia');
    if (campoMes) {
        campoMes.addEventListener('change', () => {
            localStorage.setItem('mesReferencia', campoMes.value);
        });
    }
});

const btnAdicionar = document.getElementById('btn-adicionar');
const btnLimpar = document.getElementById('btn-limpar-tudo');
const btnPDF = document.getElementById('btn-gerar-pdf');

let linhaEmEdicao = null;

// Funções Auxiliares de Data
function obterDiaSemana(dataString) {
    const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const data = new Date(dataString + 'T00:00:00');
    return dias[data.getDay()];
}

function reverterDataParaInput(dataFormatada) {
    const partes = dataFormatada.split(' ');
    const [dia, mes] = partes[0].split('/');
    const ano = new Date().getFullYear(); 
    return `${ano}-${mes}-${dia}`;
}

function formatarData(data) {
    if(!data) return "";
    const diaSemana = obterDiaSemana(data);
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes} (${diaSemana})`;
}

// Persistência de Dados
function salvarNoStorage() {
    const linhas = [];
    document.querySelectorAll('#corpo-tabela tr').forEach(tr => {
        const tds = tr.querySelectorAll('td');
        linhas.push({
            data: tds[0].innerText,
            presidente: tds[1].innerText,
            entrada: tds[2].innerText,
            auditorio: tds[3].innerText,
            volante: tds[4].innerText,
            leitor: tds[5].innerText,
            audioVideo: tds[6].innerText,
            observacao: tr.dataset.obs || '',
            especial: tr.classList.contains('linha-especial')
        });
    });
    localStorage.setItem('designacoesData', JSON.stringify(linhas));
    atualizarQuadroObservacoes();
}

function carregarDados() {
    const dados = JSON.parse(localStorage.getItem('designacoesData') || '[]');
    const mesSalvo = localStorage.getItem('mesReferencia') || '';
    
    const campoMes = document.getElementById('mes-referencia');
    if (campoMes && mesSalvo) campoMes.value = mesSalvo;
    
    dados.forEach(item => adicionarLinhaATabela(item));
    atualizarQuadroObservacoes();
}

function atualizarQuadroObservacoes() {
    const container = document.getElementById('container-observacoes');
    if(!container) return;
    container.innerHTML = '';
    document.querySelectorAll('#corpo-tabela tr').forEach(tr => {
        const obs = tr.dataset.obs;
        if(obs && obs.trim() !== "") {
            const div = document.createElement('div');
            div.className = "obs-item";
            div.innerHTML = `<strong>* ${tr.cells[0].innerText}:</strong> ${obs}`;
            container.appendChild(div);
        }
    });
}

function adicionarLinhaATabela(obj) {
    const tabela = document.getElementById('corpo-tabela');
    const novaLinha = tabela.insertRow();
    
    novaLinha.dataset.obs = obj.observacao || '';
    if(obj.especial) novaLinha.classList.add('linha-especial');

    novaLinha.innerHTML = `
        <td>${obj.data}</td>
        <td>${obj.presidente}</td>
        <td>${obj.entrada}</td>
        <td>${obj.auditorio}</td>
        <td>${obj.volante}</td>
        <td>${obj.leitor}</td>
        <td>${obj.audioVideo}</td>
        <td class="no-print">
            <button class="btn-editar"><i class="fa-solid fa-pen-to-square"></i> Editar</button>
        </td>
    `;

    novaLinha.querySelector('.btn-editar').addEventListener('click', function() {
        document.getElementById('data').value = reverterDataParaInput(obj.data);
        document.getElementById('presidente').value = obj.presidente;
        document.getElementById('entrada').value = obj.entrada;
        document.getElementById('auditorio').value = obj.auditorio;
        document.getElementById('volante').value = obj.volante;
        document.getElementById('leitor').value = obj.leitor;
        document.getElementById('audioVideo').value = obj.audioVideo;
        document.getElementById('observacao').value = novaLinha.dataset.obs;
        document.getElementById('data-especial').checked = novaLinha.classList.contains('linha-especial');

        linhaEmEdicao = novaLinha;
        btnAdicionar.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Salvar';
        btnAdicionar.style.backgroundColor = "#f39c12";
        window.scrollTo(0, 0);
    });
}

btnAdicionar.addEventListener('click', function() {
    const dataRaw = document.getElementById('data').value;
    if (dataRaw === "") return alert("Selecione uma data!");

    const dados = {
        data: formatarData(dataRaw),
        presidente: document.getElementById('presidente').value,
        entrada: document.getElementById('entrada').value,
        auditorio: document.getElementById('auditorio').value,
        volante: document.getElementById('volante').value,
        leitor: document.getElementById('leitor').value,
        audioVideo: document.getElementById('audioVideo').value,
        observacao: document.getElementById('observacao').value,
        especial: document.getElementById('data-especial').checked
    };

    if (linhaEmEdicao) {
        linhaEmEdicao.cells[0].innerText = dados.data;
        linhaEmEdicao.cells[1].innerText = dados.presidente;
        linhaEmEdicao.cells[2].innerText = dados.entrada;
        linhaEmEdicao.cells[3].innerText = dados.auditorio;
        linhaEmEdicao.cells[4].innerText = dados.volante;
        linhaEmEdicao.cells[5].innerText = dados.leitor;
        linhaEmEdicao.cells[6].innerText = dados.audioVideo;
        linhaEmEdicao.dataset.obs = dados.observacao;
        
        if(dados.especial) linhaEmEdicao.classList.add('linha-especial');
        else linhaEmEdicao.classList.remove('linha-especial');

        linhaEmEdicao = null;
        btnAdicionar.innerHTML = '<i class="fa-solid fa-plus"></i> Adicionar';
        btnAdicionar.style.backgroundColor = ""; 
    } else {
        adicionarLinhaATabela(dados);
    }

    salvarNoStorage();
    
    document.querySelectorAll('.form-container input:not(#mes-referencia), .form-container textarea').forEach(i => {
        if(i.type === 'checkbox') i.checked = false;
        else i.value = '';
    });
});

btnLimpar.addEventListener('click', function() {
    if (confirm("Apagar tudo?")) {
        document.getElementById('corpo-tabela').innerHTML = '';
        document.getElementById('container-observacoes').innerHTML = '';
        localStorage.clear();
        location.reload();
    }
});

// Geração de PDF e Compartilhamento
btnPDF.addEventListener('click', async function () {
    const overlay = document.getElementById('loading-overlay');
    if(overlay) overlay.style.display = 'flex';

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'mm', 'a4');

        const valorMes = document.getElementById('mes-referencia').value;
        let tituloPDF = "Quadro de Designações";
        let mesNome = "Geral";
        
        if (valorMes) {
            const [ano, mes] = valorMes.split('-');
            const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
            mesNome = meses[parseInt(mes)-1];
            tituloPDF += ` - ${mesNome} de ${ano}`;
        }

        doc.setFontSize(18);
        doc.setTextColor(44, 62, 80);
        doc.text(tituloPDF, 148.5, 15, { align: 'center' });

        // Identifica quais linhas são especiais ANTES de gerar a tabela
        const listaEspeciais = [];
        document.querySelectorAll('#corpo-tabela tr').forEach((tr, idx) => {
            if (tr.classList.contains('linha-especial')) listaEspeciais.push(idx);
        });

        doc.autoTable({
            html: '#tabela-designacoes',
            startY: 25,
            theme: 'grid',
            headStyles: { fillColor: [44, 62, 80], halign: 'center' },
            styles: { halign: 'center', fontSize: 10 },
            columns: [0, 1, 2, 3, 4, 5, 6],
            didParseCell: function(data) {
                // Aplica o destaque por índice de linha
                if (data.section === 'body' && listaEspeciais.includes(data.row.index)) {
                    data.cell.styles.fillColor = [255, 249, 196]; // Amarelo Destaque
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        });

        // Adiciona Observações
        let finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(11);
        document.querySelectorAll('#corpo-tabela tr').forEach(tr => {
            const obs = tr.dataset.obs;
            if(obs && obs.trim() !== "") {
                if (finalY > 185) { doc.addPage(); finalY = 20; }
                const texto = `* ${tr.cells[0].innerText}: ${obs}`;
                const linhasTexto = doc.splitTextToSize(texto, 270);
                doc.text(linhasTexto, 14, finalY);
                finalY += (linhasTexto.length * 7);
            }
        });

        const nomeArquivo = `Designacoes_${mesNome}.pdf`;
        const pdfBlob = doc.output('blob');
        const arquivoFinal = new File([pdfBlob], nomeArquivo, { type: "application/pdf" });

        // Tenta compartilhar (WhatsApp/Menu de sistema)
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [arquivoFinal] })) {
            await navigator.share({
                files: [arquivoFinal],
                title: 'Designações',
                text: `Quadro de Designações - ${mesNome}`
            });
        } else {
            // Se não for possível compartilhar (ex: PC), faz o download
            doc.save(nomeArquivo);
        }

    } catch (error) {
        console.error("Erro:", error);
        alert("Erro ao processar PDF.");
    } finally {
        if(overlay) overlay.style.display = 'none';
    }
});