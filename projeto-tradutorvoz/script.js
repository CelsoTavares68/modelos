 const btnForeign = document.getElementById('btnForeign');
const btnMe = document.getElementById('btnMe');
const foreignLangSelect = document.getElementById('foreignLang');
const statusLabel = document.getElementById('statusLabel');

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
const synth = window.speechSynthesis;

// Função Mestra de Tradução
async function processarConversa(fromLang, toLang, displayOriginal, displayTranslated, voiceOutputLang) {
    recognition.lang = fromLang;
    recognition.start();

    recognition.onstart = () => {
        statusLabel.textContent = "Ouvindo...";
    };

    recognition.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        displayOriginal.textContent = transcript;

        const langPair = `${fromLang.split('-')[0]}|${toLang.split('-')[0]}`;
        
        try {
            const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(transcript)}&langpair=${langPair}`);
            const data = await res.json();
            const translatedText = data.responseData.translatedText;

            displayTranslated.textContent = translatedText;

            // O sistema fala a tradução para a outra pessoa ouvir
            const utterance = new SpeechSynthesisUtterance(translatedText);
            utterance.lang = voiceOutputLang;
            synth.speak(utterance);
        } catch (e) {
            console.error("Erro:", e);
        }
    };

    recognition.onend = () => { statusLabel.textContent = "Aguardando próxima fala..."; };
}

// Botão para ouvir o Estrangeiro (Ex: EN -> PT)
btnForeign.onclick = () => {
    processarConversa(
        foreignLangSelect.value, 
        'pt-BR', 
        document.getElementById('textForeign'), 
        document.getElementById('textToPt'), 
        'pt-BR'
    );
};

// Botão para ouvir VOCÊ (PT -> EN/ES/FR)
btnMe.onclick = () => {
    processarConversa(
        'pt-BR', 
        foreignLangSelect.value, 
        document.getElementById('textMe'), 
        document.getElementById('textToForeign'), 
        foreignLangSelect.value
    );
};