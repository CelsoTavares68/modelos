 // --- 1. SETUP DO MOTOR ---
const game = new Chess();
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x223344);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 12, 10);
camera.lookAt(0, 0, 0);

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

// --- 2. AUXILIARES DE COORDENADAS ---
function toAlgebraic(x, z) {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    return files[x] + ranks[z];
}

function fromAlgebraic(s) {
    return { x: s.charCodeAt(0) - 'a'.charCodeAt(0), z: 8 - parseInt(s[1]) };
}

// --- 3. CRIAÇÃO DO TABULEIRO E SOLDADOS ---
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
    const detailMat = new THREE.MeshStandardMaterial({ color: team === 'white' ? 0xcccccc : 0x444444 });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.15, 12), mat);
    group.add(base);

    if (type === 'pawn') {
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.25, 0.6, 8), mat);
        body.position.y = 0.35;
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.15), mat);
        head.position.y = 0.75;
        const shield = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.3), detailMat);
        shield.position.set(0.25, 0.4, 0);
        group.add(body, head, shield);
    } 
    else if (type === 'rook') {
        const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.9, 6), mat);
        tower.position.y = 0.5;
        const top = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.5), mat);
        top.position.y = 1;
        group.add(tower, top);
    } 
    else if (type === 'knight') {
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.7, 8), mat);
        body.position.y = 0.4;
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.5), mat);
        head.position.set(0, 0.8, 0.1);
        group.add(body, head);
    }
    else if (type === 'bishop') {
        const body = new THREE.Mesh(new THREE.ConeGeometry(0.25, 1, 8), mat);
        body.position.y = 0.5;
        group.add(body);
    }
    else if (type === 'queen') {
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.35, 1.2, 12), mat);
        body.position.y = 0.6;
        group.add(body);
    }
    else if (type === 'king') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.4, 0.4), mat);
        body.position.y = 0.7;
        group.add(body);
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

// --- 4. LÓGICA DE MOVIMENTO COM RETORNO (UNDO) ---
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
            if (isLegal) {
                piece.userData.gridX = tx;
                piece.userData.gridZ = tz;
            }
            if (callback) callback();
        }
    }
    step();
}

function tryMove(p, tx, tz) {
    const from = toAlgebraic(p.userData.gridX, p.userData.gridZ);
    const to = toAlgebraic(tx, tz);
    
    const move = game.move({ from, to, promotion: 'q' });

    if (move) {
        logText.innerText = "Movimento confirmado!";
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
        logText.innerText = "MOVIMENTO ILEGAL! Voltando...";
        smoothMove(p, tx, tz, false, () => {
            smoothMove(p, p.userData.gridX, p.userData.gridZ, false, () => {
                deselectPiece(p);
                selectedPiece = null;
            });
        });
    }
}

// --- 5. INTELIGÊNCIA ARTIFICIAL E RENDERIZAÇÃO ---
function playAiTurn() {
    isAiThinking = true;
    turnText.innerText = "PC ANALISANDO...";
    setTimeout(() => {
        const moves = game.moves({ verbose: true });
        if (game.game_over()) return alert("Fim de Jogo!");

        const selectedMove = moves.sort((a,b) => (b.captured ? 1 : 0) - (a.captured ? 1 : 0))[0];
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

// Eventos
 window.addEventListener('mousedown', (event) => {
    const gameMode = document.getElementById('game-mode').value;
    
    // Bloqueia clique apenas se a IA estiver pensando
    if (isAiThinking) return;
    
    // No modo PvE, o humano não pode clicar quando for a vez das pretas
    if (gameMode === 'pve' && turn === 'black') return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
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
        const t = tileHits[0].object;
        tryMove(selectedPiece, t.userData.x, t.userData.z);
    }
});

function selectPiece(p) { p.traverse(n => { if(n.isMesh) n.material.emissive = new THREE.Color(0x004444); }); }
function deselectPiece(p) { if(p) p.traverse(n => { if(n.isMesh) n.material.emissive = new THREE.Color(0x000000); }); }

 function finalizeTurn(p) {
    if(p) deselectPiece(p);
    selectedPiece = null;
    
    // Atualiza o turno na lógica do jogo
    turn = game.turn() === 'w' ? 'white' : 'black';
    
    // Atualiza a interface
    turnText.innerText = `VEZ DAS ${turn === 'white' ? 'BRANCAS' : 'PRETAS'}`;
    turnText.style.color = turn === 'white' ? '#fff' : '#ff4444';

    // Verifica xeque-mate ou empate
    if (game.game_over()) {
        logText.innerText = "FIM DE JOGO!";
        return;
    }

    // NOVA LÓGICA: Só chama a IA se o modo for PvE e for a vez das pretas
    const gameMode = document.getElementById('game-mode').value;
    if (gameMode === 'pve' && turn === 'black') {
        playAiTurn();
    } else {
        isAiThinking = false;
        logText.innerText = `Sua vez, ${turn === 'white' ? 'Brancas' : 'Pretas'}!`;
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

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function animate() {
    requestAnimationFrame(animate);
    if (selectedPiece) selectedPiece.position.y = 0.2 + Math.sin(Date.now() * 0.008) * 0.1;
    particles.forEach((p, i) => {
        p.mesh.position.add(p.vel);
        p.life -= 0.02;
        p.mesh.material.opacity = p.life;
        if (p.life <= 0) { scene.remove(p.mesh); particles.splice(i, 1); }
    });
    renderer.render(scene, camera);
}

// Inicialização
createBoard();
setupPieces();
animate();

// --- AJUSTE DINÂMICO DA CÂMARA ---
function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    renderer.setSize(width, height);
    camera.aspect = width / height;

    // Se a altura for maior que a largura (Telemóvel em pé)
    if (height > width) {
        // Aumentamos o campo de visão (FOV) ou afastamos a câmara no eixo Y e Z
        camera.position.set(0, 18, 12); // Mais alto e um pouco mais atrás
    } else {
        // Tablet ou PC (Horizontal)
        camera.position.set(0, 12, 10);
    }
    
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
}

// Escutar redimensionamento e rotação
window.addEventListener('resize', onWindowResize);

 function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    renderer.setSize(width, height);
    camera.aspect = width / height;

    if (height > width) {
        // MODO VERTICAL (Celular)
        // Aumentamos o FOV para o tabuleiro "encolher" e caber nas laterais
        camera.fov = 60; 
        // Posicionamos a câmera mais para trás (z) e para cima (y)
        camera.position.set(0, 20, 15); 
    } else {
        // MODO HORIZONTAL (PC/Tablet)
        camera.fov = 45;
        camera.position.set(0, 12, 10);
    }
    
    // FORÇA o olhar para o centro exato do tabuleiro
    camera.lookAt(0, 0, 0); 
    camera.updateProjectionMatrix();
}