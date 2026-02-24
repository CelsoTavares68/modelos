 const btnForeign = document.getElementById('btnForeign');
const btnMe = document.getElementById('btnMe');
const foreignLangSelect = document.getElementById('foreignLang');
const statusLabel = document.getElementById('statusLabel');

const textForeign = document.getElementById('textForeign');
const textToPt = document.getElementById('textToPt');
const textMe = document.getElementById('textMe');
const textToForeign = document.getElementById('textToForeign');

const historyPanel = document.getElementById('historyPanel');
const toggleHistory = document.getElementById('toggleHistory');
const historyList = document.getElementById('historyList');
const clearHistory = document.getElementById('clearHistory');
const downloadPdfBtn = document.getElementById('downloadPdf');

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
const synth = window.speechSynthesis;

async function processarConversa(fromLang, toLang, displayOriginal, displayTranslated, voiceOutputLang) {
    try {
        recognition.lang = fromLang;
        recognition.start();
    } catch (e) {
        console.error("Reconhecimento já ativo.");
        return;
    }

    recognition.onstart = () => {
        statusLabel.textContent = "🎙️ Ouvindo...";
        if (fromLang === 'pt-BR') btnMe.classList.add('recording');
        else btnForeign.classList.add('recording');
    };

    recognition.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        displayOriginal.textContent = transcript;
        statusLabel.textContent = "⏳ Traduzindo...";

        const langFromCode = fromLang.split('-')[0];
        const langToCode = toLang.split('-')[0];
        
        try {
            const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(transcript)}&langpair=${langFromCode}|${langToCode}`;
            const res = await fetch(url);
            const data = await res.json();
            const translatedText = data.responseData.translatedText;

            displayTranslated.textContent = translatedText;
            adicionarAoHistorico(transcript, translatedText, fromLang);

            const utterance = new SpeechSynthesisUtterance(translatedText);
            utterance.lang = voiceOutputLang;
            synth.speak(utterance);
            
            statusLabel.textContent = "✅ Pronto!";
        } catch (error) {
            statusLabel.textContent = "❌ Erro na tradução.";
        }
    };

    recognition.onend = () => {
        btnMe.classList.remove('recording');
        btnForeign.classList.remove('recording');
        setTimeout(() => { statusLabel.textContent = "Aguardando próxima fala..."; }, 2000);
    };
}

function adicionarAoHistorico(original, traduzido, lang) {
    const item = document.createElement('div');
    item.classList.add('history-item');
    const dataHora = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    item.innerHTML = `<small>${dataHora} - Idioma: ${lang}</small><br><b>Orig:</b> ${original}<br><b>Trad:</b> ${traduzido}`;
    historyList.prepend(item);
}

toggleHistory.onclick = () => {
    historyPanel.classList.toggle('history-visible');
    toggleHistory.textContent = historyPanel.classList.contains('history-visible') ? "🔼 Esconder Histórico" : "📜 Ver Histórico";
};

clearHistory.onclick = () => { historyList.innerHTML = ""; };

btnForeign.onclick = () => processarConversa(foreignLangSelect.value, 'pt-BR', textForeign, textToPt, 'pt-BR');
btnMe.onclick = () => processarConversa('pt-BR', foreignLangSelect.value, textMe, textToForeign, foreignLangSelect.value);

downloadPdfBtn.onclick = () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Relatório de Tradução", 20, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, 20, 30);
    doc.line(20, 35, 190, 35);

    const itens = document.querySelectorAll('.history-item');
    let y = 45;

    itens.forEach((item) => {
        if (y > 270) { doc.addPage(); y = 20; }
        const info = item.querySelector('small').textContent;
        const textoOriginal = item.innerText.split('Trad:')[0].split('Orig:')[1].trim();
        const textoTraduzido = item.innerText.split('Trad:')[1].trim();

        doc.setFont(undefined, 'bold');
        doc.text(info, 20, y);
        y += 7;
        doc.setFont(undefined, 'normal');
        doc.text(`Original: ${textoOriginal}`, 25, y);
        y += 7;
        doc.setTextColor(26, 115, 232);
        doc.text(`Tradução: ${textoTraduzido}`, 25, y);
        doc.setTextColor(0);
        y += 12;
    });
    doc.save(`conversa.pdf`);
};