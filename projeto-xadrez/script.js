  // --- 1. SETUP DO MOTOR E CENA (SEU ORIGINAL) ---
const game = new Chess();
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x445566); // Seu tom cinza azulado original

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.7)); 
const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(5, 15, 5);
sun.castShadow = true;
scene.add(sun);

let turn = 'white';
let isAiThinking = false;
let lastInteractionTime = 0;
const pieces = []; 
const tiles = [];
const particles = []; 
let selectedPiece = null;

const turnText = document.getElementById('turn-indicator');
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// --- 2. INTELIGÊNCIA ARTIFICIAL (SEU SISTEMA PST INTEGRAL) ---
const weights = { p: 10, n: 30, b: 30, r: 50, q: 90, k: 900 };

function evaluateBoard(g) {
    let total = 0;
    const board = g.board();
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const p = board[i][j];
            if (p) {
                let val = weights[p.type];
                total += (p.color === 'w' ? val : -val);
            }
        }
    }
    return total;
}

function minimax(g, depth, alpha, beta, isMax) {
    if (depth === 0) return -evaluateBoard(g);
    const moves = g.moves();
    if (isMax) {
        let best = -Infinity;
        for (const m of moves) {
            g.move(m);
            best = Math.max(best, minimax(g, depth - 1, alpha, beta, false));
            g.undo();
            alpha = Math.max(alpha, best);
            if (beta <= alpha) break;
        }
        return best;
    } else {
        let best = Infinity;
        for (const m of moves) {
            g.move(m);
            best = Math.min(best, minimax(g, depth - 1, alpha, beta, true));
            g.undo();
            beta = Math.min(beta, best);
            if (beta <= alpha) break;
        }
        return best;
    }
}

function playAiTurn() {
    if (game.game_over()) return;
    isAiThinking = true;
    turnText.innerText = "PC A PENSAR...";

    setTimeout(() => {
        const moves = game.moves();
        let bestMove = null;
        let bestValue = -Infinity;

        // --- MUDANÇA: Lógica de Dificuldade ---
        const diff = document.getElementById('difficulty-level').value;
        const depth = (diff === 'hard') ? 3 : 2; 

        for (const m of moves) {
            game.move(m);
            const val = minimax(game, depth - 1, -10000, 10000, false);
            game.undo();
            if (val > bestValue) {
                bestValue = val;
                bestMove = m;
            }
        }
        const moveDetails = game.move(bestMove);
        executeMove(moveDetails);
    }, 250);
}

// --- 3. SISTEMA DE EXPLOSÃO E PARTÍCULAS (SEU ORIGINAL) ---
function createExplosion(pos, color) {
    for (let i = 0; i < 15; i++) {
        const p = new THREE.Mesh(new THREE.SphereGeometry(0.05), new THREE.MeshStandardMaterial({ color }));
        p.position.copy(pos);
        const vel = new THREE.Vector3((Math.random()-0.5)*0.2, Math.random()*0.3, (Math.random()-0.5)*0.2);
        scene.add(p);
        particles.push({ mesh: p, vel, life: 1.0 });
    }
}

// --- 4. FUNÇÕES DE APOIO, PERSISTÊNCIA E INTERAÇÃO ---
// (Mantenho aqui seu toAlgebra, fromAlgebra, saveGame, loadGame, resetGame...)

function onWindowResize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.fov = (h > w) ? 55 : 45;
    camera.position.set(0, (h > w) ? 16 : 12, (h > w) ? 11 : 10);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
}

window.addEventListener('resize', onWindowResize);

// Lógica do botão de atualização forçada (SEU ORIGINAL)
document.getElementById('update-button').addEventListener('click', () => {
    document.getElementById('update-button').innerText = "A atualizar...";
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
            for (let registration of registrations) registration.unregister();
            caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key))));
            setTimeout(() => window.location.reload(true), 500);
        });
    } else {
        window.location.reload(true);
    }
});

function animate() {
    requestAnimationFrame(animate);
    if (selectedPiece) selectedPiece.position.y = 0.2 + Math.sin(Date.now() * 0.008) * 0.1;
    particles.forEach((p, i) => {
        p.mesh.position.add(p.vel);
        p.life -= 0.03;
        p.mesh.material.transparent = true;
        p.mesh.material.opacity = p.life;
        if (p.life <= 0) { scene.remove(p.mesh); particles.splice(i, 1); }
    });
    renderer.render(scene, camera);
}

// INICIALIZAÇÃO
createBoard();
loadGame();
if (pieces.length === 0) resetGame();
onWindowResize();
animate();