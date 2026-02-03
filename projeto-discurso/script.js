   const edPrincipal = document.getElementById('editor-principal');
const edVersiculos = document.getElementById('editor-versiculos');
const container = document.querySelector('.container');
let selecaoSalva = null;

// Salva a seleção sempre que mudar
document.addEventListener('selectionchange', () => {
    const sel = window.getSelection();
    if (sel.rangeCount > 0) selecaoSalva = sel.getRangeAt(0);
});

function toggleVers() {
    container.classList.toggle('mostrando-vers');
}

function formatar(cmd, valor = null) {
    if (selecaoSalva) {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(selecaoSalva);
    }
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
        edPrincipal.innerHTML = ""; edVersiculos.innerHTML = "";
        localStorage.clear();
        container.classList.remove('mostrando-vers');
    }
}

function copiarTudo() {
    const texto = "DISCURSO:\n" + edPrincipal.innerText + "\n\nVERSÍCULOS:\n" + edVersiculos.innerText;
    navigator.clipboard.writeText(texto).then(() => alert("Copiado com sucesso!"));
}

function gerarPDF() { window.print(); }