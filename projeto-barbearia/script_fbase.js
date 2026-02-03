// script.js (Firebase Firestore)
// Mantive as funções de agendamento e integrei Firestore para persistência e listagem em tempo real.
// ATENÇÃO: substitua o firebaseConfig com os valores do seu projeto Firebase.

const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_AUTH_DOMAIN",
  projectId: "SEU_PROJECT_ID",
  // ... o resto das chaves
};

// inicializa Firebase
if (!window.firebase || !firebase.apps) {
  // espera que você tenha incluído os scripts compat do Firebase no HTML (veja instruções)
}
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

const COLLECTION = 'agendamentos';

function agendar() {
    const nome = document.getElementById('nome').value;
    const servico = document.getElementById('servico').value;
    const data = document.getElementById('data').value;
    const hora = document.getElementById('hora').value;

    if(!nome || !servico || !data || !hora) {
        alert("Preencha todos os campos!");
        return;
    }

    const timestamp = new Date(`${data}T${hora}`).getTime();
    const agendamento = { nome, servico, data, hora, timestamp, createdAt: firebase.firestore.FieldValue.serverTimestamp() };

    // salva no Firestore
    db.collection(COLLECTION).add(agendamento)
      .then(() => {
         // opcional: feedback para usuário
         alert('Agendamento salvo!');
      })
      .catch(err => {
         console.error('Erro salvando agendamento:', err);
         alert('Erro ao salvar. Veja console.');
      });

    limparCampos();
}

function limparCampos() {
   document.getElementById('nome').value = '';
   document.getElementById('servico').value = '';
   document.getElementById('data').value = '';
   document.getElementById('hora').value = '';
}

// renderiza um card (reaproveita estilo existente)
function renderCard(docData) {
    const lista = document.getElementById('listaAgendamentos');
    const card = document.createElement('div');
    card.className = "agendamento-card";
    card.dataset.timestamp = docData.timestamp || Date.now();

    const partesData = (docData.data || '').split("-");
    const dataBR = partesData.length === 3 ? `${partesData[2]}/${partesData[1]}/${partesData[0]}` : docData.data;

    card.innerHTML = `
      <p><strong>${docData.nome}</strong> agendou <strong>${docData.servico}</strong></p>
      <p> Dia ${dataBR} às ${docData.hora} horas</p>`;

    return card;
}

function attachRealtimeListener() {
    // escuta em tempo real e atualiza a lista
    db.collection(COLLECTION).orderBy('timestamp', 'asc')
      .onSnapshot(snapshot => {
          const lista = document.getElementById('listaAgendamentos');
          lista.innerHTML = '<h2>Agendamentos:</h2>';
          snapshot.forEach(doc => {
              lista.appendChild(renderCard(doc.data()));
          });
      }, err => {
          console.error('Erro ao ler agendamentos:', err);
      });
}

// Opcional: autenticação simples com Google para proteger a visualização do admin
function setupAuthButtons() {
    const btn = document.getElementById('btnLogin');
    if(!btn) return;

    btn.addEventListener('click', () => {
        if (auth.currentUser) {
            auth.signOut();
        } else {
            const provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithPopup(provider).catch(err => console.error(err));
        }
    });

    auth.onAuthStateChanged(user => {
        if (user) {
            btn.textContent = `Sair (${user.displayName})`;
            // se quiser, pode filtrar a visualização apenas para o admin (checar uid/email)
        } else {
            btn.textContent = 'Entrar';
        }
    });
}

// inicializa tudo quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        attachRealtimeListener();
        setupAuthButtons();
    });
} else {
    attachRealtimeListener();
    setupAuthButtons();
}