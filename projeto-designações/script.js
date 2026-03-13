 document.addEventListener('DOMContentLoaded', carregarDados);

const btnAdicionar = document.getElementById('btn-adicionar');
const btnLimpar = document.getElementById('btn-limpar-tudo');
const btnPDF = document.getElementById('btn-gerar-pdf');

let linhaEmEdicao = null;

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
    localStorage.setItem('mesReferencia', document.getElementById('mes-referencia').value);
    atualizarQuadroObservacoes();
}

function carregarDados() {
    const dados = JSON.parse(localStorage.getItem('designacoesData') || '[]');
    const mesSalvo = localStorage.getItem('mesReferencia') || '';
    document.getElementById('mes-referencia').value = mesSalvo;
    dados.forEach(item => adicionarLinhaATabela(item));
    atualizarQuadroObservacoes();
}

function atualizarQuadroObservacoes() {
    const container = document.getElementById('container-observacoes');
    container.innerHTML = '';
    
    document.querySelectorAll('#corpo-tabela tr').forEach(tr => {
        const obs = tr.dataset.obs;
        const data = tr.cells[0].innerText;
        if(obs && obs.trim() !== '') {
            const div = document.createElement('div');
            div.className = tr.classList.contains('linha-especial') ? 'obs-item obs-especial' : 'obs-item';
            div.innerHTML = `<strong>* ${data}:</strong> ${obs}`;
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

    const ehEspecial = document.getElementById('data-especial').checked;
    const obsValue = document.getElementById('observacao').value;

    if (linhaEmEdicao) {
        const tds = linhaEmEdicao.querySelectorAll('td');
        tds[0].innerText = formatarData(dataRaw);
        tds[1].innerText = document.getElementById('presidente').value;
        tds[2].innerText = document.getElementById('entrada').value;
        tds[3].innerText = document.getElementById('auditorio').value;
        tds[4].innerText = document.getElementById('volante').value;
        tds[5].innerText = document.getElementById('leitor').value;
        tds[6].innerText = document.getElementById('audioVideo').value;
        
        linhaEmEdicao.dataset.obs = obsValue;
        if(ehEspecial) linhaEmEdicao.classList.add('linha-especial');
        else linhaEmEdicao.classList.remove('linha-especial');

        linhaEmEdicao = null;
        btnAdicionar.innerHTML = '<i class="fa-solid fa-plus"></i> Adicionar à Lista';
        btnAdicionar.style.backgroundColor = ""; 
    } else {
        adicionarLinhaATabela({
            data: formatarData(dataRaw),
            presidente: document.getElementById('presidente').value,
            entrada: document.getElementById('entrada').value,
            auditorio: document.getElementById('auditorio').value,
            volante: document.getElementById('volante').value,
            leitor: document.getElementById('leitor').value,
            audioVideo: document.getElementById('audioVideo').value,
            observacao: obsValue,
            especial: ehEspecial
        });
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
    }
});

btnPDF.addEventListener('click', async function () {
    const overlay = document.getElementById('loading-overlay');
    overlay.style.display = 'flex';

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'mm', 'a4');

        // Título
        const mesRef = document.getElementById('mes-referencia').value;
        let titulo = "Quadro de Designações";
        if(mesRef) {
            const [ano, mes] = mesRef.split('-');
            const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
            titulo += ` - ${meses[parseInt(mes)-1]} / ${ano}`;
        }
        doc.setFontSize(18);
        doc.text(titulo, 14, 15);

        // Tabela
        doc.autoTable({
            html: '#tabela-designacoes',
            startY: 25,
            theme: 'grid',
            headStyles: { fillColor: [44, 62, 80] },
            columns: [
                { header: 'Data', dataKey: '0' },
                { header: 'Presidente', dataKey: '1' },
                { header: 'Entrada', dataKey: '2' },
                { header: 'Auditório', dataKey: '3' },
                { header: 'Volante', dataKey: '4' },
                { header: 'Leitor', dataKey: '5' },
                { header: 'Áudio/Vídeo', dataKey: '6' }
            ],
            didParseCell: function(data) {
                const rowElement = data.row.raw;
                if (rowElement && rowElement.classList.contains('linha-especial')) {
                    data.cell.styles.fillColor = [255, 235, 156];
                }
            }
        });

        // Observações no Rodapé do PDF
        let finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(11);
        doc.setTextColor(50, 50, 50);

        document.querySelectorAll('#corpo-tabela tr').forEach(tr => {
            const obs = tr.dataset.obs;
            if(obs && obs.trim() !== '') {
                if (finalY > 180) { doc.addPage(); finalY = 20; }
                const texto = `* ${tr.cells[0].innerText}: ${obs}`;
                const splitText = doc.splitTextToSize(texto, 260);
                doc.text(splitText, 14, finalY);
                finalY += (splitText.length * 6);
            }
        });

        // Nome do arquivo
        const nomeArquivo = `Escala_${mesRef || 'Designacoes'}.pdf`;

        // Lógica de Partilha/Download
        const pdfBlob = doc.output('blob');
        const arquivo = new File([pdfBlob], nomeArquivo, { type: "application/pdf" });

        if (navigator.canShare && navigator.canShare({ files: [arquivo] })) {
            await navigator.share({
                files: [arquivo],
                title: 'Quadro de Designações',
                text: 'Segue a escala atualizada.'
            });
        } else {
            // Se não suportar partilha (ex: PC), faz o download direto
            doc.save(nomeArquivo);
        }

    } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        alert("Erro ao processar o PDF. Tente novamente.");
    } finally {
        overlay.style.display = 'none';
    }
});