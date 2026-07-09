  document.addEventListener("DOMContentLoaded", function() {
    const livro = document.getElementById("livro");
    const indiceUl = document.getElementById("indice");
    const btnNovaPagina = document.getElementById("btn-nova-pagina");
    const btnEsquerda = document.getElementById("btn-esquerda");
    const btnDireita = document.getElementById("btn-direita");
    
    // Captura o novo botão e o painel lateral
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
    btnMenuToggle.addEventListener("click", function(e) {
        e.stopPropagation(); // Impede o clique de se propagar para o document
        painelLateral.classList.toggle("aberto");
    });

    // Fecha o sumário se o usuário clicar em qualquer ponto fora dele
    document.addEventListener("click", function(e) {
        if (!painelLateral.contains(e.target) && e.target !== btnMenuToggle) {
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

        section.innerHTML = `
            <div class="cabecalho-pagina">
                <input type="text" value="${dados.titulo}" placeholder="Digite o Título do Tema..." class="input-titulo" id="tit-${index}">
                <div class="metadados">
                    <span>${dados.data}</span>
                    <span>${dados.hora}</span>
                </div>
            </div>
            <textarea placeholder="Continue escrevendo seu relatório extenso aqui..." class="area-conteudo" id="cont-${index}">${dados.conteudo}</textarea>
            <button class="btn-sucesso" id="salvar-${index}">Guardar Alterações</button>
        `;

        livro.appendChild(section);

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
                irParaPagina(relatoriosGuardados.length); 
            } else {
                relatoriosGuardados[index].titulo = txtTitulo;
                relatoriosGuardados[index].conteudo = txtConteudo;
                localStorage.setItem("diario_dados", JSON.stringify(relatoriosGuardados));
                renderizarLivro();
                alert("Alterações gravadas nesta página!");
                irParaPagina(index);
            }
        });
    }

    function criarItemInidice(titulo, index) {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = "#";
        a.innerText = index === relatoriosGuardados.length ? titulo : `Pág. ${index + 1}: ${titulo}`;
        a.addEventListener("click", (e) => {
            e.preventDefault();
            irParaPagina(index);
            painelLateral.classList.remove("aberto"); // Fecha o painel após selecionar a página
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
        painelLateral.classList.remove("aberto"); // Fecha o painel ao iniciar página nova
    });

    renderizarLivro();
    if(relatoriosGuardados.length > 0){
        irParaPagina(0); 
    }
});