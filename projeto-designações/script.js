 document.addEventListener('DOMContentLoaded', carregarDados);

const btnAdicionar = document.getElementById('btn-adicionar');
const btnLimpar = document.getElementById('btn-limpar-tudo');
const btnPDF = document.getElementById('btn-gerar-pdf');

let linhaEmEdicao = null;

function reverterDataParaInput(dataBr) {
    const partes = dataBr.split(' ');
    const [dia, mes, ano] = partes[0].split('/');
    return `${ano}-${mes}-${dia}`;
}

function formatarData(data) {
    if(!data) return "";
    const [ano, mes, dia] = data.split('-');
    const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const d = new Date(data + 'T00:00:00');
    const semana = dias[d.getDay()];
    return `${dia}/${mes}/${ano} (${semana})`;
}

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
            div.style.marginBottom = "5px";
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
        
        if(document.getElementById('observacao')) document.getElementById('observacao').value = novaLinha.dataset.obs;
        if(document.getElementById('data-especial')) document.getElementById('data-especial').checked = novaLinha.classList.contains('linha-especial');

        linhaEmEdicao = novaLinha;
        btnAdicionar.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Salvar Alteração';
        btnAdicionar.style.backgroundColor = "#f39c12";
        window.scrollTo(0, 0);
    });
}

btnAdicionar.addEventListener('click', function() {
    const dataRaw = document.getElementById('data').value;
    if (dataRaw === "") {
        alert("Selecione uma data!");
        return;
    }

    const ehEspecial = document.getElementById('data-especial') ? document.getElementById('data-especial').checked : false;
    const obsTexto = document.getElementById('observacao') ? document.getElementById('observacao').value : '';

    const dados = {
        data: formatarData(dataRaw),
        presidente: document.getElementById('presidente').value,
        entrada: document.getElementById('entrada').value,
        auditorio: document.getElementById('auditorio').value,
        volante: document.getElementById('volante').value,
        leitor: document.getElementById('leitor').value,
        audioVideo: document.getElementById('audioVideo').value,
        observacao: obsTexto,
        especial: ehEspecial
    };

    if (linhaEmEdicao) {
        linhaEmEdicao.cells[0].innerText = dados.data;
        linhaEmEdicao.cells[1].innerText = dados.presidente;
        linhaEmEdicao.cells[2].innerText = dados.entrada;
        linhaEmEdicao.cells[3].innerText = dados.auditorio;
        linhaEmEdicao.cells[4].innerText = dados.volante;
        linhaEmEdicao.cells[5].innerText = dados.leitor;
        linhaEmEdicao.cells[6].innerText = dados.audioVideo;
        
        linhaEmEdicao.dataset.obs = obsTexto; // Correção feita aqui (linhaEmEdicao)
        if(ehEspecial) linhaEmEdicao.classList.add('linha-especial');
        else linhaEmEdicao.classList.remove('linha-especial');

        linhaEmEdicao = null;
        btnAdicionar.innerHTML = '<i class="fa-solid fa-plus"></i> Adicionar à Lista';
        btnAdicionar.style.backgroundColor = ""; 
    } else {
        adicionarLinhaATabela(dados);
    }

    salvarNoStorage();
    document.querySelectorAll('.form-container input, .form-container textarea').forEach(i => {
        if(i.type === 'checkbox') i.checked = false;
        else i.value = '';
    });
});

btnLimpar.addEventListener('click', function() {
    if (confirm("Apagar tudo?")) {
        document.getElementById('corpo-tabela').innerHTML = '';
        if(document.getElementById('container-observacoes')) document.getElementById('container-observacoes').innerHTML = '';
        localStorage.removeItem('designacoesData');
    }
});

 btnPDF.addEventListener('click', async function () {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'flex';

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'mm', 'a4');

        doc.setFontSize(20);
        doc.setTextColor(44, 62, 80);
        doc.text("Quadro de Designações para as Reuniões", 148.5, 20, { align: 'center' });

        doc.autoTable({
            html: '#tabela-designacoes',
            startY: 25,
            theme: 'grid',
            headStyles: { fillColor: [44, 62, 80], halign: 'center' },
            styles: { halign: 'center' },
            columns: [0, 1, 2, 3, 4, 5, 6], // Pega apenas as colunas de dados
            didParseCell: function(data) {
                // VERIFICAÇÃO DE SEGURANÇA:
                // data.row.raw precisa existir e ser um elemento HTML (nodeType 1)
                const rowElement = data.row.raw;
                if (rowElement && rowElement.nodeType === 1) { 
                    if (rowElement.classList.contains('linha-especial')) {
                        data.cell.styles.fillColor = [255, 249, 196];
                    }
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

        const pdfBlob = doc.output('blob');
        const arquivo = new File([pdfBlob], "Designacoes.pdf", { type: "application/pdf" });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [arquivo] })) {
            await navigator.share({
                files: [arquivo],
                title: 'Escala',
                text: 'Segue o quadro de designações.'
            }).catch(() => doc.save('Designacoes.pdf'));
        } else {
            doc.save('Designacoes.pdf');
        }

    } catch (e) {
        console.error("Erro detalhado:", e);
        alert("Erro ao gerar PDF. Certifique-se de que a tabela tem dados.");
    } finally {
        if (overlay) overlay.style.display = 'none';
    }
});