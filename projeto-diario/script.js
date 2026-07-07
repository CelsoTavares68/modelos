 document.addEventListener("DOMContentLoaded", function() {
    const livro = document.getElementById("livro");
    const indiceUl = document.getElementById("indice");
    const btnNovaPagina = document.getElementById("btn-nova-pagina");
    const btnEsquerda = document.getElementById("btn-esquerda");
    const btnDireita = document.getElementById("btn-direita");

    let relatoriosGuardados = JSON.parse(localStorage.getItem("diario_dados")) || [];
    let paginaAtualIndex = 0;

    // Estrutura base para criar uma nova folha limpa temporária na memória
    let novaPaginaTemporaria = {
        titulo: "",
        conteudo: "",
        data: "",
        hora: ""
    };

    function obterDataHoraAtual() {
        const agora = new Date();
        return {
            data: `📅 ${agora.toLocaleDateString('pt-BR')}`,
            hora: `⏰ ${agora.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}`
        };
    }

    // Monta o livro inteiro na tela colocando todas as páginas como editáveis
    function renderizarLivro() {
        livro.innerHTML = "";
        indiceUl.innerHTML = "";

        // 1. Renderiza as páginas já existentes (Salvas)
        relatoriosGuardados.forEach((relatorio, idx) => {
            criarElementoPaginaEditor(relatorio, idx, false);
            criarItemInidice(relatorio.titulo, idx);
        });

        // 2. Renderiza a última página (Sempre a em branco para novos temas)
        if (!novaPaginaTemporaria.data) {
            const tempo = obterDataHoraAtual();
            novaPaginaTemporaria.data = tempo.data;
            novaPaginaTemporaria.hora = tempo.hora;
        }
        criarElementoPaginaEditor(novaPaginaTemporaria, relatoriosGuardados.length, true);
        criarItemInidice("(Nova Página em Branco)", relatoriosGuardados.length);

        atualizarSetas();
    }

    // Cria visualmente a página com inputs editáveis
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

        // Evento do botão Guardar de cada página específica
        section.querySelector(`#salvar-${index}`).addEventListener("click", () => {
            const txtTitulo = section.querySelector(`#tit-${index}`).value.trim();
            const txtConteudo = section.querySelector(`#cont-${index}`).value.trim();

            if (!txtTitulo || !txtConteudo) {
                alert("Por favor, preencha o título e o conteúdo antes de guardar!");
                return;
            }

            if (isNova) {
                // Adiciona um novo registro ao livro
                relatoriosGuardados.push({
                    titulo: txtTitulo,
                    conteudo: txtConteudo,
                    data: dados.data,
                    hora: dados.hora
                });
                // Reseta a página temporária para a próxima
                novaPaginaTemporaria = { titulo: "", conteudo: "", data: "", hora: "" };
                localStorage.setItem("diario_dados", JSON.stringify(relatoriosGuardados));
                renderizarLivro();
                alert("Nova página guardada com sucesso!");
                irParaPagina(relatoriosGuardados.length); // Foca na nova folha em branco criada
            } else {
                // Atualiza uma página antiga existente
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
        });
        li.appendChild(a);
        indiceUl.appendChild(li);
    }

    // Controlador de deslize das páginas
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
    });

    // Inicialização
    renderizarLivro();
    if(relatoriosGuardados.length > 0){
        irParaPagina(0); // Abre na página 1 caso já tenha dados
    }
});