 // --- 1. SETUP DO MOTOR E CENA ---
const game = new Chess();
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e); 

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; 
document.body.appendChild(renderer.domElement);

// ILUMINAÇÃO AJUSTADA (BRILHO REDUZIDO PARA O CINZA)
scene.add(new THREE.AmbientLight(0xffffff, 0.4)); 
const sun = new THREE.DirectionalLight(0xffffff, 0.8); 
sun.position.set(5, 12, 8); 
sun.castShadow = true;
sun.shadow.mapSize.width = 1024;
sun.shadow.mapSize.height = 1024;
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

// --- 2. INTELIGÊNCIA ARTIFICIAL (DIFICULDADE APRIMORADA) ---
const weights = { p: 10, n: 32, b: 33, r: 50, q: 90, k: 900 };

// Tabelas de peso por posição (torna a IA mais estratégica no centro)
const boardValues = [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [5, 10, 10, -20, -20, 10, 10,  5],
    [5, -5, -10,  0,  0, -10, -5,  5],
    [0,  0,  0, 20, 20,  0,  0,  0],
    [5,  5, 10, 25, 25, 10,  5,  5],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [0,  0,  0,  0,  0,  0,  0,  0]
];

function evaluateBoard(currentBoard) {
    let totalEval = 0;
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const piece = currentBoard[i][j];
            if (piece) {
                // Soma o valor da peça + o bônus de posição
                const val = weights[piece.type] + (piece.color === 'w' ? boardValues[7-i][j] : boardValues[i][j]);
                totalEval += (piece.color === 'w' ? val : -val);
            }
        }
    }
    return totalEval;
}

function minimax(gameInstance, depth, alpha, beta, isMaximizing) {
    if (depth === 0) return -evaluateBoard(gameInstance.board());
    
    const moves = gameInstance.moves();
    
    // Se não houver movimentos, verifica se é xeque-mate ou empate
    if (moves.length === 0) {
        if (gameInstance.in_checkmate()) return isMaximizing ? -9999 : 9999;
        return 0;
    }

    if (isMaximizing) {
        let bestEval = -10000;
        for (const move of moves) {
            gameInstance.move(move);
            bestEval = Math.max(bestEval, minimax(gameInstance, depth - 1, alpha, beta, false));
            gameInstance.undo();
            alpha = Math.max(alpha, bestEval);
            if (beta <= alpha) break;
        }
        return bestEval;
    } else {
        let bestEval = 10000;
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

// --- 3. AUXILIARES E PERSISTÊNCIA ---
function toAlgebraic(x, z) {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    return files[x] + ranks[z];
}

function fromAlgebraic(s) {
    return { x: s.charCodeAt(0) - 'a'.charCodeAt(0), z: 8 - parseInt(s[1]) };
}

function saveGame() {
    const gameState = { fen: game.fen(), mode: document.getElementById('game-mode').value };
    localStorage.setItem('chess3d_save', JSON.stringify(gameState));
}

function loadGame() {
    const saved = localStorage.getItem('chess3d_save');
    if (saved) {
        const data = JSON.parse(saved);
        game.load(data.fen);
        document.getElementById('game-mode').value = data.mode;
    }
    pieces.forEach(p => scene.remove(p));
    pieces.length = 0;
    const board = game.board();
    const typeMap = { 'p': 'pawn', 'r': 'rook', 'n': 'knight', 'b': 'bishop', 'q': 'queen', 'k': 'king' };
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const square = board[r][c];
            if (square) {
                const color = square.color === 'w' ? 0xeeeeee : 0x666666;
                createPiece(c, r, color, typeMap[square.type], square.color === 'w' ? 'white' : 'black');
            }
        }
    }
    updateStatusUI();
}

// --- 4. CRIAÇÃO DAS PEÇAS ---
function createPiece(x, z, color, type, team) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ 
        color, 
        roughness: 0.5, 
        metalness: 0.2,
        emissive: new THREE.Color(0x000000)
    });
    
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.18, 16), mat);
    base.castShadow = true;
    group.add(base);

    if (type === 'pawn') {
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.28, 0.55, 12), mat);
        body.position.y = 0.3; body.castShadow = true;
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), mat);
        head.position.y = 0.7; head.castShadow = true;
        group.add(body, head);
    } else if (type === 'rook') {
        const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.35, 0.9, 8), mat);
        tower.position.y = 0.45; tower.castShadow = true;
        const top = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.4), mat);
        top.position.y = 1.0; top.castShadow = true;
        group.add(tower, top);
    } else if (type === 'knight') {
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.7, 12), mat);
        body.position.y = 0.35; body.castShadow = true;
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.45, 0.55), mat);
        head.position.set(0, 0.9, 0.1); head.rotation.x = -0.3; head.castShadow = true;
        group.add(body, head);
    } else if (type === 'bishop') {
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.22, 1.0, 12), mat);
        body.position.y = 0.5; body.castShadow = true;
        const hat = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.5, 12), mat);
        hat.position.y = 1.2; hat.castShadow = true;
        group.add(body, hat);
    } else if (type === 'queen') {
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.35, 1.3, 12), mat);
        body.position.y = 0.65; body.castShadow = true;
        const crownBase = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.2, 0.25, 12), mat);
        crownBase.position.y = 1.4; crownBase.castShadow = true;
        group.add(body, crownBase);
    } else if (type === 'king') {
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.35, 1.5, 12), mat);
        body.position.y = 0.75; body.castShadow = true;
        const cross = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.12), mat);
        cross.position.y = 1.8; cross.castShadow = true;
        group.add(body, cross);
    }

    group.position.set(x - 3.5, 0.1, z - 3.5);
    group.userData = { gridX: x, gridZ: z, team, type, originalColor: color };
    scene.add(group);
    pieces.push(group);
    return group;
}

// --- 5. MOVIMENTAÇÃO E REGRAS ---
function smoothMove(piece, tx, tz, isLegal, callback) {
    const startPos = piece.position.clone();
    const endPos = new THREE.Vector3(tx - 3.5, 0.1, tz - 3.5);
    let t = 0;
    function step() {
        t += 0.08;
        if (t < 1) {
            piece.position.lerpVectors(startPos, endPos, t);
            piece.position.y = 0.1 + Math.sin(t * Math.PI) * 0.5;
            requestAnimationFrame(step);
        } else {
            piece.position.copy(endPos);
            if (isLegal) { piece.userData.gridX = tx; piece.userData.gridZ = tz; }
            if (callback) callback();
        }
    }
    step();
}

function handleSpecialMoves(move) {
    if (move.flags.includes('p')) {
        const p = pieces.find(p => p.userData.gridX === fromAlgebraic(move.to).x && p.userData.gridZ === fromAlgebraic(move.to).z);
        if (p) {
            const { gridX, gridZ, originalColor, team } = p.userData;
            scene.remove(p);
            pieces.splice(pieces.indexOf(p), 1);
            createPiece(gridX, gridZ, originalColor, 'queen', team);
        }
    }
    if (move.flags.includes('k') || move.flags.includes('q')) {
        let rookFrom, rookTo;
        if (move.to === 'g1') { rookFrom = 'h1'; rookTo = 'f1'; } 
        else if (move.to === 'c1') { rookFrom = 'a1'; rookTo = 'd1'; } 
        else if (move.to === 'g8') { rookFrom = 'h8'; rookTo = 'f8'; } 
        else if (move.to === 'c8') { rookFrom = 'a8'; rookTo = 'd8'; } 
        const rPos = fromAlgebraic(rookFrom);
        const rook3d = pieces.find(p => p.userData.gridX === rPos.x && p.userData.gridZ === rPos.z);
        if (rook3d) smoothMove(rook3d, fromAlgebraic(rookTo).x, fromAlgebraic(rookTo).z, true);
    }
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
        smoothMove(p, tx, tz, true, () => {
            handleSpecialMoves(move);
            finalizeTurn(p);
        });
    } else {
        smoothMove(p, p.userData.gridX, p.userData.gridZ, false, () => { deselectPiece(p); selectedPiece = null; });
    }
}

function playAiTurn() {
    if (game.game_over()) return;
    isAiThinking = true;
    turnText.innerText = "IA ANALISANDO...";
    
    setTimeout(() => {
        const moves = game.moves({ verbose: true });
        let bestMove = null;
        let bestValue = -20000;
        
        // No Fácil (depth 2) a IA já joga com consciência. No difícil (depth 3) ela prevê muito mais.
        const depth = document.getElementById('difficulty-level').value === 'hard' ? 3 : 2;

        for (const move of moves) {
            game.move(move);
            const boardValue = minimax(game, depth - 1, -20000, 20000, false);
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
            if (victim) { createExplosion(victim.position, victim.userData.originalColor); scene.remove(victim); pieces.splice(pieces.indexOf(victim), 1); }
        }
        
        smoothMove(p3d, pos.x, pos.z, true, () => { 
            handleSpecialMoves(moveDetails);
            finalizeTurn(p3d); 
            isAiThinking = false; 
        });
    }, 400);
}

// --- 6. INTERAÇÃO E TABULEIRO ---
function createBoard() {
    for (let x = 0; x < 8; x++) {
        for (let z = 0; z < 8; z++) {
            const isBlack = (x + z) % 2 !== 0;
            const tile = new THREE.Mesh(
                new THREE.BoxGeometry(1, 0.1, 1), 
                new THREE.MeshStandardMaterial({ 
                    color: isBlack ? 0x331100 : 0xccaa88, 
                    roughness: 0.8 
                })
            );
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
window.addEventListener('mousedown', (e) => { handleInteraction(e.clientX, e.clientY); });

function updateStatusUI() {
    if (game.game_over()) {
        const winner = game.turn() === 'w' ? 'CINZAS' : 'BRANCAS';
        turnText.innerText = game.in_checkmate() ? `CHECKMATE! ${winner} VENCEM` : "EMPATE!";
    } else {
        turn = game.turn() === 'w' ? 'white' : 'black';
        turnText.innerText = `TURNO: ${turn === 'white' ? 'BRANCAS' : 'CINZAS'}`;
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
        createPiece(i, 0, 0x666666, layout[i], 'black');
        createPiece(i, 1, 0x666666, 'pawn', 'black');
        createPiece(i, 6, 0xeeeeee, 'pawn', 'white');
        createPiece(i, 7, 0xeeeeee, layout[i], 'white');
    }
    updateStatusUI();
}

document.getElementById('reset-button').addEventListener('click', resetGame);

function onWindowResize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    if (h > w) { 
        if (w < 500) { camera.fov = 55; camera.position.set(0, 17, 0.01); } 
        else { camera.fov = 70; camera.position.set(0, 10, 0.01); }
    } else {
        camera.fov = 45; camera.position.set(0, 12, 10);
    }
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
}
window.addEventListener('resize', onWindowResize);

function selectPiece(p) { 
    p.traverse(n => { 
        if(n.isMesh) {
            n.material.emissive = new THREE.Color(0x00ffff);
            n.material.emissiveIntensity = 0.4;
        }
    }); 
}
function deselectPiece(p) { 
    if(p) p.traverse(n => { 
        if(n.isMesh) n.material.emissive = new THREE.Color(0x000000); 
    }); 
}

function createExplosion(pos, color) {
    for (let i = 0; i < 20; i++) {
        const p = new THREE.Mesh(new THREE.SphereGeometry(0.05), new THREE.MeshStandardMaterial({ color, emissive: color }));
        p.position.copy(pos);
        const vel = new THREE.Vector3((Math.random()-0.5)*0.25, Math.random()*0.4, (Math.random()-0.5)*0.25);
        scene.add(p);
        particles.push({ mesh: p, vel, life: 1.0 });
    }
}

function animate() {
    requestAnimationFrame(animate);
    if (selectedPiece) {
        selectedPiece.position.y = 0.3 + Math.sin(Date.now() * 0.005) * 0.15;
        selectedPiece.rotation.y += 0.01;
    }
    particles.forEach((p, i) => {
        p.mesh.position.add(p.vel);
        p.life -= 0.02;
        p.mesh.material.opacity = p.life;
        p.mesh.material.transparent = true;
        if (p.life <= 0) { scene.remove(p.mesh); particles.splice(i, 1); }
    });
    renderer.render(scene, camera);
}

createBoard();
loadGame();
if (pieces.length === 0) resetGame();
onWindowResize();
animate();

document.getElementById('update-button').addEventListener('click', () => { window.location.reload(); });