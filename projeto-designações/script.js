 document.addEventListener('DOMContentLoaded', carregarDados);

const btnAdicionar = document.getElementById('btn-adicionar');
const btnLimpar = document.getElementById('btn-limpar-tudo');
const btnPDF = document.getElementById('btn-gerar-pdf');

let linhaEmEdicao = null;

function reverterDataParaInput(dataBr) {
    const [dia, mes, ano] = dataBr.split('/');
    return `${ano}-${mes}-${dia}`;
}

function formatarData(data) {
    if(!data) return "";
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
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
            audioVideo: tds[6].innerText
        });
    });
    localStorage.setItem('designacoesData', JSON.stringify(linhas));
}

function carregarDados() {
    const dados = JSON.parse(localStorage.getItem('designacoesData') || '[]');
    dados.forEach(item => adicionarLinhaATabela(item));
}

function adicionarLinhaATabela(obj) {
    const tabela = document.getElementById('corpo-tabela');
    const novaLinha = tabela.insertRow();

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

        linhaEmEdicao = novaLinha;
        
        btnAdicionar.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Salvar Alteração';
        btnAdicionar.style.backgroundColor = "#f39c12";
        novaLinha.style.backgroundColor = "#fff3cd"; 
        
        window.scrollTo(0, 0);
    });
}

btnAdicionar.addEventListener('click', function() {
    const dataRaw = document.getElementById('data').value;
    if (dataRaw === "") {
        alert("Selecione uma data!");
        return;
    }

    const dadosCampos = {
        data: formatarData(dataRaw),
        presidente: document.getElementById('presidente').value,
        entrada: document.getElementById('entrada').value,
        auditorio: document.getElementById('auditorio').value,
        volante: document.getElementById('volante').value,
        leitor: document.getElementById('leitor').value,
        audioVideo: document.getElementById('audioVideo').value
    };

    if (linhaEmEdicao) {
        const tds = linhaEmEdicao.querySelectorAll('td');
        tds[0].innerText = dadosCampos.data;
        tds[1].innerText = dadosCampos.presidente;
        tds[2].innerText = dadosCampos.entrada;
        tds[3].innerText = dadosCampos.auditorio;
        tds[4].innerText = dadosCampos.volante;
        tds[5].innerText = dadosCampos.leitor;
        tds[6].innerText = dadosCampos.audioVideo;
        
        linhaEmEdicao.style.backgroundColor = "";
        linhaEmEdicao = null;
        btnAdicionar.innerHTML = '<i class="fa-solid fa-plus"></i> Adicionar à Lista';
        btnAdicionar.style.backgroundColor = ""; 
    } else {
        adicionarLinhaATabela(dadosCampos);
    }

    salvarNoStorage();
    document.querySelectorAll('.form-container input').forEach(i => i.value = '');
});

btnLimpar.addEventListener('click', function() {
    if (confirm("Isso apagará TODA a escala permanentemente. Confirma?")) {
        document.getElementById('corpo-tabela').innerHTML = '';
        localStorage.removeItem('designacoesData');
        linhaEmEdicao = null;
        btnAdicionar.innerHTML = '<i class="fa-solid fa-plus"></i> Adicionar à Lista';
    }
});

btnPDF.addEventListener('click', async function () {
    const overlay = document.getElementById('loading-overlay');
    overlay.style.display = 'flex';

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'mm', 'a4');

        doc.setFontSize(22);
        doc.setTextColor(44, 62, 80);
        const larguraPagina = doc.internal.pageSize.getWidth();
        const textoTitulo = "Quadro de Designações";
        const x = (larguraPagina - doc.getTextWidth(textoTitulo)) / 2;
        doc.text(textoTitulo, x, 20);

         doc.autoTable({
    html: '#tabela-designacoes',
    startY: 35,
    theme: 'striped', // Altera para striped para habilitar as linhas alternadas
    headStyles: { 
        fillColor: [44, 62, 80], // Cor do cabeçalho (Azul escuro)
        textColor: [255, 255, 255], 
        halign: 'center' 
    },
    alternateRowStyles: { 
        fillColor: [240, 240, 240] // Cinza bem claro para as linhas alternadas
    },
    styles: { 
        halign: 'center', 
        fontSize: 10,
        cellPadding: 3
    },
    columns: [
        { header: 'Data', dataKey: '0' },
        { header: 'Presidente', dataKey: '1' },
        { header: 'Entrada', dataKey: '2' },
        { header: 'Auditório', dataKey: '3' },
        { header: 'Volante', dataKey: '4' },
        { header: 'Leitor', dataKey: '5' },
        { header: 'Áudio/Vídeo', dataKey: '6' }
    ]
});

        const pdfBlob = doc.output('blob');
        const arquivo = new File([pdfBlob], "Designacoes.pdf", { type: "application/pdf" });

        if (navigator.canShare && navigator.canShare({ files: [arquivo] })) {
            await navigator.share({
                files: [arquivo],
                title: 'Escala de Designações',
                text: 'Segue o quadro de designações atualizado.'
            });
        } else {
            doc.save('quadro_de_designacoes.pdf');
        }

    } catch (error) {
        console.error("Erro no processo:", error);
        alert("Houve um erro ao processar o arquivo.");
    } finally {
        overlay.style.display = 'none';
    }
});