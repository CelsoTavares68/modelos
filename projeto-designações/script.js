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
            observacao: tds[7].innerText,
            especial: tr.classList.contains('linha-especial')
        });
    });
    localStorage.setItem('designacoesData', JSON.stringify(linhas));
    localStorage.setItem('mesReferencia', document.getElementById('mes-referencia').value);
}

function carregarDados() {
    const dados = JSON.parse(localStorage.getItem('designacoesData') || '[]');
    const mesSalvo = localStorage.getItem('mesReferencia') || '';
    document.getElementById('mes-referencia').value = mesSalvo;
    dados.forEach(item => adicionarLinhaATabela(item));
}

function adicionarLinhaATabela(obj) {
    const tabela = document.getElementById('corpo-tabela');
    const novaLinha = tabela.insertRow();
    
    if(obj.especial) novaLinha.classList.add('linha-especial');

    novaLinha.innerHTML = `
        <td>${obj.data}</td>
        <td>${obj.presidente}</td>
        <td>${obj.entrada}</td>
        <td>${obj.auditorio}</td>
        <td>${obj.volante}</td>
        <td>${obj.leitor}</td>
        <td>${obj.audioVideo}</td>
        <td class="col-obs">${obj.observacao || ''}</td>
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
        document.getElementById('observacao').value = obj.observacao || '';
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
    const dadosCampos = {
        data: formatarData(dataRaw),
        presidente: document.getElementById('presidente').value,
        entrada: document.getElementById('entrada').value,
        auditorio: document.getElementById('auditorio').value,
        volante: document.getElementById('volante').value,
        leitor: document.getElementById('leitor').value,
        audioVideo: document.getElementById('audioVideo').value,
        observacao: document.getElementById('observacao').value,
        especial: ehEspecial
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
        tds[7].innerText = dadosCampos.observacao;
        
        if(ehEspecial) linhaEmEdicao.classList.add('linha-especial');
        else linhaEmEdicao.classList.remove('linha-especial');

        linhaEmEdicao = null;
        btnAdicionar.innerHTML = '<i class="fa-solid fa-plus"></i> Adicionar à Lista';
        btnAdicionar.style.backgroundColor = ""; 
    } else {
        adicionarLinhaATabela(dadosCampos);
    }

    salvarNoStorage();
    // Limpa campos
    document.querySelectorAll('.form-container input:not(#mes-referencia), .form-container textarea').forEach(i => {
        if(i.type === 'checkbox') i.checked = false;
        else i.value = '';
    });
});

btnLimpar.addEventListener('click', function() {
    if (confirm("Isso apagará TODA a escala permanentemente. Confirma?")) {
        document.getElementById('corpo-tabela').innerHTML = '';
        localStorage.clear();
    }
});

btnPDF.addEventListener('click', async function () {
    const overlay = document.getElementById('loading-overlay');
    overlay.style.display = 'flex';

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'mm', 'a4');

        const mesRefValue = document.getElementById('mes-referencia').value;
        let textoTitulo = "Quadro de Designações";
        
        if(mesRefValue) {
            const [ano, mesNum] = mesRefValue.split('-');
            const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
            textoTitulo += ` - ${meses[parseInt(mesNum)-1]} / ${ano}`;
        }

        doc.setFontSize(18);
        doc.setTextColor(44, 62, 80);
        const larguraPagina = doc.internal.pageSize.getWidth();
        doc.text(textoTitulo, (larguraPagina - doc.getTextWidth(textoTitulo)) / 2, 20);

        doc.autoTable({
            html: '#tabela-designacoes',
            startY: 30,
            theme: 'grid',
            headStyles: { fillColor: [44, 62, 80], halign: 'center' },
            styles: { 
                halign: 'center', 
                fontSize: 9, 
                cellPadding: 2,
                overflow: 'linebreak' // Permite quebra de linha
            },
            columnStyles: {
                0: { cellWidth: 22 }, // Data
                7: { cellWidth: 50, halign: 'left' } // Observação maior e alinhada à esquerda
            },
            didParseCell: function(data) {
                const rowElement = data.row.raw; 
                if (rowElement && rowElement.classList.contains('linha-especial')) {
                    data.cell.styles.fillColor = [255, 235, 156];
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        });

        doc.save('quadro_designacoes.pdf');

    } catch (error) {
        console.error(error);
        alert("Erro ao processar.");
    } finally {
        overlay.style.display = 'none';
    }
});