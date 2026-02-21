  // --- 1. SETUP DO MOTOR E CENA ---
const game = new Chess();
const scene = new THREE.Scene();
// FUNDO CLAREADO: Definido para um tom de cinza azulado mais claro
scene.background = new THREE.Color(0x445566);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// ILUMINAÇÃO REFORÇADA
scene.add(new THREE.AmbientLight(0xffffff, 0.7)); 
const sun = new THREE.DirectionalLight(0xffffff, 1.2); // CORRIGIDO: Nome da classe Three.js
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

// --- 2. AUXILIARES E PERSISTÊNCIA ---
function toAlgebraic(x, z) {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    return files[x] + ranks[z];
}

function fromAlgebraic(s) {
    return { x: s.charCodeAt(0) - 'a'.charCodeAt(0), z: 8 - parseInt(s[1]) };
}

function saveGame() {
    const gameState = {
        fen: game.fen(),
        mode: document.getElementById('game-mode').value,
        difficulty: document.getElementById('difficulty-level').value
    };
    localStorage.setItem('chess3d_save', JSON.stringify(gameState));
}

function loadGame() {
    const saved = localStorage.getItem('chess3d_save');
    if (saved) {
        const data = JSON.parse(saved);
        game.load(data.fen);
        document.getElementById('game-mode').value = data.mode;
        document.getElementById('difficulty-level').value = data.difficulty;
    }
    
    pieces.forEach(p => scene.remove(p));
    pieces.length = 0;
    
    const board = game.board();
    const typeMap = { 'p': 'pawn', 'r': 'rook', 'n': 'knight', 'b': 'bishop', 'q': 'queen', 'k': 'king' };
    
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const square = board[r][c];
            if (square) {
                const color = square.color === 'w' ? 0xffffff : 0x222222;
                createPiece(c, r, color, typeMap[square.type], square.color === 'w' ? 'white' : 'black');
            }
        }
    }
    updateStatusUI();
}

// --- 3. CRIAÇÃO DAS PEÇAS COM DESIGN DIFERENCIADO ---
function createPiece(x, z, color, type, team) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.3 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.15, 16), mat);
    group.add(base);

    if (type === 'pawn') {
        // PEÃO COM BOLINHA (Esfera no topo)
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.25, 0.5, 12), mat);
        body.position.y = 0.3;
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), mat);
        head.position.y = 0.65;
        group.add(body, head);
    } 
    else if (type === 'rook') {
        // TORRE QUADRADA
        const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.8, 4), mat);
        tower.position.y = 0.45;
        const top = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.35), mat);
        top.position.y = 0.9;
        group.add(tower, top);
    } 
    else if (type === 'knight') {
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.6, 12), mat);
        body.position.y = 0.35;
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.4, 0.5), mat);
        head.position.set(0, 0.8, 0.1);
        head.rotation.x = -0.3;
        group.add(body, head);
    } 
    else if (type === 'bishop') {
        // BISPO PONTIAGUDO
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.2, 0.9, 12), mat);
        body.position.y = 0.5;
        const hat = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 12), mat);
        hat.position.y = 1.1;
        group.add(body, hat);
    } 
    else if (type === 'queen') {
        // RAINHA COM COROA
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 1.2, 12), mat);
        body.position.y = 0.65;
        const crownBase = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.15, 0.2, 12), mat);
        crownBase.position.y = 1.3;
        const crownTop = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8, 0, Math.PI * 2, 0, 1), mat);
        crownTop.position.y = 1.4;
        crownTop.rotation.x = Math.PI;
        group.add(body, crownBase, crownTop);
    } 
    else if (type === 'king') {
        // REI COM CRUZ
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.3, 1.4, 12), mat);
        body.position.y = 0.75;
        const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.1), mat);
        const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.1), mat);
        crossH.position.y = 1.6;
        crossV.position.y = 1.6;
        group.add(body, crossH, crossV);
    }

    group.position.set(x - 3.5, 0.1, z - 3.5);
    group.userData = { gridX: x, gridZ: z, team, type, originalColor: color };
    scene.add(group);
    pieces.push(group);
}

function updatePieceModel(pieceGroup, newType) {
    while(pieceGroup.children.length > 1) { pieceGroup.remove(pieceGroup.children[1]); }
    const mat = new THREE.MeshStandardMaterial({ color: pieceGroup.userData.originalColor });
    pieceGroup.userData.type = newType;
    if (newType === 'queen') {
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 1.2, 12), mat);
        body.position.y = 0.65;
        const crownBase = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.15, 0.2, 12), mat);
        crownBase.position.y = 1.3;
        const crownTop = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8, 0, Math.PI * 2, 0, 1), mat);
        crownTop.position.y = 1.4;
        crownTop.rotation.x = Math.PI;
        pieceGroup.add(body, crownBase, crownTop);
    }
}

// --- 4. MOVIMENTAÇÃO E IA ---
function smoothMove(piece, tx, tz, isLegal, callback) {
    const startPos = piece.position.clone();
    const endPos = new THREE.Vector3(tx - 3.5, 0.1, tz - 3.5);
    let t = 0;
    function step() {
        t += 0.08;
        if (t < 1) {
            piece.position.lerpVectors(startPos, endPos, t);
            requestAnimationFrame(step);
        } else {
            piece.position.copy(endPos);
            if (isLegal) { piece.userData.gridX = tx; piece.userData.gridZ = tz; }
            if (callback) callback();
        }
    }
    step();
}

function tryMove(p, tx, tz) {
    const move = game.move({ from: toAlgebraic(p.userData.gridX, p.userData.gridZ), to: toAlgebraic(tx, tz), promotion: 'q' });
    if (move) {
        selectedPiece = null;
        if (move.captured) {
            const victim = pieces.find(v => v.userData.gridX === tx && v.userData.gridZ === tz && v !== p);
            if (victim) { 
                createExplosion(victim.position, victim.userData.originalColor); 
                scene.remove(victim); 
                pieces.splice(pieces.indexOf(victim), 1); 
            }
        }
        if (move.flags.includes('p')) updatePieceModel(p, 'queen');
        smoothMove(p, tx, tz, true, () => finalizeTurn(p));
    } else {
        smoothMove(p, p.userData.gridX, p.userData.gridZ, false, () => { deselectPiece(p); selectedPiece = null; });
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

        // --- ÚNICA ALTERAÇÃO: Ajuste de Profundidade ---
        // Lê o valor do teu elemento <select id="difficulty-level">
        const diff = document.getElementById('difficulty-level').value;
        const depth = (diff === 'hard') ? 3 : 2; 

        for (const m of moves) {
            game.move(m);
            // Usa a profundidade dinâmica baseada no nível escolhido
            const val = minimax(game, depth - 1, -10000, 10000, false);
            game.undo();
            if (val > bestValue) {
                bestValue = val;
                bestMove = m;
            }
        }
        
        const moveDetails = game.move(bestMove);
        executeAiMove(moveDetails);
    }, 250);
}

// --- 5. INTERAÇÃO E TABULEIRO ---
function createBoard() {
    for (let x = 0; x < 8; x++) {
        for (let z = 0; z < 8; z++) {
            const isBlack = (x + z) % 2 !== 0;
            const tile = new THREE.Mesh(new THREE.BoxGeometry(1, 0.1, 1), new THREE.MeshStandardMaterial({ color: isBlack ? 0x221100 : 0x886644 }));
            tile.position.set(x - 3.5, -0.05, z - 3.5);
            tile.receiveShadow = true;
            tile.userData = { x, z };
            scene.add(tile);
            tiles.push(tile);
        }
    }
}

function handleInteraction(clientX, clientY) {
    if (isAiThinking || game.game_over()) return;
    const now = Date.now();
    if (now - lastInteractionTime < 100) return;
    lastInteractionTime = now;

    mouse.x = (clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const pieceHits = raycaster.intersectObjects(pieces, true);
    const tileHits = raycaster.intersectObjects(tiles);

    if (pieceHits.length > 0) {
        let obj = pieceHits[0].object;
        while (obj.parent && !obj.userData.team) obj = obj.parent;
        if (obj.userData.team === turn) {
            if (selectedPiece) deselectPiece(selectedPiece);
            selectedPiece = obj;
            selectPiece(selectedPiece);
        } else if (selectedPiece) {
            tryMove(selectedPiece, obj.userData.gridX, obj.userData.gridZ);
        }
    } else if (selectedPiece && tileHits.length > 0) {
        tryMove(selectedPiece, tileHits[0].object.userData.x, tileHits[0].object.userData.z);
    }
}

window.addEventListener('touchstart', (e) => { if(e.touches.length > 0) handleInteraction(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
window.addEventListener('mousedown', (e) => { if (e.detail !== 0) handleInteraction(e.clientX, e.clientY); });

function updateStatusUI() {
    if (game.game_over()) {
        const winner = game.turn() === 'w' ? 'PRETAS' : 'BRANCAS';
        turnText.innerText = game.in_checkmate() ? `MATE! VITÓRIA DAS ${winner}` : "FIM DE JOGO!";
    } else {
        turn = game.turn() === 'w' ? 'white' : 'black';
        turnText.innerText = `VEZ DAS ${turn === 'white' ? 'BRANCAS' : 'PRETAS'}`;
    }
}

function finalizeTurn(p) {
    if(p) deselectPiece(p);
    saveGame();
    updateStatusUI();
    if (document.getElementById('game-mode').value === 'pve' && game.turn() === 'b') playAiTurn();
}

function resetGame() {
    localStorage.removeItem('chess3d_save');
    game.reset();
    pieces.forEach(p => scene.remove(p));
    pieces.length = 0;
    const layout = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
    for (let i = 0; i < 8; i++) {
        createPiece(i, 0, 0x222222, layout[i], 'black');
        createPiece(i, 1, 0x222222, 'pawn', 'black');
        createPiece(i, 6, 0xffffff, 'pawn', 'white');
        createPiece(i, 7, 0xffffff, layout[i], 'white');
    }
    updateStatusUI();
}

document.getElementById('reset-button').addEventListener('click', resetGame);

function onWindowResize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    if (h > w) { camera.fov = 55; camera.position.set(0, 16, 11); }
    else if (w >= 768 && w <= 1024) { camera.fov = 50; camera.position.set(0, 15, 12); }
    else { camera.fov = 45; camera.position.set(0, 12, 10); }
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
}
window.addEventListener('resize', onWindowResize);

// --- 6. ANIMAÇÃO ---
function selectPiece(p) { p.traverse(n => { if(n.isMesh) n.material.emissive = new THREE.Color(0x004444); }); }
function deselectPiece(p) { if(p) p.traverse(n => { if(n.isMesh) n.material.emissive = new THREE.Color(0x000000); }); }

function createExplosion(pos, color) {
    for (let i = 0; i < 15; i++) {
        const p = new THREE.Mesh(new THREE.SphereGeometry(0.05), new THREE.MeshStandardMaterial({ color }));
        p.position.copy(pos);
        const vel = new THREE.Vector3((Math.random()-0.5)*0.2, Math.random()*0.3, (Math.random()-0.5)*0.2);
        scene.add(p);
        particles.push({ mesh: p, vel, life: 1.0 });
    }
}

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

 // Lógica do botão de atualização forçada
document.getElementById('update-button').addEventListener('click', () => {
    // Feedback visual imediato
    document.getElementById('update-button').innerText = "A atualizar...";
    
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
            for (let registration of registrations) {
                registration.unregister(); 
            }
            caches.keys().then(names => {
                for (let name of names) caches.delete(name);
            });
        });
    }
    
    // O setTimeout dá tempo para os processos de cache limparem antes do reload
    setTimeout(() => {
        window.location.reload(true);
    }, 300);
});