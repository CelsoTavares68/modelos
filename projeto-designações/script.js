  document.addEventListener('DOMContentLoaded', carregarDados);

const btnAdicionar = document.getElementById('btn-adicionar');
const btnLimpar = document.getElementById('btn-limpar-tudo');
const btnPDF = document.getElementById('btn-gerar-pdf');

// Variável para controlar se estamos editando uma linha específica
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
            entrada: tds[1].innerText,
            auditorio: tds[2].innerText,
            volante: tds[3].innerText,
            leitor: tds[4].innerText,
            audioVideo: tds[5].innerText
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
        document.getElementById('entrada').value = obj.entrada;
        document.getElementById('auditorio').value = obj.auditorio;
        document.getElementById('volante').value = obj.volante;
        document.getElementById('leitor').value = obj.leitor;
        document.getElementById('audioVideo').value = obj.audioVideo;

        linhaEmEdicao = novaLinha;
        
        // Atualiza o botão principal com ícone de salvar
        btnAdicionar.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Salvar Alteração';
        btnAdicionar.style.backgroundColor = "#f39c12";
        novaLinha.style.backgroundColor = "#fff3cd"; 
        
        window.scrollTo(0, 0);
    });
}

// No evento btnAdicionar.addEventListener, mude a linha do reset do botão:
// btnAdicionar.innerHTML = '<i class="fa-solid fa-plus"></i> Adicionar à Lista';

btnAdicionar.addEventListener('click', function() {
    const dataRaw = document.getElementById('data').value;
    if (dataRaw === "") {
        alert("Selecione uma data!");
        return;
    }

    const dadosCampos = {
        data: formatarData(dataRaw),
        entrada: document.getElementById('entrada').value,
        auditorio: document.getElementById('auditorio').value,
        volante: document.getElementById('volante').value,
        leitor: document.getElementById('leitor').value,
        audioVideo: document.getElementById('audioVideo').value
    };

    if (linhaEmEdicao) {
        // Atualiza a linha existente ao invés de criar uma nova
        const tds = linhaEmEdicao.querySelectorAll('td');
        tds[0].innerText = dadosCampos.data;
        tds[1].innerText = dadosCampos.entrada;
        tds[2].innerText = dadosCampos.auditorio;
        tds[3].innerText = dadosCampos.volante;
        tds[4].innerText = dadosCampos.leitor;
        tds[5].innerText = dadosCampos.audioVideo;
        
        // Reseta o estado de edição
        linhaEmEdicao.style.backgroundColor = "";
        linhaEmEdicao = null;
        btnAdicionar.innerText = "Adicionar à Lista";
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
        btnAdicionar.innerText = "Adicionar à Lista";
    }
});

   btnPDF.addEventListener('click', async function () {
    const overlay = document.getElementById('loading-overlay');
    
    // 1. Mostrar aviso de carregamento
    overlay.style.display = 'flex';

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'mm', 'a4');

        // Configuração do Título
        doc.setFontSize(22);
        doc.setTextColor(44, 62, 80);
        const larguraPagina = doc.internal.pageSize.getWidth();
        const textoTitulo = "Quadro de Designações";
        const x = (larguraPagina - doc.getTextWidth(textoTitulo)) / 2;
        doc.text(textoTitulo, x, 20);

        // Tabela - Usando os dados do corpo da tabela para garantir que não venha branco
        doc.autoTable({
            html: '#tabela-designacoes',
            startY: 35,
            theme: 'grid',
            headStyles: { fillColor: [44, 62, 80], halign: 'center' },
            styles: { halign: 'center', fontSize: 10 },
            columns: [
                { header: 'Data', dataKey: '0' },
                { header: 'Entrada', dataKey: '1' },
                { header: 'Auditório', dataKey: '2' },
                { header: 'Volante', dataKey: '3' },
                { header: 'Leitor', dataKey: '4' },
                { header: 'Áudio/Vídeo', dataKey: '5' }
            ]
        });

        // Forçar a renderização e criar o arquivo
        const pdfBlob = doc.output('blob');
        const arquivo = new File([pdfBlob], "Designacoes.pdf", { type: "application/pdf" });

        // 2. Tentar compartilhar
        if (navigator.canShare && navigator.canShare({ files: [arquivo] })) {
            await navigator.share({
                files: [arquivo],
                title: 'Escala de Designações',
                text: 'Segue o quadro de designações atualizado.'
            });
        } else {
            // Caso seja computador ou navegador sem suporte
            doc.save('quadro_de_designacoes.pdf');
        }

    } catch (error) {
        console.error("Erro no processo:", error);
        alert("Houve um erro ao processar o arquivo.");
    } finally {
        // 3. Esconder o aviso de carregamento (sempre executa, dando certo ou errado)
        overlay.style.display = 'none';
    }
});