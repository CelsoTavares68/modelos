 // --- 1. SETUP DO MOTOR E CENA ---
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

let isAiThinking = false;
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
    syncBoard();
}

function resetGame() {
    game.reset();
    localStorage.removeItem('chess3d_save');
    syncBoard();
}

// --- 3. CRIAÇÃO DO TABULEIRO E PEÇAS (ORIGINAIS) ---
function createBoard() {
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const geo = new THREE.BoxGeometry(1, 0.2, 1);
            const mat = new THREE.MeshStandardMaterial({
                color: (i + j) % 2 === 0 ? 0xeeeedd : 0x886644
            });
            const tile = new THREE.Mesh(geo, mat);
            tile.position.set(i - 3.5, -0.1, j - 3.5);
            tile.receiveShadow = true;
            tile.userData = { x: i, z: j };
            scene.add(tile);
            tiles.push(tile);
        }
    }
}

function createPiece(x, z, color, type, team) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.3 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.15, 16), mat);
    group.add(base);

    let body;
    if (type === 'pawn') {
        body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.25, 0.5, 12), mat);
        body.position.y = 0.3;
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), mat);
        head.position.y = 0.65;
        group.add(body, head);
    } else if (type === 'knight') {
        // Seu design de Cavalo original
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.6, 12), mat);
        b.position.y = 0.35;
        const h = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.4, 0.5), mat);
        h.position.set(0, 0.8, 0.1);
        h.rotation.x = -0.3;
        group.add(b, h);
    } else if (type === 'rook') {
        const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.8, 4), mat);
        tower.position.y = 0.45;
        const top = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.35), mat);
        top.position.y = 0.9;
        group.add(tower, top);
    } else if (type === 'bishop') {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.2, 0.9, 12), mat);
        b.position.y = 0.5;
        const hat = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 12), mat);
        hat.position.y = 1.1;
        group.add(b, hat);
    } else if (type === 'queen') {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 1.2, 12), mat);
        b.position.y = 0.65;
        const cb = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.15, 0.2, 12), mat);
        cb.position.y = 1.3;
        group.add(b, cb);
    } else if (type === 'king') {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.3, 1.4, 12), mat);
        b.position.y = 0.75;
        const cv = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.1), mat);
        cv.position.y = 1.6;
        group.add(b, cv);
    }

    group.position.set(x - 3.5, 0.1, z - 3.5);
    group.userData = { gridX: x, gridZ: z, team, type, originalColor: color };
    scene.add(group);
    pieces.push(group);
}

function syncBoard() {
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
    const isWhite = game.turn() === 'w';
    turnText.innerText = isWhite ? "VEZ DAS BRANCAS" : "VEZ DAS PRETAS";
    turnText.style.color = isWhite ? "#fff" : "#aaa";
}

// --- 4. IA INTELIGENTE (MINIMAX) ---
const weights = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
function evaluateBoard(g) {
    let total = 0;
    g.board().forEach(row => row.forEach(p => {
        if (p) total += (p.color === 'w' ? weights[p.type] : -weights[p.type]);
    }));
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
        const depth = document.getElementById('difficulty-level').value === 'hard' ? 3 : 2;
        for (const m of moves) {
            game.move(m);
            const val = minimax(game, depth - 1, -100000, 100000, false);
            game.undo();
            if (val > bestValue) { bestValue = val; bestMove = m; }
        }
        game.move(bestMove);
        syncBoard();
        saveGame();
        isAiThinking = false;
    }, 250);
}

// --- 5. EVENTOS ---
window.addEventListener('mousedown', onMouseDown);
window.addEventListener('touchstart', (e) => onMouseDown(e.touches[0]));

function onMouseDown(e) {
    if (isAiThinking || game.game_over()) return;
    const mode = document.getElementById('game-mode').value;
    if (mode === 'pve' && game.turn() === 'b') return;

    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(tiles.concat(pieces), true);
    if (intersects.length > 0) {
        const obj = intersects[0].object;
        let clickedTile = obj.userData.x !== undefined ? obj : 
                         (obj.parent && obj.parent.userData.gridX !== undefined) ? 
                         tiles.find(t => t.userData.x === obj.parent.userData.gridX && t.userData.z === obj.parent.userData.gridZ) : null;

        if (clickedTile) {
            const x = clickedTile.userData.x;
            const z = clickedTile.userData.z;
            const square = toAlgebraic(x, z);
            const pieceOnSquare = pieces.find(p => p.userData.gridX === x && p.userData.gridZ === z);

            if (selectedPiece) {
                const from = toAlgebraic(selectedPiece.userData.gridX, selectedPiece.userData.gridZ);
                if (game.move({ from, to: square, promotion: 'q' })) {
                    selectedPiece = null;
                    syncBoard();
                    saveGame();
                    if (mode === 'pve') playAiTurn();
                } else { selectedPiece = null; syncBoard(); }
            } else if (pieceOnSquare && pieceOnSquare.userData.team === (game.turn() === 'w' ? 'white' : 'black')) {
                selectedPiece = pieceOnSquare;
                pieceOnSquare.traverse(n => { if(n.isMesh) n.material.emissive.setHex(0x004444); });
            }
        }
    }
}

function onWindowResize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.position.set(0, 12, 10);
    camera.lookAt(0,0,0);
    camera.updateProjectionMatrix();
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

// INICIALIZAÇÃO E BOTÕES
createBoard();
loadGame();
if (pieces.length === 0) resetGame();
onWindowResize();
animate();

window.addEventListener('resize', onWindowResize);
document.getElementById('reset-button').addEventListener('click', resetGame);
document.getElementById('update-button').addEventListener('click', () => {
    window.location.reload(true);
});