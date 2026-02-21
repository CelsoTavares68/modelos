  // --- 1. SETUP DO MOTOR E CENA (ORIGINAL) ---
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
const pieces = []; 
const tiles = [];
const particles = []; 
let selectedPiece = null;

const turnText = document.getElementById('turn-indicator');
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// --- 2. INTELIGÊNCIA ARTIFICIAL (ALGO QUE ADICIONAMOS) ---

const weights = { p: 10, n: 30, b: 30, r: 50, q: 90, k: 900 };

function evaluateBoard(g) {
    let total = 0;
    const board = g.board();
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const p = board[i][j];
            if (p) {
                const val = weights[p.type];
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

// FUNÇÃO ATUALIZADA COM O SELETOR DE DIFICULDADE
function playAiTurn() {
    if (game.game_over()) return;
    isAiThinking = true;
    turnText.innerText = "PC A PENSAR...";

    setTimeout(() => {
        const moves = game.moves();
        let bestMove = null;
        let bestValue = -Infinity;

        // Lógica de Dificuldade implementada sem mexer no resto
        const diffElement = document.getElementById('difficulty-level');
        const depth = (diffElement && diffElement.value === 'hard') ? 3 : 2;

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
    }, 500);
}

// --- 3. PEÇAS E TABULEIRO (IDÊNTICO AO SEU ARQUIVO ORIGINAL) ---

function createPiece(x, z, color, type, team) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.3 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.15, 16), mat);
    base.castShadow = true;
    group.add(base);

    let body;
    if (type === 'king' || type === 'queen') {
        body = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.3, 1, 12), mat);
    } else {
        body = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 12), mat);
    }
    body.position.y = 0.5;
    body.castShadow = true;
    group.add(body);

    group.position.set(x - 3.5, 0.1, z - 3.5);
    group.userData = { gridX: x, gridZ: z, team, type, originalColor: color };
    scene.add(group);
    pieces.push(group);
}

function createBoard() {
    for (let x = 0; x < 8; x++) {
        for (let z = 0; z < 8; z++) {
            const isDark = (x + z) % 2 !== 0;
            const tile = new THREE.Mesh(
                new THREE.BoxGeometry(1, 0.1, 1),
                new THREE.MeshStandardMaterial({ color: isDark ? 0x221100 : 0x886644 })
            );
            tile.position.set(x - 3.5, -0.05, z - 3.5);
            tile.receiveShadow = true;
            tile.userData = { x, z };
            scene.add(tile);
            tiles.push(tile);
        }
    }
}

// --- 4. MOVIMENTAÇÃO E AUXILIARES (IDÊNTICO AO ORIGINAL) ---

function toAlgebraic(x, z) { return String.fromCharCode(97 + x) + (8 - z); }
function fromAlgebraic(s) { return { x: s.charCodeAt(0) - 97, z: 8 - parseInt(s[1]) }; }

function executeMove(move) {
    const p3d = pieces.find(p => toAlgebraic(p.userData.gridX, p.userData.gridZ) === move.from);
    const targetPos = fromAlgebraic(move.to);

    if (move.captured) {
        const victim = pieces.find(v => v.userData.gridX === targetPos.x && v.userData.gridZ === targetPos.z && v !== p3d);
        if (victim) {
            createExplosion(victim.position, victim.userData.originalColor);
            scene.remove(victim);
            pieces.splice(pieces.indexOf(victim), 1);
        }
    }

    animateMove(p3d, targetPos.x, targetPos.z, () => {
        p3d.userData.gridX = targetPos.x;
        p3d.userData.gridZ = targetPos.z;
        finalizeTurn();
    });
}

function animateMove(obj, tx, tz, cb) {
    const start = obj.position.clone();
    const end = new THREE.Vector3(tx - 3.5, 0.1, tz - 3.5);
    let t = 0;
    function step() {
        t += 0.1;
        if (t < 1) {
            obj.position.lerpVectors(start, end, t);
            obj.position.y += Math.sin(t * Math.PI) * 0.5;
            requestAnimationFrame(step);
        } else {
            obj.position.copy(end);
            cb();
        }
    }
    step();
}

function finalizeTurn() {
    if (selectedPiece) deselectPiece(selectedPiece);
    selectedPiece = null;
    isAiThinking = false;
    updateStatus();
    saveGame();
    if (document.getElementById('game-mode').value === 'pve' && game.turn() === 'b') {
        playAiTurn();
    }
}

function updateStatus() {
    if (game.game_over()) {
        turnText.innerText = "FIM DE JOGO!";
    } else {
        turnText.innerText = game.turn() === 'w' ? "VEZ DAS BRANCAS" : "VEZ DAS PRETAS";
    }
}

// --- 5. PERSISTÊNCIA (ORIGINAL) ---

function saveGame() {
    localStorage.setItem('chess_fen', game.fen());
}

function loadGame() {
    const saved = localStorage.getItem('chess_fen');
    if (saved) {
        game.load(saved);
        rebuildPiecesFromFen();
    }
}

function rebuildPiecesFromFen() {
    pieces.forEach(p => scene.remove(p));
    pieces.length = 0;
    const board = game.board();
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const p = board[i][j];
            if (p) {
                const color = p.color === 'w' ? 0xffffff : 0x222222;
                const team = p.color === 'w' ? 'white' : 'black';
                const typeMap = {p:'pawn', r:'rook', n:'knight', b:'bishop', q:'queen', k:'king'};
                createPiece(j, i, color, typeMap[p.type], team);
            }
        }
    }
}

function resetGame() {
    localStorage.removeItem('chess_fen');
    game.reset();
    rebuildPiecesFromFen();
    updateStatus();
}

// --- 6. EVENTOS E INTERAÇÃO ---

window.addEventListener('mousedown', onPointerDown);
window.addEventListener('touchstart', (e) => onPointerDown(e.touches[0]));

function onPointerDown(e) {
    if (isAiThinking || game.game_over()) return;
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const intersectsPieces = raycaster.intersectObjects(pieces, true);
    const intersectsTiles = raycaster.intersectObjects(tiles);

    if (intersectsPieces.length > 0) {
        let clicked = intersectsPieces[0].object;
        while (clicked.parent && !clicked.userData.team) clicked = clicked.parent;
        
        if (clicked.userData.team === (game.turn() === 'w' ? 'white' : 'black')) {
            if (selectedPiece) deselectPiece(selectedPiece);
            selectedPiece = clicked;
            selectPiece(selectedPiece);
        } else if (selectedPiece) {
            handleMoveAttempt(selectedPiece, clicked.userData.gridX, clicked.userData.gridZ);
        }
    } else if (intersectsTiles.length > 0 && selectedPiece) {
        handleMoveAttempt(selectedPiece, intersectsTiles[0].object.userData.x, intersectsTiles[0].object.userData.z);
    }
}

function handleMoveAttempt(p, tx, tz) {
    const move = game.move({ from: toAlgebraic(p.userData.gridX, p.userData.gridZ), to: toAlgebraic(tx, tz), promotion: 'q' });
    if (move) {
        executeMove(move);
    } else {
        deselectPiece(selectedPiece);
        selectedPiece = null;
    }
}

function onWindowResize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.position.set(0, (camera.aspect < 1 ? 16 : 12), (camera.aspect < 1 ? 10 : 12));
    camera.lookAt(0,0,0);
    camera.updateProjectionMatrix();
}
window.addEventListener('resize', onWindowResize);

function selectPiece(p) { p.traverse(n => { if(n.isMesh) n.material.emissive.setHex(0x004444); }); }
function deselectPiece(p) { if(p) p.traverse(n => { if(n.isMesh) n.material.emissive.setHex(0x000000); }); }

function createExplosion(pos, color) {
    for (let i = 0; i < 10; i++) {
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
        if (p.life <= 0) { scene.remove(p.mesh); particles.splice(i, 1); }
    });
    renderer.render(scene, camera);
}

// INICIALIZAÇÃO FINAL
createBoard();
loadGame();
if (pieces.length === 0) resetGame();
onWindowResize();
animate();

document.getElementById('reset-button').addEventListener('click', resetGame);
document.getElementById('update-button').addEventListener('click', () => {
    window.location.reload(true);
});