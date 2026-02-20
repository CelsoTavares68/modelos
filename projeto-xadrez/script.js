 // --- 1. SETUP DO MOTOR E CENA ---
const game = new Chess();
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x223344);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const sun = new THREE.DirectionalLight(0xffffff, 1);
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
    
    // Limpa peças atuais e recria baseada no estado carregado
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

// --- 3. CRIAÇÃO DO MUNDO ---
function createBoard() {
    for (let x = 0; x < 8; x++) {
        for (let z = 0; z < 8; z++) {
            const isBlack = (x + z) % 2 !== 0;
            const tile = new THREE.Mesh(
                new THREE.BoxGeometry(1, 0.1, 1),
                new THREE.MeshStandardMaterial({ color: isBlack ? 0x221100 : 0x886644 })
            );
            tile.position.set(x - 3.5, -0.05, z - 3.5);
            tile.receiveShadow = true;
            tile.userData = { x, z };
            scene.add(tile);
            tiles.push(tile);
        }
    }
}

function createPiece(x, z, color, type, team) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.15, 12), mat);
    group.add(base);

    if (type === 'pawn') {
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.25, 0.6, 8), mat);
        body.position.y = 0.35;
        group.add(body);
    } else if (type === 'rook') {
        const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.8, 6), mat);
        tower.position.y = 0.45;
        group.add(tower);
    } else if (type === 'knight') {
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.7, 8), mat);
        body.position.y = 0.4;
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.4, 0.5), mat);
        head.position.set(0, 0.8, 0.1);
        group.add(body, head);
    } else if (type === 'bishop') {
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.2, 0.9, 8), mat);
        body.position.y = 0.5;
        group.add(body);
    } else if (type === 'queen') {
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.25, 1.1, 8), mat);
        body.position.y = 0.6;
        group.add(body);
    } else if (type === 'king') {
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.3, 1.2, 8), mat);
        body.position.y = 0.65;
        const cross = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.1), mat);
        cross.position.y = 1.4;
        group.add(body, cross);
    }

    group.position.set(x - 3.5, 0.1, z - 3.5);
    group.userData = { gridX: x, gridZ: z, team, type, originalColor: color };
    scene.add(group);
    pieces.push(group);
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
        const currentMovingPiece = p;
        selectedPiece = null; 

        if (move.captured) {
            const victim = pieces.find(v => v.userData.gridX === tx && v.userData.gridZ === tz && v !== p);
            if (victim) { 
                createExplosion(victim.position, victim.userData.originalColor); 
                scene.remove(victim); 
                pieces.splice(pieces.indexOf(victim), 1); 
            }
        }
        smoothMove(currentMovingPiece, tx, tz, true, () => finalizeTurn(currentMovingPiece));
    } else {
        smoothMove(p, p.userData.gridX, p.userData.gridZ, false, () => {
            deselectPiece(p);
            selectedPiece = null;
        });
    }
}

function playAiTurn() {
    if (game.game_over()) return;
    isAiThinking = true;
    turnText.innerText = "PC A ANALISAR...";
    
    setTimeout(() => {
        const moves = game.moves({ verbose: true });
        if (moves.length === 0) return;

        const difficulty = document.getElementById('difficulty-level').value;
        let selectedMove = difficulty === 'easy' ? moves[Math.floor(Math.random() * moves.length)] : moves[0]; 

        game.move(selectedMove);
        const p3d = pieces.find(p => toAlgebraic(p.userData.gridX, p.userData.gridZ) === selectedMove.from);
        const pos = fromAlgebraic(selectedMove.to);

        if (selectedMove.captured) {
            const victim = pieces.find(v => v.userData.gridX === pos.x && v.userData.gridZ === pos.z);
            if (victim) { 
                createExplosion(victim.position, victim.userData.originalColor); 
                scene.remove(victim); 
                pieces.splice(pieces.indexOf(victim), 1); 
            }
        }

        smoothMove(p3d, pos.x, pos.z, true, () => {
            finalizeTurn(p3d);
            isAiThinking = false;
        });
    }, 600);
}

// --- 5. INTERAÇÃO E UI ---
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
    selectedPiece = null;
    saveGame();
    updateStatusUI();
    if (document.getElementById('game-mode').value === 'pve' && game.turn() === 'b') playAiTurn();
}

function resetGame() {
    localStorage.removeItem('chess3d_save');
    game.reset();
    pieces.forEach(p => scene.remove(p));
    pieces.length = 0;
    selectedPiece = null;
    isAiThinking = false;
    
    // Layout inicial padrão
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

// Listeners unificados
window.addEventListener('touchstart', (e) => {
    if(e.touches.length > 0) handleInteraction(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: true });

window.addEventListener('mousedown', (e) => {
    if (e.detail === 0) return; 
    handleInteraction(e.clientX, e.clientY);
});

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

createBoard();
loadGame(); // Carrega o jogo salvo ou inicia novo
if (pieces.length === 0) resetGame(); // Garante peças se o save estiver vazio
onWindowResize();
animate();