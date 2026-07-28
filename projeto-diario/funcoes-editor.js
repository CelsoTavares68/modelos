 document.addEventListener("DOMContentLoaded", function() {
    
    // 1. Função que injeta a barra com o botão B e transforma o editor em visual
    function transformarEditorParaNegritoVisual() {
        const paginas = document.querySelectorAll(".page-editor");
        
        paginas.forEach(pagina => {
            const textarea = pagina.querySelector(".area-conteudo");
            if (!textarea || textarea.style.display === "none") return; // Evita duplicar

            // Encontra a barra de botões da página
            const containerBotoes = pagina.querySelector(".botoes-acoes");

            // Cria o botãozinho "B" de negrito
            const btnNegrito = document.createElement("button");
            btnNegrito.innerHTML = "<b>B</b>";
            btnNegrito.title = "Negrito";
            Object.assign(btnNegrito.style, {
                background: "#f39c12", color: "white", border: "none",
                padding: "10px 15px", borderRadius: "4px", cursor: "pointer",
                fontWeight: "bold", flexShrink: "0"
            });
            
            // Adiciona o botão na barra superior existente
            if (containerBotoes && !containerBotoes.querySelector(".btn-b-negrito")) {
                btnNegrito.className = "btn-b-negrito";
                containerBotoes.insertBefore(btnNegrito, containerBotoes.firstChild);
            }

            // Cria o novo campo visual que aceita negrito de verdade na tela
            const divEditorVisual = document.createElement("div");
            divEditorVisual.contentEditable = "true"; // Torna o elemento digitável
            divEditorVisual.className = "area-conteudo-visual";
            
            // Copia exatamente os mesmos estilos do seu textarea original para não quebrar o layout
             Object.assign(divEditorVisual.style, {
    flexGrow: "1",
    border: "none",
    outline: "none",
    resize: "none",
    fontSize: "1.1em",
    lineHeight: "1.6",
    textAlign: "justify",
    background: "transparent",
    minHeight: "200px",
    overflowY: "auto",
    whiteSpace: "pre-wrap",
    color: "#2c3e50",
    fontFamily: "inherit",
    
    /* --- AJUSTES DA BARRA DE ROLAGEM --- */
    paddingRight: "30px", /* Cria um espaço em branco entre o texto e a barra de rolagem */
    boxSizing: "border-box" /* Garante que o padding não quebre a largura da área */
});

            // Passa o texto que já estava no textarea para o novo editor visual
            divEditorVisual.innerHTML = textarea.value;

            // Esconde o seu textarea antigo (mas mantém ele ali para não quebrar suas funções)
            textarea.style.display = "none";
            textarea.parentNode.insertBefore(divEditorVisual, textarea);

            // A MÁGICA DO BOTÃO: Usamos 'mousedown' para não perder a seleção e não rolar a página
            btnNegrito.addEventListener("mousedown", function(e) {
                e.preventDefault(); // Impede o botão de roubar o foco e pular para o topo
                document.execCommand("bold", false, null); // Aplica o negrito na seleção atual
            });

            // SINCRONIZAÇÃO EM TEMPO REAL: Tudo o que você digita vai para o textarea oculto,
            // garantindo que suas funções de "Guardar Alterações" e "Enviar PDF" continuem funcionando!
            divEditorVisual.addEventListener("input", function() {
                textarea.value = divEditorVisual.innerHTML;
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
            });
        });
    }

    // Monitora a tela para aplicar o efeito nas páginas antigas e nas novas que forem criadas
    const observador = new MutationObserver(transformarEditorParaNegritoVisual);
    observador.observe(document.body, { childList: true, subtree: true });
    transformarEditorParaNegritoVisual();
});

// =========================================================================
// CORREÇÃO DO SEU PDF: Remove marcas de código indesejadas na impressão
// =========================================================================
(function() {
    const originalHtml2pdf = window.html2pdf;
    if (originalHtml2pdf) {
        window.html2pdf = function(element, options) {
            if (element) {
                const divConteudoPdf = element.querySelector("div[style*='white-space: pre-wrap']");
                if (divConteudoPdf) {
                    // Decodifica as tags HTML para que o PDF imprima o negrito formatado e limpo
                    divConteudoPdf.innerHTML = divConteudoPdf.textContent || divConteudoPdf.innerHTML;
                }
            }
            return originalHtml2pdf.apply(this, arguments);
        };
    }
})();