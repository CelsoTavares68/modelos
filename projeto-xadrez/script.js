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
const pieces = []; 
const tiles = [];
const particles = []; 
let selectedPiece = null;

const turnText = document.getElementById('turn-indicator');
const logText = document.getElementById('message-log');
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// --- 2. AUXILIARES ---
function toAlgebraic(x, z) {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    return files[x] + ranks[z];
}

function fromAlgebraic(s) {
    return { x: s.charCodeAt(0) - 'a'.charCodeAt(0), z: 8 - parseInt(s[1]) };
}

// --- 3. CRIAÇÃO DO MUNDO E PEÇAS DETALHADAS ---
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
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.15), mat);
        head.position.y = 0.75;
        group.add(body, head);
    } else if (type === 'rook') {
        const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.8, 6), mat);
        tower.position.y = 0.45;
        const top = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 6), mat);
        top.position.y = 0.9;
        group.add(tower, top);
    } else if (type === 'knight') {
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.7, 8), mat);
        body.position.y = 0.4;
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.4, 0.5), mat);
        head.position.set(0, 0.8, 0.1);
        head.rotation.x = -0.4;
        group.add(body, head);
    } else if (type === 'bishop') {
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.25, 0.9, 8), mat);
        body.position.y = 0.5;
        const mitre = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 8), mat);
        mitre.position.y = 1.0;
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.06), mat);
        ball.position.y = 1.25;
        group.add(body, mitre, ball);
    } else if (type === 'queen') {
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 1.1, 8), mat);
        body.position.y = 0.6;
        const crownBase = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), mat);
        crownBase.position.y = 1.1;
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 8, 16), mat);
        ring.rotation.x = Math.PI/2;
        ring.position.y = 1.2;
        group.add(body, crownBase, ring);
    } else if (type === 'king') {
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.3, 1.2, 8), mat);
        body.position.y = 0.65;
        const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.1), mat);
        crossV.position.y = 1.4;
        const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.1), mat);
        crossH.position.y = 1.4;
        group.add(body, crossV, crossH);
    }

    group.position.set(x - 3.5, 0.1, z - 3.5);
    group.userData = { gridX: x, gridZ: z, team, type, originalColor: color };
    scene.add(group);
    pieces.push(group);
}

function setupPieces() {
    const layout = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
    for (let i = 0; i < 8; i++) {
        createPiece(i, 0, 0x222222, layout[i], 'black');
        createPiece(i, 1, 0x222222, 'pawn', 'black');
        createPiece(i, 6, 0xffffff, 'pawn', 'white');
        createPiece(i, 7, 0xffffff, layout[i], 'white');
    }
}

// --- 4. MOVIMENTAÇÃO E IA CORRIGIDA ---
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
        smoothMove(p, p.userData.gridX, p.userData.gridZ, false, () => {
            deselectPiece(p);
            selectedPiece = null;
        });
    }
}

function playAiTurn() {
    // CORREÇÃO: Se o jogo acabou (Xeque-mate), não analisa nada
    if (game.game_over()) {
        isAiThinking = false;
        return;
    }

    isAiThinking = true;
    turnText.innerText = "PC A ANALISAR...";
    const difficulty = document.getElementById('difficulty-level').value;

    setTimeout(() => {
        const moves = game.moves({ verbose: true });
        if (moves.length === 0) { isAiThinking = false; return; }

        let selectedMove;
        if (difficulty === 'easy') {
            selectedMove = moves[Math.floor(Math.random() * moves.length)];
        } else {
            const pieceValues = { p: 10, n: 30, b: 30, r: 50, q: 90, k: 900 };
            selectedMove = moves.sort((a, b) => {
                let scoreA = 0, scoreB = 0;
                if (a.captured) scoreA += pieceValues[a.captured];
                if (b.captured) scoreB += pieceValues[b.captured];
                
                if (difficulty === 'hard') {
                    if (game.is_attacked(a.to, 'w')) scoreA -= pieceValues[a.piece];
                    if (game.is_attacked(b.to, 'w')) scoreB -= pieceValues[b.piece];
                    if (game.is_attacked(a.from, 'w')) scoreA += pieceValues[a.piece] * 0.5;
                    if (game.is_attacked(b.from, 'w')) scoreB += pieceValues[b.piece] * 0.5;
                }
                return scoreB - scoreA;
            })[0];
        }

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

// --- 5. INTERAÇÃO E CÂMARA ---
function handleInteraction(clientX, clientY) {
    if (isAiThinking || game.game_over()) return;
    const gameMode = document.getElementById('game-mode').value;
    if (gameMode === 'pve' && turn === 'black') return;

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

window.addEventListener('mousedown', (e) => handleInteraction(e.clientX, e.clientY));
window.addEventListener('touchstart', (e) => {
    if(e.touches.length > 0) handleInteraction(e.touches[0].clientX, e.touches[0].clientY);
});

 function onWindowResize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;

    if (h > w) { 
        // Modo Vertical (Celular)
        camera.fov = 65; 
        camera.position.set(0, 20, 15); 
    } else if (w >= 768 && w <= 1024) {
        // MODO TABLET (Horizontal ou telas médias)
        camera.fov = 50; 
        camera.position.set(0, 14, 12); // Câmera um pouco mais alta e afastada
    } else { 
        // Modo Desktop
        camera.fov = 45; 
        camera.position.set(0, 12, 10); 
    }
    
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
}
window.addEventListener('resize', onWindowResize);

function selectPiece(p) { p.traverse(n => { if(n.isMesh) n.material.emissive = new THREE.Color(0x004444); }); }
function deselectPiece(p) { if(p) p.traverse(n => { if(n.isMesh) n.material.emissive = new THREE.Color(0x000000); }); }

function finalizeTurn(p) {
    if(p) deselectPiece(p);
    selectedPiece = null;
    
    // CORREÇÃO: Verifica fim de jogo antes de disparar a IA
    if (game.game_over()) {
        if (game.in_checkmate()) {
            const winner = game.turn() === 'w' ? 'PRETAS' : 'BRANCAS';
            turnText.innerText = `XEQUE-MATE! VITÓRIA DAS ${winner}`;
            logText.innerText = "Fim da partida.";
        } else if (game.in_draw()) {
            turnText.innerText = "EMPATE!";
            logText.innerText = "Jogo terminado.";
        }
        return;
    }

    turn = game.turn() === 'w' ? 'white' : 'black';
    turnText.innerText = `VEZ DAS ${turn === 'white' ? 'BRANCAS' : 'PRETAS'}`;
    
    if (game.in_check()) logText.innerText = "XEQUE!";
    else logText.innerText = "Toque numa peça";

    if (document.getElementById('game-mode').value === 'pve' && turn === 'black') {
        playAiTurn();
    }
}

function createExplosion(pos, color) {
    for (let i = 0; i < 20; i++) {
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
        p.life -= 0.02;
        p.mesh.material.transparent = true;
        p.mesh.material.opacity = p.life;
        if (p.life <= 0) { scene.remove(p.mesh); particles.splice(i, 1); }
    });
    renderer.render(scene, camera);
}

// --- INICIALIZAÇÃO ---
createBoard();
setupPieces();
onWindowResize();
animate();