 document.addEventListener("DOMContentLoaded", function() {
    const livro = document.getElementById("livro");
    const indiceUl = document.getElementById("indice");
    const btnNovaPagina = document.getElementById("btn-nova-pagina");
    const btnEsquerda = document.getElementById("btn-esquerda");
    const btnDireita = document.getElementById("btn-direita");
    
    // Captura o novo botão e o painel lateral para tablet/celular
    const btnMenuToggle = document.getElementById("btn-menu-toggle");
    const painelLateral = document.getElementById("painel-lateral");

    let relatoriosGuardados = JSON.parse(localStorage.getItem("diario_dados")) || [];
    let paginaAtualIndex = 0;

    let novaPaginaTemporaria = {
        titulo: "",
        conteudo: "",
        data: "",
        hora: ""
    };

    // --- CONTROLE DE ABRIR / FECHAR O SUMÁRIO (TABLET E CELULAR) ---
    if (btnMenuToggle) {
        btnMenuToggle.addEventListener("click", function(e) {
            e.stopPropagation(); 
            painelLateral.classList.toggle("aberto");
        });
    }

    // Fecha o sumário se o usuário clicar em qualquer ponto fora dele
    document.addEventListener("click", function(e) {
        if (painelLateral && !painelLateral.contains(e.target) && e.target !== btnMenuToggle) {
            painelLateral.classList.remove("aberto");
        }
    });

    function obterDataHoraAtual() {
        const agora = new Date();
        return {
            data: `📅 ${agora.toLocaleDateString('pt-BR')}`,
            hora: `⏰ ${agora.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}`
        };
    }

    function renderizarLivro() {
        livro.innerHTML = "";
        indiceUl.innerHTML = "";

        relatoriosGuardados.forEach((relatorio, idx) => {
            criarElementoPaginaEditor(relatorio, idx, false);
            criarItemInidice(relatorio.titulo, idx);
        });

        if (!novaPaginaTemporaria.data) {
            const tempo = obterDataHoraAtual();
            novaPaginaTemporaria.data = tempo.data;
            novaPaginaTemporaria.hora = tempo.hora;
        }
        criarElementoPaginaEditor(novaPaginaTemporaria, relatoriosGuardados.length, true);
        criarItemInidice("(Nova Página em Branco)", relatoriosGuardados.length);

        atualizarSetas();
    }

    function criarElementoPaginaEditor(dados, index, isNova) {
        const section = document.createElement("section");
        section.className = "page-editor";
        section.id = `pag-${index}`;

        // O botão de partilhar PDF fica integrado dinamicamente nas folhas guardadas
        section.innerHTML = `
            <div class="cabecalho-pagina">
                <div class="dados-titulo">
                    <input type="text" value="${dados.titulo}" placeholder="Digite o Título do Tema..." class="input-titulo" id="tit-${index}">
                    <div class="metadados">
                        <span>${dados.data}</span>
                        <span>${dados.hora}</span>
                    </div>
                </div>
                <div class="botoes-acoes">
                    ${!isNova ? `<button class="btn-share" id="share-${index}">📤 Enviar PDF</button>` : ''}
                    <button class="btn-sucesso" id="salvar-${index}">Guardar Alterações</button>
                </div>
            </div>
            <textarea placeholder="Continue escrevendo seu relatório extenso aqui..." class="area-conteudo" id="cont-${index}">${dados.conteudo}</textarea>
        `;

        livro.appendChild(section);

        // Evento para Guardar Alterações
        section.querySelector(`#salvar-${index}`).addEventListener("click", () => {
            const txtTitulo = section.querySelector(`#tit-${index}`).value.trim();
            const txtConteudo = section.querySelector(`#cont-${index}`).value.trim();

            if (!txtTitulo || !txtConteudo) {
                alert("Por favor, preencha o título e o conteúdo antes de guardar!");
                return;
            }

            if (isNova) {
                relatoriosGuardados.push({
                    titulo: txtTitulo,
                    conteudo: txtConteudo,
                    data: dados.data,
                    hora: dados.hora
                });
                novaPaginaTemporaria = { titulo: "", conteudo: "", data: "", hora: "" };
                localStorage.setItem("diario_dados", JSON.stringify(relatoriosGuardados));
                renderizarLivro();
                alert("Nova página guardada com sucesso!");
                irParaPagina(relatoriosGuardados.length - 1); 
            } else {
                relatoriosGuardados[index].titulo = txtTitulo;
                relatoriosGuardados[index].conteudo = txtConteudo;
                localStorage.setItem("diario_dados", JSON.stringify(relatoriosGuardados));
                renderizarLivro();
                alert("Alterações gravadas nesta página!");
                irParaPagina(index);
            }
        });

         // LÓGICA DE COMPARTILHAMENTO DE PDF (Ajustada para funcionar em Notebooks e Celulares)
        if (!isNova) {
            section.querySelector(`#share-${index}`).addEventListener("click", () => {
                const txtTitulo = section.querySelector(`#tit-${index}`).value.trim() || "Diario_Pagina";
                const txtConteudo = section.querySelector(`#cont-${index}`).value;

                // 1. Cria a estrutura em memória para o PDF
                const templatePdf = document.createElement("div");
                templatePdf.style.padding = "40px";
                templatePdf.style.fontFamily = "Segoe UI, Arial, sans-serif";
                templatePdf.style.color = "#2c3e50";
                
                templatePdf.innerHTML = `
                    <h1 style="font-size: 24px; border-bottom: 2px solid #3498db; padding-bottom: 12px; margin-bottom: 5px;">${txtTitulo}</h1>
                    <p style="font-size: 12px; color: #7f8c8d; margin-bottom: 30px;">${dados.data} | ${dados.hora}</p>
                    <div style="font-size: 14px; line-height: 1.8; text-align: justify; white-space: pre-wrap;">
                        ${txtConteudo}
                    </div>
                `;

                const configuracao = {
                    margin:       15,
                    filename:     `${txtTitulo.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`,
                    image:        { type: 'jpeg', quality: 0.98 },
                    html2canvas:  { scale: 2, useCORS: true },
                    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
                };

                // 2. Transforma em PDF usando a biblioteca html2pdf
                html2pdf().set(configuracao).from(templatePdf).toPdf().output('blob').then((pdfBlob) => {
                    const nomeDoArquivo = `${txtTitulo.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
                    
                    // Detecta se é um dispositivo móvel com suporte a compartilhamento nativo de arquivos
                    const ehDispositivoMovel = /Mobi|Android|iPhone|iPad|Macintosh/i.test(navigator.userAgent) && ('ontouchend' in document);

                    if (ehDispositivoMovel && navigator.canShare && navigator.canShare({ files: [new File([pdfBlob], nomeDoArquivo)] })) {
                        // Fluxo para Celular/Tablet: Abre o menu do sistema para enviar ao WhatsApp
                        const arquivoPdf = new File([pdfBlob], nomeDoArquivo, { type: 'application/pdf' });
                        navigator.share({
                            files: [arquivoPdf],
                            title: txtTitulo,
                            text: `Compartilhando página do Diário: ${txtTitulo}`
                        }).catch((erro) => console.log('Compartilhamento cancelado:', erro));
                    } else {
                        // Fluxo para Notebook/Desktop: Faz o download direto do arquivo PDF imediatamente
                        const linkDownload = document.createElement('a');
                        linkDownload.href = URL.createObjectURL(pdfBlob);
                        linkDownload.download = nomeDoArquivo;
                        document.body.appendChild(linkDownload); // Necessário para funcionamento correto em alguns navegadores de PC
                        linkDownload.click();
                        document.body.removeChild(linkDownload);
                        
                        alert("PDF gerado com sucesso! O arquivo foi baixado para o seu notebook. Agora você pode anexá-lo no WhatsApp Web.");
                    }
                });
            });
        }
    } // <--- ESSA CHAVE ESTAVA FALTANDO AQUI PARA FECHAR A FUNÇÃO "criarElementoPaginaEditor"

    function criarItemInidice(titulo, index) {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = "#";
        a.innerText = index === relatoriosGuardados.length ? titulo : `Pág. ${index + 1}: ${titulo}`;
        a.addEventListener("click", (e) => {
            e.preventDefault();
            irParaPagina(index);
            if (painelLateral) painelLateral.classList.remove("aberto"); 
        });
        li.appendChild(a);
        indiceUl.appendChild(li);
    }

    function irParaPagina(index) {
        const paginas = document.querySelectorAll(".page-editor");
        if (index >= 0 && index < paginas.length) {
            paginaAtualIndex = index;
            paginas[paginaAtualIndex].scrollIntoView({
                behavior: "smooth",
                block: "nearest",
                inline: "start"
            });
            atualizarSetas();
        }
    }

    function atualizarSetas() {
        const total = document.querySelectorAll(".page-editor").length;
        btnEsquerda.style.display = paginaAtualIndex === 0 ? "none" : "block";
        btnDireita.style.display = paginaAtualIndex === total - 1 ? "none" : "block";
    }

    btnEsquerda.addEventListener("click", () => irParaPagina(paginaAtualIndex - 1));
    btnDireita.addEventListener("click", () => irParaPagina(paginaAtualIndex + 1));
    
    btnNovaPagina.addEventListener("click", () => {
        irParaPagina(relatoriosGuardados.length);
        if (painelLateral) painelLateral.classList.remove("aberto");
    });

    renderizarLivro();
    if(relatoriosGuardados.length > 0){
        irParaPagina(0); 
    }
});