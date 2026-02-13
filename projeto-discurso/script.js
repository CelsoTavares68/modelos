 const edPrincipal = document.getElementById('editor-principal');
const edVersiculos = document.getElementById('editor-versiculos');
const container = document.querySelector('.container');
let selecaoSalva = null;

// 1. Salva a posição do cursor/seleção de forma robusta
document.addEventListener('selectionchange', () => {
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        // Verifica se a seleção está dentro de um dos editores
        if (edPrincipal.contains(range.commonAncestorContainer) || 
            edVersiculos.contains(range.commonAncestorContainer)) {
            selecaoSalva = range.cloneRange();
        }
    }
});

function toggleVers() {
    container.classList.toggle('mostrando-vers');
}

// 2. FUNÇÃO DE FORMATAR REFORMULADA
 function formatar(cmd, valor = null) {
    // Foca no editor para garantir que o comando tenha destino
    edPrincipal.focus(); 

    // Executa o comando de forma direta
    document.execCommand(cmd, false, valor);
    
    salvar();
}

function salvar() {
    localStorage.setItem('db_discurso', edPrincipal.innerHTML);
    localStorage.setItem('db_versiculos', edVersiculos.innerHTML);
}

edPrincipal.oninput = salvar;
edVersiculos.oninput = salvar;

window.onload = () => {
    edPrincipal.innerHTML = localStorage.getItem('db_discurso') || '';
    edVersiculos.innerHTML = localStorage.getItem('db_versiculos') || '';
};

function limparTudo() {
    if(confirm("Deseja apagar tudo?")) {
        edPrincipal.innerHTML = ""; 
        edVersiculos.innerHTML = "";
        localStorage.clear();
        container.classList.remove('mostrando-vers');
    }
}

function copiarTudo() {
    const texto = "DISCURSO:\n" + edPrincipal.innerText + "\n\nDETALHES:\n" + edVersiculos.innerText;
    navigator.clipboard.writeText(texto).then(() => alert("Copiado com sucesso!"));
}

function gerarPDF() { window.print(); }