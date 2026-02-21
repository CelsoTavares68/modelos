  // --- 1. CONFIGURAÇÃO DO MOTOR E CENA ---
const game = new Chess();
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x445566);

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

// --- 2. INTELIGÊNCIA ARTIFICIAL (NÍVEL MESTRE) ---

// Valores base das peças
const weights = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

// Tabelas de Posição (PST) - Ensinam a IA a jogar de forma posicional
const pst = {
    p: [
        [0,  0,  0,  0,  0,  0,  0,  0],
        [50, 50, 50, 50, 50, 50, 50, 50],
        [10, 10, 20, 30, 30, 20, 10, 10],
        [5,  5, 10, 25, 25, 10,  5,  5],
        [0,  0,  0, 20, 20,  0,  0,  0],
        [5, -5,-10,  0,  0,-10, -5,  5],
        [5, 10, 10,-20,-20, 10, 10,  5],
        [0,  0,  0,  0,  0,  0,  0,  0]
    ],
    n: [
        [-50,-40,-30,-30,-30,-30,-40,-50],
        [-40,-20,  0,  0,  0,  0,-20,-40],
        [-30,  0, 10, 15, 15, 10,  0,-30],
        [-30,  5, 15, 20, 20, 15,  5,-30],
        [-30,  0, 15, 20, 20, 15,  0,-30],
        [-30,  5, 10, 15, 15, 10,  5,-30],
        [-40,-20,  0,  5,  5,  0,-20,-40],
        [-50,-40,-30,-30,-30,-30,-40,-50]
    ]
};

function evaluateBoard(gameInstance) {
    let totalEval = 0;
    const board = gameInstance.board();
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const piece = board[i][j];
            if (piece) {
                const val = weights[piece.type] + (pst[piece.type] ? pst[piece.type][i][j] : 0);
                totalEval += (piece.color === 'w' ? val : -val);
            }
        }
    }
    return totalEval;
}

function minimax(gameInstance, depth, alpha, beta, isMaximizing) {
    if (depth === 0) return -evaluateBoard(gameInstance);

    // Ordenação de Jogadas (Move Ordering) para otimizar Alpha-Beta
    const moves = gameInstance.moves().sort((a, b) => {
        if (a.includes('x') && !b.includes('x')) return -1;
        if (!a.includes('x') && b.includes('x')) return 1;
        return 0;
    });

    if (isMaximizing) {
        let bestEval = -Infinity;
        for (const move of moves) {
            gameInstance.move(move);
            bestEval = Math.max(bestEval, minimax(gameInstance, depth - 1, alpha, beta, false));
            gameInstance.undo();
            alpha = Math.max(alpha, bestEval);
            if (beta <= alpha) break;
        }
        return bestEval;
    } else {
        let bestEval = Infinity;
        for (const move of moves) {
            gameInstance.move(move);
            bestEval = Math.min(bestEval, minimax(gameInstance, depth - 1, alpha, beta, true));
            gameInstance.undo();
            beta = Math.min(beta, bestEval);
            if (beta <= alpha) break;
        }
        return bestEval;
    }
}

// --- 3. MOVIMENTAÇÃO E INTERAÇÃO ---

function playAiTurn() {
    if (game.game_over()) return;
    isAiThinking = true;
    turnText.innerText = "IA CALCULANDO ESTRATÉGIA...";
    
    setTimeout(() => {
        const moves = game.moves();
        let bestMove = null;
        let bestValue = -Infinity;

        const diff = document.getElementById('difficulty-level').value;
        const depth = diff === 'hard' ? 3 : 2; 

        for (const move of moves) {
            game.move(move);
            const boardValue = minimax(game, depth - 1, -10000, 10000, false);
            game.undo();
            if (boardValue > bestValue) {
                bestValue = boardValue;
                bestMove = move;
            }
        }

        const moveDetails = game.move(bestMove);
        const p3d = pieces.find(p => toAlgebraic(p.userData.gridX, p.userData.gridZ) === moveDetails.from);
        const pos = fromAlgebraic(moveDetails.to);

        if (moveDetails.captured) {
            const victim = pieces.find(v => v.userData.gridX === pos.x && v.userData.gridZ === pos.z);
            if (victim) { 
                createExplosion(victim.position, victim.userData.originalColor); 
                scene.remove(victim); 
                pieces.splice(pieces.indexOf(victim), 1); 
            }
        }
        
        smoothMove(p3d, pos.x, pos.z, true, () => { finalizeTurn(p3d); isAiThinking = false; });
    }, 250);
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

// --- 4. FUNÇÕES DE SUPORTE (RENDERIZAÇÃO E REGRAS) ---

function createPiece(x, z, color, type, team) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.3 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.15, 16), mat);
    group.add(base);

    // Lógica geométrica para peças
    if (type === 'pawn') {
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), mat);
        head.position.y = 0.5;
        group.add(head);
    } else if (type === 'rook') {
        const tower = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.5), mat);
        tower.position.y = 0.4;
        group.add(tower);
    } else if (type === 'knight') {
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.4), mat);
        head.position.y = 0.4;
        head.rotation.x = 0.5;
        group.add(head);
    } else if (type === 'bishop') {
        const body = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.8, 12), mat);
        body.position.y = 0.45;
        group.add(body);
    } else if (type === 'queen') {
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.3, 1.1, 12), mat);
        body.position.y = 0.6;
        group.add(body);
    } else if (type === 'king') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.3, 0.4), mat);
        body.position.y = 0.7;
        group.add(body);
    }

    group.position.set(x - 3.5, 0.1, z - 3.5);
    group.userData = { gridX: x, gridZ: z, team, type, originalColor: color };
    scene.add(group);
    pieces.push(group);
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
        smoothMove(p, tx, tz, true, () => finalizeTurn(p));
    } else {
        smoothMove(p, p.userData.gridX, p.userData.gridZ, false, () => { deselectPiece(p); selectedPiece = null; });
    }
}

function smoothMove(piece, tx, tz, isLegal, callback) {
    const startPos = piece.position.clone();
    const endPos = new THREE.Vector3(tx - 3.5, 0.1, tz - 3.5);
    let t = 0;
    function step() {
        t += 0.1;
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

function finalizeTurn(p) {
    if(p) deselectPiece(p);
    saveGame();
    updateStatusUI();
    if (document.getElementById('game-mode').value === 'pve' && game.turn() === 'b') playAiTurn();
}

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

function toAlgebraic(x, z) { return ['a','b','c','d','e','f','g','h'][x] + (8-z); }
function fromAlgebraic(s) { return { x: s.charCodeAt(0) - 97, z: 8 - parseInt(s[1]) }; }
function saveGame() { localStorage.setItem('chess3d_save', JSON.stringify({ fen: game.fen(), mode: document.getElementById('game-mode').value })); }
function loadGame() {
    const saved = localStorage.getItem('chess3d_save');
    if (saved) { const data = JSON.parse(saved); game.load(data.fen); document.getElementById('game-mode').value = data.mode; }
    resetGameVisuals();
}

function resetGameVisuals() {
    pieces.forEach(p => scene.remove(p));
    pieces.length = 0;
    const board = game.board();
    const typeMap = { 'p': 'pawn', 'r': 'rook', 'n': 'knight', 'b': 'bishop', 'q': 'queen', 'k': 'king' };
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const square = board[r][c];
            if (square) {
                createPiece(c, r, square.color === 'w' ? 0xffffff : 0x222222, typeMap[square.type], square.color === 'w' ? 'white' : 'black');
            }
        }
    }
    updateStatusUI();
}

function updateStatusUI() {
    turn = game.turn() === 'w' ? 'white' : 'black';
    turnText.innerText = game.game_over() ? "FIM DE JOGO!" : `VEZ DAS ${turn === 'white' ? 'BRANCAS' : 'PRETAS'}`;
}

function onWindowResize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
}

function createExplosion(pos, color) {
    for (let i = 0; i < 15; i++) {
        const p = new THREE.Mesh(new THREE.SphereGeometry(0.05), new THREE.MeshStandardMaterial({ color }));
        p.position.copy(pos);
        const vel = new THREE.Vector3((Math.random()-0.5)*0.2, Math.random()*0.3, (Math.random()-0.5)*0.2);
        scene.add(p);
        particles.push({ mesh: p, vel, life: 1.0 });
    }
}

function selectPiece(p) { p.traverse(n => { if(n.isMesh) n.material.emissive = new THREE.Color(0x004444); }); }
function deselectPiece(p) { if(p) p.traverse(n => { if(n.isMesh) n.material.emissive = new THREE.Color(0x000000); }); }

function animate() {
    requestAnimationFrame(animate);
    if (selectedPiece) selectedPiece.position.y = 0.2 + Math.sin(Date.now() * 0.008) * 0.1;
    particles.forEach((p, i) => {
        p.mesh.position.add(p.vel);
        p.life -= 0.03;
        if (p.life <= 0) { scene.remove(p.mesh); particles.splice(i, 1); }
    });
    renderer.render(scene, camera);
}

// INICIALIZAÇÃO
window.addEventListener('mousedown', (e) => handleInteraction(e.clientX, e.clientY));
window.addEventListener('resize', onWindowResize);
document.getElementById('reset-button').addEventListener('click', resetGame);

createBoard();
loadGame();
animate();