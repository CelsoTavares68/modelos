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
    const col = String.fromCharCode(97 + x);
    const row = 8 - z;
    return col + row;
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

// --- 3. CRIAÇÃO DO TABULEIRO E PEÇAS (SUA MODELAGEM ORIGINAL RECUPERADA) ---
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
        // PEÃO: Esfera simples
        body = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 12), mat);
        body.position.y = 0.4;
    } else if (type === 'r') {
        // TORRE: Bloco retangular
        body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.5), mat);
        body.position.y = 0.45;
    } else if (type === 'n') {
        // CAVALO: Cilindro com inclinação específica (PI/4) para parecer uma cabeça
        body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 0.6, 12), mat);
        body.rotation.x = Math.PI / 4; // ESTA É A INCLINAÇÃO QUE VOCÊ CRIOU
        body.position.y = 0.45;
        body.position.z = 0.1; 
    } else if (type === 'b') {
        // BISPO: Cone pontiagudo
        body = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.8, 12), mat);
        body.position.y = 0.5;
    } else if (type === 'q') {
        // RAINHA: Corpo alto com esfera no topo
        body = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.3, 1, 12), mat);
        body.position.y = 0.5;
        const crown = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), mat);
        crown.position.y = 0.6;
        body.add(crown);
    } else if (type === 'k') {
        // REI: Corpo alto com cruz (bloco) no topo
        body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 1.1, 12), mat);
        body.position.y = 0.55;
        const cross = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.1), mat);
        cross.position.y = 0.7;
        body.add(cross);
    }

    body.castShadow = true;
    group.add(body);
    group.position.set(x - 3.5, 0.1, z - 3.5);
    group.userData = { gridX: x, gridZ: z, team, type };
    
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
    const isWhite = game.turn() === 'w';
    turnText.innerText = isWhite ? "VEZ DAS BRANCAS" : "VEZ DAS PRETAS";
    turnText.style.color = isWhite ? "#fff" : "#aaa";
}

// --- 4. LÓGICA DE IA E DIFICULDADE ---
const pieceValues = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

function evaluateBoard(g) {
    let total = 0;
    g.board().forEach(row => row.forEach(p => {
        if (p) total += (p.color === 'w' ? pieceValues[p.type] : -pieceValues[p.type]);
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
    if (game.game_over() || isAiThinking) return;
    isAiThinking = true;
    turnText.innerText = "PC A PENSAR...";

    setTimeout(() => {
        const level = document.getElementById('difficulty-level').value;
        const depth = (level === 'hard') ? 3 : 2;
        const moves = game.moves();
        
        let bestMove = null;
        let bestValue = -Infinity;

        for (const m of moves) {
            game.move(m);
            const val = minimax(game, depth - 1, -100000, 100000, false);
            game.undo();
            if (val > bestValue) {
                bestValue = val;
                bestMove = m;
            }
        }

        if (bestMove) {
            game.move(bestMove);
            syncBoard();
            saveGame();
        }
        isAiThinking = false;
    }, 500);
}

// --- 5. INTERAÇÃO (REVISADA) ---
function onInteraction(e) {
    if (isAiThinking || game.game_over()) return;
    const mode = document.getElementById('game-mode').value;
    if (mode === 'pve' && game.turn() === 'b') return;

    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    mouse.x = (clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(tiles.concat(pieces), true);

    if (intersects.length > 0) {
        const obj = intersects[0].object;
        let clickedTile = obj.userData.x !== undefined ? obj : 
                         (obj.parent && obj.parent.userData.gridX !== undefined) ? 
                         tiles.find(t => t.userData.x === obj.parent.userData.gridX && t.userData.z === obj.parent.userData.gridZ) : null;

        if (clickedTile) {
            const square = toAlgebraic(clickedTile.userData.x, clickedTile.userData.z);
            const pieceOnSquare = pieces.find(p => p.userData.gridX === clickedTile.userData.x && p.userData.gridZ === clickedTile.userData.z);

            if (selectedPiece) {
                const from = toAlgebraic(selectedPiece.userData.gridX, selectedPiece.userData.gridZ);
                if (game.move({ from, to: square, promotion: 'q' })) {
                    selectedPiece = null;
                    syncBoard();
                    saveGame();
                    // COMANDO QUE FAZ O PC JOGAR LOGO APÓS VOCÊ:
                    if (mode === 'pve') playAiTurn();
                } else {
                    selectedPiece = null;
                    syncBoard();
                }
            } else if (pieceOnSquare && pieceOnSquare.userData.team === game.turn()) {
                selectedPiece = pieceOnSquare;
                pieceOnSquare.traverse(n => { if(n.isMesh) n.material.emissive.setHex(0x004444); });
            }
        }
    }
}

window.addEventListener('mousedown', onInteraction);
window.addEventListener('touchstart', onInteraction, { passive: false });

function onWindowResize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.position.set(0, 12, 10);
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

// BOTÕES
document.getElementById('reset-button').addEventListener('click', resetGame);
document.getElementById('update-button').addEventListener('click', () => {
    window.location.reload(true);
});

createBoard();
loadGame();
if (pieces.length === 0) resetGame();
onWindowResize();
animate();
window.addEventListener('resize', onWindowResize);