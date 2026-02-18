 // 1. Inicialização de dados (Memória do Navegador)
let listaReservas = JSON.parse(localStorage.getItem('hotel_excellence_reservas')) || [];

// 2. Tabela de Preços por Categoria (Preço por noite)
const PRECOS_DIARIA = {
    luxo: 1200,      // 12º Andar
    semi: 850,       // 10º e 11º Andares
    premium: 600,    // 7º, 8º e 9º Andares
    superior: 400,   // 4º, 5º e 6º Andares
    standard: 250    // 1º, 2º e 3º Andares
};

// 3. Função de Navegação entre páginas
function navegar(idPagina) {
    document.querySelectorAll('.pagina-conteudo').forEach(secao => {
        secao.classList.add('hidden');
    });
    document.getElementById('pag-' + idPagina).classList.remove('hidden');
    window.scrollTo(0, 0);
}

// 4. Validação e Cálculo de Dias
function calcularDiferencaDias() {
    const checkinVal = document.getElementById('checkin').value;
    const checkoutVal = document.getElementById('checkout').value;
    
    if (!checkinVal || !checkoutVal) return 0;
    
    const checkin = new Date(checkinVal);
    const checkout = new Date(checkoutVal);
    
    const diffTempo = checkout - checkin;
    const diffDias = Math.ceil(diffTempo / (1000 * 60 * 60 * 24));
    
    return diffDias > 0 ? diffDias : 0;
}

function validarEIrParaMapa() {
    const nome = document.getElementById('nome').value;
    const dias = calcularDiferencaDias();

    if (!nome || dias <= 0) {
        alert("⚠️ Por favor, preencha o nome e selecione datas válidas (mínimo 1 noite).");
        return;
    }

    const formaPagamento = document.getElementById('pagamento').value;
    const statusBox = document.getElementById('status-reserva');
    if (statusBox) {
        statusBox.innerHTML = `
            <p><strong>Hóspede:</strong> ${nome}</p>
            <p><strong>Duração:</strong> ${dias} noite(s)</p>
            <p><strong>Pagamento:</strong> ${formaPagamento}</p>
        `;
    }

    gerarPredio();
    navegar('mapa');
}

// 5. Lógica das Categorias
function definirCategoria(andar) {
    if (andar === 12) return 'luxo';
    if (andar >= 10) return 'semi';
    if (andar >= 7) return 'premium';
    if (andar >= 4) return 'superior';
    return 'standard';
}

// 6. Geração Dinâmica do Prédio
function gerarPredio() {
    const grid = document.getElementById('grid-predio');
    if (!grid) return;
    grid.innerHTML = ""; 

    const numNoites = calcularDiferencaDias();

    for (let andar = 12; andar >= 1; andar--) {
        let categoria = definirCategoria(andar);
        let precoBase = PRECOS_DIARIA[categoria];

        for (let num = 1; num <= 4; num++) {
            const numApto = (andar * 100) + num;
            const div = document.createElement('div');
            const estaReservado = listaReservas.includes(numApto.toString());

            const valorTotalApto = precoBase * numNoites;
            div.innerHTML = `<span>${numApto}</span><small class="preco-tag">R$ ${valorTotalApto}</small>`;
            
            if (estaReservado) {
                div.className = "apt reservado";
                div.onclick = () => alert("❌ Este apartamento já está ocupado.");
            } else {
                div.className = `apt ${categoria}`;
                div.onclick = () => finalizarReserva(numApto.toString(), valorTotalApto, numNoites);
            }
            
            grid.appendChild(div);
        }
    }
}

 // 7. Finalização e Gravação da Reserva com Integração WhatsApp
function finalizarReserva(numeroApto, valorTotal, noites) {
    const nome = document.getElementById('nome').value;
    const pagamento = document.getElementById('pagamento').value;
    const checkin = document.getElementById('checkin').value;
    const checkout = document.getElementById('checkout').value;

    // Mensagem aprimorada solicitando dados de pagamento
    const mensagemTexto = `*NOVA RESERVA - HOTEL EXCELLENCE*%0A` +
        `---------------------------------------%0A` +
        `*Hóspede:* ${nome}%0A` +
        `*Apartamento:* ${numeroApto}%0A` +
        `*Estadia:* ${noites} noite(s)%0A` +
        `*Check-in:* ${checkin}%0A` +
        `*Check-out:* ${checkout}%0A` +
        `*Total:* R$ ${valorTotal.toFixed(2)}%0A` +
        `*Pagamento:* ${pagamento}%0A` +
        `---------------------------------------%0A` +
        `_Por favor, me envie a chave PIX ou dados bancários para a transferência._%0A%0A` +
        `*Obs:* Assim que eu realizar o pagamento, enviarei o comprovante por aqui.`;

    const confirmaMsg = `Confirmar reserva do Quarto ${numeroApto}?\n\nIsso abrirá o seu WhatsApp para solicitar os dados de pagamento.`;

    if (confirm(confirmaMsg)) {
        // Salva na lista de ocupados no navegador
        listaReservas.push(numeroApto.toString());
        localStorage.setItem('hotel_excellence_reservas', JSON.stringify(listaReservas));

        // Configuração do Telefone
        const numeroTelefone = "5545998217903"; 
        const urlWhatsApp = `https://wa.me/${numeroTelefone}?text=${mensagemTexto}`;

        // Abre em nova aba
        window.open(urlWhatsApp, '_blank');
        
        alert("✅ Pedido enviado! Aguarde o retorno do hotel com os dados bancários.");
        
        // Limpa e volta ao início
        document.getElementById('nome').value = "";
        navegar('home');
    }
}

// 8. Função para limpar o hotel
function limparReservas() {
    if (confirm("Deseja libertar todos os quartos do hotel?")) {
        localStorage.removeItem('hotel_excellence_reservas');
        listaReservas = [];
        gerarPredio();
    }
}