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
function toAlgebra(x, z) {
    const col = String.fromCharCode(97 + x);
    const row = 8 - z;
    return col + row;
}

function fromAlgebra(square) {
    const col = square.charCodeAt(0) - 97;
    const row = 8 - parseInt(square[1]);
    return { x: col, z: row };
}

function saveGame() {
    localStorage.setItem('chess_fen', game.fen());
}

function loadGame() {
    const saved = localStorage.getItem('chess_fen');
    if (saved) {
        game.load(saved);
        syncBoard();
    }
}

function resetGame() {
    game.reset();
    localStorage.removeItem('chess_fen');
    syncBoard();
}

// --- 3. CRIAÇÃO DO TABULEIRO E PEÇAS ---
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
    const mat = new THREE.MeshStandardMaterial({ 
        color: color,
        roughness: 0.4,
        metalness: 0.3
    });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.15, 16), mat);
    base.castShadow = true;
    group.add(base);

    let body;
    if (type === 'p') {
        body = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 12), mat);
        body.position.y = 0.4;
    } else if (type === 'r') {
        body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.5), mat);
        body.position.y = 0.45;
    } else if (type === 'n') {
        // FORMATO DO CAVALO RESTAURADO: Cilindro inclinado
        body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 0.6, 12), mat);
        body.rotation.x = Math.PI / 4;
        body.position.y = 0.4;
    } else if (type === 'b') {
        body = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.8, 12), mat);
        body.position.y = 0.5;
    } else if (type === 'q') {
        body = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.3, 1, 12), mat);
        body.position.y = 0.5;
        const crown = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), mat);
        crown.position.y = 0.6;
        body.add(crown);
    } else if (type === 'k') {
        body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 1.1, 12), mat);
        body.position.y = 0.55;
        const cross = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.1), mat);
        cross.position.y = 0.7;
        body.add(cross);
    }

    body.castShadow = true;
    group.add(body);
    group.position.set(x - 3.5, 0.1, z - 3.5);
    group.userData = { gridX: x, gridZ: z, team, type, originalColor: color };
    
    scene.add(group);
    pieces.push(group);
}

function syncBoard() {
    pieces.forEach(p => scene.remove(p));
    pieces.length = 0;
    const board = game.board();
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const p = board[j][i];
            if (p) {
                const color = p.color === 'w' ? 0xffffff : 0x333333;
                createPiece(i, j, color, p.type, p.color);
            }
        }
    }
    updateTurnIndicator();
}

function updateTurnIndicator() {
    const isWhite = game.turn() === 'w';
    turnText.innerText = isWhite ? "VEZ DAS BRANCAS" : "VEZ DAS PRETAS";
    turnText.style.color = isWhite ? "#fff" : "#aaa";
}

// --- 4. IA OTIMIZADA (MINIMAX ALPHA-BETA) ---

const pieceWeights = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

function evaluateBoard(g) {
    let total = 0;
    const board = g.board();
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const p = board[i][j];
            if (p) {
                let val = pieceWeights[p.type];
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

        const diff = document.getElementById('difficulty-level').value;
        const depth = (diff === 'hard') ? 3 : 2; 

        for (const m of moves) {
            game.move(m);
            const val = minimax(game, depth - 1, -100000, 100000, false);
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

function executeAiMove(move) {
    if (move.captured) {
        const targetPos = new THREE.Vector3(move.to.charCodeAt(0)-97-3.5, 0.5, 8-parseInt(move.to[1])-3.5);
        createExplosion(targetPos, 0xffaa00);
    }
    syncBoard();
    saveGame();
    isAiThinking = false;
}

// --- 5. INTERAÇÃO ---
window.addEventListener('mousedown', onMouseDown);
window.addEventListener('touchstart', (e) => onMouseDown(e.touches[0]));

function onMouseDown(e) {
    if (isAiThinking || game.game_over()) return;
    if (document.getElementById('game-mode').value === 'pve' && game.turn() === 'b') return;

    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(tiles.concat(pieces), true);
    if (intersects.length > 0) {
        const obj = intersects[0].object;
        let clickedTile = obj.userData.x !== undefined ? obj : obj.parent.userData.gridX !== undefined ? tiles.find(t => t.userData.x === obj.parent.userData.gridX && t.userData.z === obj.parent.userData.gridZ) : null;

        if (clickedTile) {
            const x = clickedTile.userData.x;
            const z = clickedTile.userData.z;
            const square = toAlgebra(x, z);
            const pieceOnSquare = pieces.find(p => p.userData.gridX === x && p.userData.gridZ === z);

            if (selectedPiece) {
                const from = toAlgebra(selectedPiece.userData.gridX, selectedPiece.userData.gridZ);
                const move = game.move({ from, to: square, promotion: 'q' });
                if (move) {
                    if (move.captured) createExplosion(clickedTile.position, 0xff0000);
                    deselectPiece(selectedPiece);
                    selectedPiece = null;
                    syncBoard();
                    saveGame();
                    if (document.getElementById('game-mode').value === 'pve') playAiTurn();
                } else {
                    deselectPiece(selectedPiece);
                    selectedPiece = null;
                }
            } else if (pieceOnSquare && pieceOnSquare.userData.team === game.turn()) {
                selectedPiece = pieceOnSquare;
                selectPiece(selectedPiece);
            }
        }
    }
}

function selectPiece(p) {
    p.traverse(n => { if(n.isMesh) n.material.emissive.setHex(0x004444); });
}

function deselectPiece(p) {
    if(p) p.traverse(n => { if(n.isMesh) n.material.emissive.setHex(0x000000); });
}

function onWindowResize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.position.set(0, (camera.aspect < 1 ? 16 : 12), (camera.aspect < 1 ? 10 : 12));
    camera.lookAt(0,0,0);
    camera.updateProjectionMatrix();
}

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

window.addEventListener('resize', onWindowResize);
document.getElementById('reset-button').addEventListener('click', resetGame);
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