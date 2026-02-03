  // script.js
// Mantive suas funções de agendamento e acrescentei o slider automático com botões e indicadores

// --- Funções existentes de agendamento ---
 function agendar() {
    // 1. Captura os valores dos inputs
    const nome = document.getElementById('nome').value;
    const servico = document.getElementById('servico').value;
    const data = document.getElementById('data').value;
    const hora = document.getElementById('hora').value;

    // 2. Validação simples
    if (!nome || !servico || !data || !hora) {
        alert("Preencha todos os campos!");
        return;
    }

    // --- BLOCO NODE.JS: Envia para o terminal ---
    const dadosParaTerminal = { nome, servico, data, hora };

    fetch('http://192.168.1.7:3000/agendar', { 
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dadosParaTerminal)
})
    .then(response => {
        if (!response.ok) throw new Error('Servidor offline');
        return response.json();
    })
    .then(dados => console.log("Resposta do Terminal:", dados.message))
    .catch(erro => console.warn("Aviso: O agendamento não foi enviado ao terminal (o servidor Node está ligado?)"));
    // --------------------------------------------

    // 3. Lógica original de exibição na tela (HTML/DOM)
    const lista = document.getElementById('listaAgendamentos');
    const timestamp = new Date(`${data}T${hora}`).getTime();

    const card = document.createElement('div');
    card.className = "agendamento-card";
    card.dataset.timestamp = timestamp;

    const partesData = data.split("-");
    const dataBR = `${partesData[2]}/${partesData[1]}/${partesData[0]}`;

    card.innerHTML = `
        <p><strong>${nome}</strong> agendou <strong>${servico}</strong></p>
        <p> Dia ${dataBR} às ${hora} horas</p>
    `;

    // 4. Lógica de ordenação por horário
    let inserido = false;
    const cardsExistentes = lista.querySelectorAll('.agendamento-card');
    for (let c of cardsExistentes) {
        if (timestamp < parseInt(c.dataset.timestamp)) {
            lista.insertBefore(card, c);
            inserido = true;
            break;
        }
    }

    if (!inserido) {
        lista.appendChild(card);
    }

    // 5. Limpa os campos após o sucesso
    limparCampos();
}

    if(!inserido) {
        lista.appendChild(card);
    }

    

function limparCampos() {
   document.getElementById('nome').value = '';
   document.getElementById('servico').value = '';
   document.getElementById('data').value = '';
   document.getElementById('hora').value = '';
}

// --- Slider automático das imagens (abaixo do header) com botões e indicadores ---
(function() {
    let slides = [];
    let current = 0;
    let slideInterval = null;
    const DEFAULT_INTERVAL = 3000; // tempo em ms entre slides
    let indicatorsContainer = null;

    function initSlider() {
        slides = Array.from(document.querySelectorAll('.item .foto'));
        if (!slides.length) return;

        // indicadores
        indicatorsContainer = document.querySelector('.slider-indicators');
        createIndicators();

        // garante que exista exatamente um ativo no início
        const activeIndex = slides.findIndex(s => s.classList.contains('active'));
        current = activeIndex >= 0 ? activeIndex : 0;
        showSlide(current);

        // iniciar autoplay
        startSlider(DEFAULT_INTERVAL);

        // pausa ao passar o mouse e retoma ao sair (no wrapper para cobrir botões também)
        const wrapper = document.querySelector('.slider-wrapper');
        if (wrapper) {
            wrapper.addEventListener('mouseenter', stopSlider);
            wrapper.addEventListener('mouseleave', () => startSlider(DEFAULT_INTERVAL));
        }

        // clique em uma imagem para ir até ela
        slides.forEach((s, i) => {
            s.addEventListener('click', () => {
                showSlide(i);
                restartSlider(DEFAULT_INTERVAL);
            });
        });

        // botões prev/next visíveis
        const prevBtn = document.querySelector('.slider-btn.prev');
        const nextBtn = document.querySelector('.slider-btn.next');
        if (prevBtn) prevBtn.addEventListener('click', () => { prevSlide(); restartSlider(DEFAULT_INTERVAL); });
        if (nextBtn) nextBtn.addEventListener('click', () => { nextSlide(); restartSlider(DEFAULT_INTERVAL); });

        // navegação por teclas <- e ->
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight') {
                nextSlide();
                restartSlider(DEFAULT_INTERVAL);
            } else if (e.key === 'ArrowLeft') {
                prevSlide();
                restartSlider(DEFAULT_INTERVAL);
            }
        });
    }

    function createIndicators() {
        if (!indicatorsContainer) return;
        indicatorsContainer.innerHTML = '';
        slides.forEach((_, i) => {
            const dot = document.createElement('button');
            dot.className = 'dot';
            dot.setAttribute('aria-label', `Ir para slide ${i+1}`);
            dot.dataset.index = i;
            dot.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.dataset.index, 10);
                showSlide(idx);
                restartSlider(DEFAULT_INTERVAL);
            });
            indicatorsContainer.appendChild(dot);
        });
    }

    function updateIndicators() {
        if (!indicatorsContainer) return;
        const dots = Array.from(indicatorsContainer.children);
        dots.forEach(d => d.classList.remove('active'));
        const activeDot = dots[current];
        if (activeDot) activeDot.classList.add('active');
    }

    function showSlide(index) {
        if (!slides.length) return;
        slides.forEach(s => s.classList.remove('active'));
        const i = ((index % slides.length) + slides.length) % slides.length; // seguro para negativos
        slides[i].classList.add('active');
        current = i;
        updateIndicators();
    }

    function nextSlide() {
        showSlide(current + 1);
    }

    function prevSlide() {
        showSlide(current - 1);
    }

    function startSlider(ms) {
        stopSlider();
        slideInterval = setInterval(nextSlide, ms);
    }

    function stopSlider() {
        if (slideInterval) {
            clearInterval(slideInterval);
            slideInterval = null;
        }
    }

    function restartSlider(ms) {
        stopSlider();
        startSlider(ms);
    }

    // inicializa quando DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSlider);
    } else {
        initSlider();
    }

    // export simples para console (útil para debug)
    window.__simpleSlider = {
        start: () => startSlider(DEFAULT_INTERVAL),
        stop: stopSlider,
        next: nextSlide,
        prev: prevSlide,
        goTo: (i) => showSlide(i)
    };
})();