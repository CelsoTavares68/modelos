  let totalCents = 0;
let qtdItens = 0;
let listaItens = {};

// Função para detectar o comando COLAR (Ctrl+V) na área de upload
document.getElementById('area-upload').addEventListener('paste', function(e) {
    const itens = e.clipboardData.items;
    for (let i = 0; i < itens.length; i++) {
        if (itens[i].type.indexOf("image") !== -1) {
            const blob = itens[i].getAsFile();
            const reader = new FileReader();
            reader.onload = function(event) {
                mostrarPreview(event.target.result);
                // Simulamos que o arquivo foi selecionado para validação
                window.arquivoColado = blob; 
            };
            reader.readAsDataURL(blob);
        }
    }
});

function mostrarPreview(src) {
    const container = document.getElementById('preview-container');
    container.innerHTML = `<img src="${src}" class="preview-img"><br><small style="color:green">✅ Imagem Colada!</small>`;
    document.getElementById('texto-instrucao').style.display = 'none';
}

function alterar(nome, valor, sinal) {
    if (sinal === -1 && (!listaItens[nome] || listaItens[nome] === 0)) return;
    totalCents += (valor * sinal);
    qtdItens += sinal;
    listaItens[nome] = (listaItens[nome] || 0) + sinal;
    document.getElementById('ui-qtd').textContent = qtdItens;
    document.getElementById('ui-total').textContent = "R$ " + Math.max(0, totalCents).toFixed(2).replace('.', ',');
}

function copiarPix() {
    const chave = document.getElementById('chave-pix').innerText;
    navigator.clipboard.writeText(chave);
    alert("Chave Pix copiada!");
}

function validarArquivo() {
    const input = document.getElementById('arquivo');
    if (input.files.length > 0) {
        const reader = new FileReader();
        reader.onload = (e) => mostrarPreview(e.target.result);
        reader.readAsDataURL(input.files[0]);
    }
}

function enviarPedido() {
    const nome = document.getElementById('cliente-nome').value;
    const endereco = document.getElementById('cliente-endereco').value;
    const fileInput = document.getElementById('arquivo');
    const numeroWhats = "5511999999999"; // SUBSTITUA PELO SEU NÚMERO

    if (qtdItens === 0) return alert("Carrinho vazio!");
    if (!nome || !endereco) return alert("Por favor, preencha nome e endereço!");
    if (fileInput.files.length === 0 && !window.arquivoColado) return alert("Anexe ou cole o comprovante!");

    let resumo = "";
    for (let p in listaItens) {
        if (listaItens[p] > 0) resumo += `- ${p}: ${listaItens[p]}x\n`;
    }

    const msg = encodeURIComponent(
        `*NOVO PEDIDO - MISTER FRAGRANCE*\n\n` +
        `*CLIENTE:* ${nome}\n` +
        `*ENDEREÇO:* ${endereco}\n\n` +
        `*PRODUTOS:*\n${resumo}\n` +
        `*VALOR TOTAL:* R$ ${totalCents.toFixed(2).replace('.', ',')}\n\n` +
        `_O comprovante foi enviado em anexo._`
    );

    window.open(`https://wa.me/${numeroWhats}?text=${msg}`, '_blank');
}