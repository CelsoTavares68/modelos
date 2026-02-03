  // 1. LISTA DE PÁGINAS ATUALIZADA (Economia no lugar de Classificados)
const ordemPaginas = ['capa', 'editor', 'noticias', 'saude', 'esportes', 'tecnologia', 'emprego', 'variedades', 'economia'];
let xInicial = null;

// 2. FUNÇÃO PARA ABRIR/FECHAR O MENU LATERAL (Hamburguer)
function toggleMenu() {
    const menu = document.getElementById('menuPrincipal');
    menu.classList.toggle('aberto');
}

// 3. FUNÇÃO PRINCIPAL DE MUDANÇA DE PÁGINA
function mudarPagina(id, botao) {
    // Esconde todas as seções e ativa a correta
    document.querySelectorAll('.secao-conteudo').forEach(s => s.classList.remove('ativa'));
    const secao = document.getElementById(id);
    if(secao) secao.classList.add('ativa');

    // Remove destaque de todos os botões
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('btn-ativo'));
    
    // Fecha o menu lateral automaticamente ao clicar (importante para mobile)
    document.getElementById('menuPrincipal').classList.remove('aberto');

    // Destaca o botão correto
    if(botao) {
        botao.classList.add('btn-ativo');
    } else {
        const index = ordemPaginas.indexOf(id);
        const btn = document.querySelectorAll('nav button')[index];
        if(btn) btn.classList.add('btn-ativo');
    }

    // Atualiza a cor do Header conforme a seção
    const header = document.getElementById('meuHeader');
    const cores = {
        'capa': '#1a1a1a', 
        'editor': '#333333', 
        'noticias': '#004085',
        'saude': '#00838f', 
        'esportes': '#d4af37', 
        'tecnologia': '#1b5e20',
        'emprego': '#5d4037', 
        'variedades': '#e91e63', 
        'economia': '#1565c0'
    };
    header.style.backgroundColor = cores[id] || '#1a1a1a';

    // Scroll suave para o topo
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 4. NAVEGAÇÃO POR TECLADO (Setas Direita/Esquerda)
document.addEventListener('keydown', (e) => {
    const ativa = document.querySelector('.secao-conteudo.ativa');
    if (!ativa) return;
    let i = ordemPaginas.indexOf(ativa.id);
    
    if (e.key === "ArrowRight" && i < ordemPaginas.length - 1) {
        mudarPagina(ordemPaginas[i+1]);
    } else if (e.key === "ArrowLeft" && i > 0) {
        mudarPagina(ordemPaginas[i-1]);
    }
});

// 5. NAVEGAÇÃO POR DESLIZE (Swipe Mobile)
document.addEventListener('touchstart', e => xInicial = e.touches[0].clientX);
document.addEventListener('touchend', e => {
    if (!xInicial) return;
    let xFinal = e.changedTouches[0].clientX;
    let diffX = xInicial - xFinal;
    const ativa = document.querySelector('.secao-conteudo.ativa');
    if (!ativa) return;
    let i = ordemPaginas.indexOf(ativa.id);

    if (Math.abs(diffX) > 100) { // Sensibilidade de 100px
        if (diffX > 0 && i < ordemPaginas.length - 1) {
            mudarPagina(ordemPaginas[i+1]);
        } else if (diffX < 0 && i > 0) {
            mudarPagina(ordemPaginas[i-1]);
        }
    }
    xInicial = null;
});

// 6. NAVEGAÇÃO POR DUPLO CLIQUE (Avançar Página)
document.addEventListener('dblclick', (e) => {
    // Evita avançar se o clique for em botões ou links
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A') return;

    const ativa = document.querySelector('.secao-conteudo.ativa');
    if (!ativa) return;
    let i = ordemPaginas.indexOf(ativa.id);

    if (i < ordemPaginas.length - 1) {
        mudarPagina(ordemPaginas[i+1]);
    } else {
        mudarPagina(ordemPaginas[0]); // Volta para a capa
    }
});

function verificarArquivo(event) {
    
    const urlArquivo = event.currentTarget.getAttribute('href');
    
    console.log("Iniciando download de: " + urlArquivo);
}

 

function gerarPDF() {
    // Seleciona o elemento que você quer transformar em PDF (o conteúdo principal)
    const elemento = document.querySelector('.conteudo-principal');
    
    // Configurações do arquivo
    const opcoes = {
        margin: [10, 10, 10, 10],
        filename: 'Brasil_Digital_Edicao_01.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Executa a criação e o download automático
    html2pdf().set(opcoes).from(elemento).save();
}

 function baixarComoPDF() {
    const elemento = document.querySelector('.conteudo-principal');
    
    // Mostra tudo temporariamente para o PDF não sair vazio
    const secoes = document.querySelectorAll('.secao-conteudo');
    secoes.forEach(s => s.style.display = 'block');

    const opcoes = {
        margin: [10, 10, 10, 10],
        filename: 'Brasil_Digital_Edicao_completa.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Gera o PDF e, quando terminar, esconde as páginas de novo
    html2pdf().set(opcoes).from(elemento).save().then(() => {
        // Volta o site ao normal, deixando apenas a capa ativa
        secoes.forEach(s => {
            if(s.id !== 'capa') s.style.display = 'none';
        });
    });
}