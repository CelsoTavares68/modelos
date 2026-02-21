 // --- 1. CONFIGURAÇÃO E MOTOR ---
const game = new Chess();
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x223344);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.setPixelRatio(window.devicePixelRatio); 
document.body.appendChild(renderer.domElement);

// Luzes
scene.add(new THREE.AmbientLight(0xffffff, 0.7)); 
const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(5, 15, 5);
sun.castShadow = true;
scene.add(sun);

// Variáveis de Estado
let turn = 'white', isAiThinking = false, selectedPiece = null;
const pieces = [], tiles = [], particles = [];
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Pesos da IA (Centipawns)
const weights = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
const pst = {
    p: [[0,0,0,0,0,0,0,0],[50,50,50,50,50,50,50,50],[10,10,20,30,30,20,10,10],[5,5,10,25,25,10,5,5],[0,0,0,20,20,0,0,0],[5,-5,-10,0,0,-10,-5,5],[5,10,10,-20,-20,10,10,5],[0,0,0,0,0,0,0,0]],
    n: [[-50,-40,-30,-30,-30,-30,-40,-50],[-40,-20,0,0,0,0,-20,-40],[-30,0,10,15,15,10,0,-30],[-30,5,15,20,20,15,5,-30],[-30,0,15,20,20,15,0,-30],[-30,5,10,15,15,10,5,-30],[-40,-20,0,5,5,0,-20,-40],[-50,-40,-30,-30,-30,-30,-40,-50]]
};

// --- 2. IA E BARRA DE AVALIAÇÃO ---

function evaluateBoard(g) {
    let total = 0;
    const b = g.board();
    for (let i=0; i<8; i++) {
        for (let j=0; j<8; j++) {
            const p = b[i][j];
            if (p) {
                const v = weights[p.type] + (pst[p.type] ? pst[p.type][i][j] : 0);
                total += (p.color === 'w' ? v : -v);
            }
        }
    }
    return total;
}

function updateEvalBar() {
    const score = evaluateBoard(game) / 100;
    const textElem = document.getElementById('eval-text');
    const barElem = document.getElementById('eval-bar');
    if(textElem && barElem) {
        textElem.innerText = (score > 0 ? "+" : "") + score.toFixed(1);
        let pct = 50 + (score * 5);
        barElem.style.height = Math.max(5, Math.min(95, pct)) + "%";
    }
}

function minimax(g, depth, alpha, beta, isMax) {
    if (depth === 0) return -evaluateBoard(g);
    const moves = g.moves().sort((a,b) => b.includes('x') - a.includes('x'));
    if (isMax) {
        let best = -Infinity;
        for (const m of moves) {
            g.move(m);
            best = Math.max(best, minimax(g, depth-1, alpha, beta, false));
            g.undo(); alpha = Math.max(alpha, best);
            if (beta <= alpha) break;
        }
        return best;
    } else {
        let best = Infinity;
        for (const m of moves) {
            g.move(m);
            best = Math.min(best, minimax(g, depth-1, alpha, beta, true));
            g.undo(); beta = Math.min(beta, best);
            if (beta <= alpha) break;
        }
        return best;
    }
}

// --- 3. MOVIMENTAÇÃO E JOGO ---

function playAiTurn() {
    if (game.game_over()) return;
    isAiThinking = true;
    document.getElementById('turn-indicator').innerText = "IA CALCULANDO...";
    
    setTimeout(() => {
        const moves = game.moves();
        let bestMove = null, bestVal = -Infinity;
        const diff = document.getElementById('difficulty-level').value;
        const depth = diff === 'hard' ? 3 : 2;

        for (const m of moves) {
            game.move(m);
            const val = minimax(game, depth-1, -10000, 10000, false);
            game.undo();
            if (val > bestVal) { bestVal = val; bestMove = m; }
        }
        const details = game.move(bestMove);
        executeMoveVisuals(details);
    }, 250);
}

function executeMoveVisuals(details) {
    const p3d = pieces.find(p => toAlgebraic(p.userData.gridX, p.userData.gridZ) === details.from);
    const target = fromAlgebraic(details.to);
    
    if (details.captured) {
        const victim = pieces.find(v => v.userData.gridX === target.x && v.userData.gridZ === target.z && v !== p3d);
        if (victim) { 
            createExplosion(victim.position, victim.userData.originalColor); 
            scene.remove(victim); 
            pieces.splice(pieces.indexOf(victim), 1); 
        }
    }
    
    smoothMove(p3d, target.x, target.z, true, () => {
        finalizeTurn(p3d);
        isAiThinking = false;
        updateEvalBar();
    });
}

function handleInput(clientX, clientY) {
    if (isAiThinking || game.game_over()) return;
    mouse.x = (clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    
    const pieceHits = raycaster.intersectObjects(pieces, true);
    const tileHits = raycaster.intersectObjects(tiles);

    if (pieceHits.length > 0) {
        let obj = pieceHits[0].object;
        while (obj.parent && !obj.userData.team) obj = obj.parent;
        if (obj.userData.team === (game.turn()==='w'?'white':'black')) {
            if (selectedPiece) deselectPiece(selectedPiece);
            selectedPiece = obj; selectPiece(selectedPiece);
        } else if (selectedPiece) {
            tryUserMove(selectedPiece, obj.userData.gridX, obj.userData.gridZ);
        }
    } else if (selectedPiece && tileHits.length > 0) {
        tryUserMove(selectedPiece, tileHits[0].object.userData.x, tileHits[0].object.userData.z);
    }
}

function tryUserMove(p, tx, tz) {
    const move = game.move({ from: toAlgebraic(p.userData.gridX, p.userData.gridZ), to: toAlgebraic(tx, tz), promotion: 'q' });
    if (move) {
        selectedPiece = null;
        executeMoveVisuals(move);
    } else {
        smoothMove(p, p.userData.gridX, p.userData.gridZ, false, () => { deselectPiece(p); selectedPiece = null; });
    }
}

// --- 4. FUNÇÕES AUXILIARES ---

function createPiece(x, z, color, type, team) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.3 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.15, 16), mat);
    group.add(base);
    
    const bodyGeo = (type==='king'||type==='queen') ? new THREE.CylinderGeometry(0.1, 0.3, 1, 12) : new THREE.SphereGeometry(0.25, 12, 12);
    const body = new THREE.Mesh(bodyGeo, mat);
    body.position.y = 0.5;
    group.add(body);

    group.position.set(x - 3.5, 0.1, z - 3.5);
    group.userData = { gridX: x, gridZ: z, team, type, originalColor: color };
    scene.add(group);
    pieces.push(group);
}

function smoothMove(p, tx, tz, isLegal, cb) {
    const start = p.position.clone();
    const end = new THREE.Vector3(tx - 3.5, 0.1, tz - 3.5);
    let t = 0;
    function step() {
        t += 0.12;
        if (t < 1) { p.position.lerpVectors(start, end, t); requestAnimationFrame(step); }
        else { p.position.copy(end); if(isLegal){p.userData.gridX=tx; p.userData.gridZ=tz;} if(cb)cb(); }
    }
    step();
}

function toAlgebraic(x, z) { return ['a','b','c','d','e','f','g','h'][x] + (8-z); }
function fromAlgebraic(s) { return { x: s.charCodeAt(0) - 97, z: 8 - parseInt(s[1]) }; }

function finalizeTurn(p) {
    if(p) deselectPiece(p);
    updateStatusUI();
    if (document.getElementById('game-mode').value === 'pve' && game.turn() === 'b') playAiTurn();
}

function updateStatusUI() {
    const t = game.turn() === 'w' ? 'BRANCAS' : 'PRETAS';
    document.getElementById('turn-indicator').innerText = game.game_over() ? "FIM DE JOGO!" : `VEZ DAS ${t}`;
}

function createBoard() {
    for (let x = 0; x < 8; x++) {
        for (let z = 0; z < 8; z++) {
            const tile = new THREE.Mesh(new THREE.BoxGeometry(1, 0.1, 1), new THREE.MeshStandardMaterial({ color: (x+z)%2?0x221100:0x886644 }));
            tile.position.set(x - 3.5, -0.05, z - 3.5);
            tile.userData = { x, z };
            scene.add(tile);
            tiles.push(tile);
        }
    }
}

function resetGame() {
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
    updateEvalBar();
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

function selectPiece(p) { p.traverse(n => { if(n.isMesh) n.material.emissive.setHex(0x004444); }); }
function deselectPiece(p) { if(p) p.traverse(n => { if(n.isMesh) n.material.emissive.setHex(0x000000); }); }

function animate() {
    requestAnimationFrame(animate);
    if (selectedPiece) selectedPiece.position.y = 0.2 + Math.sin(Date.now() * 0.008) * 0.05;
    particles.forEach((p, i) => {
        p.mesh.position.add(p.vel);
        p.life -= 0.04;
        if (p.life <= 0) { scene.remove(p.mesh); particles.splice(i, 1); }
    });
    renderer.render(scene, camera);
}

// --- 5. EVENTOS E INICIALIZAÇÃO ---

// Escuta de Cliques/Toques
window.addEventListener('mousedown', (e) => handleInput(e.clientX, e.clientY));
window.addEventListener('touchstart', (e) => handleInput(e.touches[0].clientX, e.touches[0].clientY));
window.addEventListener('resize', onWindowResize);

// Botão Novo Jogo
document.getElementById('reset-button').addEventListener('click', resetGame);

// LÓGICA DO BOTÃO ATUALIZAR (CORREÇÃO)
document.getElementById('update-button').addEventListener('click', () => {
    const btn = document.getElementById('update-button');
    btn.innerText = "ATUALIZANDO...";
    
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
            for (let registration of registrations) {
                registration.unregister();
            }
            caches.keys().then(names => {
                for (let name of names) caches.delete(name);
            });
            setTimeout(() => { window.location.reload(true); }, 500);
        });
    } else {
        window.location.reload(true);
    }
});

createBoard();
resetGame();
onWindowResize();
animate();