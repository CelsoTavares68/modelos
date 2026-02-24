const startBtn = document.getElementById('startBtn');
const inputLang = document.getElementById('inputLang');
const textIn = document.getElementById('textIn');
const textOut = document.getElementById('textOut');
const statusLabel = document.getElementById('statusLabel');
const micIcon = document.getElementById('micIcon');

// Verificar suporte ao navegador
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SpeechRecognition) {
    alert("Ops! Seu navegador não suporta reconhecimento de voz. Tente usar o Google Chrome.");
}

const recognition = new SpeechRecognition();
const synth = window.speechSynthesis;

// Ao clicar no botão de microfone
startBtn.onclick = () => {
    recognition.lang = inputLang.value;
    recognition.start();
};

// Quando começar a ouvir
recognition.onstart = () => {
    startBtn.classList.add('recording');
    micIcon.textContent = "🛑";
    statusLabel.textContent = "Pode falar, estou ouvindo...";
};

// Quando terminar de ouvir (processar o áudio)
recognition.onresult = async (event) => {
    const transcript = event.results[0][0].transcript;
    textIn.textContent = transcript;
    
    // Identifica o código do idioma (en, es, fr)
    const fromLang = inputLang.value.split('-')[0];
    
    statusLabel.textContent = "Traduzindo...";

    try {
        const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(transcript)}&langpair=${fromLang}|pt`);
        const data = await response.json();
        const translatedText = data.responseData.translatedText;

        textOut.textContent = translatedText;
        statusLabel.textContent = "Tradução concluída!";

        // O sistema fala o resultado em português
        const utterance = new SpeechSynthesisUtterance(translatedText);
        utterance.lang = 'pt-BR';
        synth.speak(utterance);

    } catch (error) {
        statusLabel.textContent = "Erro na conexão com a API.";
        console.error(error);
    }
};

// Quando o reconhecimento parar (erro ou fim de fala)
recognition.onend = () => {
    startBtn.classList.remove('recording');
    micIcon.textContent = "🎤";
    if(statusLabel.textContent === "Pode falar, estou ouvindo...") {
        statusLabel.textContent = "Clique para falar novamente";
    }
};