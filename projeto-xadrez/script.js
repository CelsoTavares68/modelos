 // --- 1. SETUP E CENA ---
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

// --- 2. AUXILIARES ---
function toAlgebraic(x, z) {
    const col = String.fromCharCode(97 + x);
    const row = 8 - z;
    return col + row;
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

// --- 3. SUAS PEÇAS ORIGINAIS (RESTAURADAS) ---
function createPiece(x, z, color, type, team) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.3 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.15, 16), mat);
    base.castShadow = true;
    group.add(base);

    if (type === 'p') {
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.25, 0.5, 12), mat);
        body.position.y = 0.3;
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), mat);
        head.position.y = 0.65;
        group.add(body, head);
    } else if (type === 'n') {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.6, 12), mat);
        b.position.y = 0.35;
        const h = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.4, 0.5), mat);
        h.position.set(0, 0.8, 0.1);
        h.rotation.x = -0.3;
        group.add(b, h);
    } else if (type === 'r') {
        const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.8, 4), mat);
        tower.position.y = 0.45;
        const top = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.35), mat);
        top.position.y = 0.9;
        group.add(tower, top);
    } else if (type === 'b') {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.2, 0.9, 12), mat);
        b.position.y = 0.5;
        const hat = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 12), mat);
        hat.position.y = 1.1;
        group.add(b, hat);
    } else if (type === 'q') {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 1.2, 12), mat);
        b.position.y = 0.65;
        const cb = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.15, 0.2, 12), mat);
        cb.position.y = 1.3;
        group.add(b, cb);
    } else if (type === 'k') {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.3, 1.4, 12), mat);
        b.position.y = 0.75;
        const cv = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.1), mat);
        cv.position.y = 1.6;
        group.add(b, cv);
    }

    group.position.set(x - 3.5, 0.1, z - 3.5);
    group.userData = { gridX: x, gridZ: z, team, type };
    scene.add(group);
    pieces.push(group);
}

// --- 4. IA E DIFICULDADE ---
function playAiTurn() {
    if (game.game_over() || isAiThinking) return;
    isAiThinking = true;
    turnText.innerText = "PC A PENSAR...";
    setTimeout(() => {
        const moves = game.moves();
        if (moves.length === 0) return;
        const level = document.getElementById('difficulty-level').value;
        const move = (level === 'hard') ? getBestMove() : moves[Math.floor(Math.random() * moves.length)];
        game.move(move);
        syncBoard();
        isAiThinking = false;
    }, 500);
}

function getBestMove() {
    const moves = game.moves();
    // Lógica simples de captura para o modo "difícil" sem travar o mobile
    for (let m of moves) { if (m.includes('x')) return m; }
    return moves[Math.floor(Math.random() * moves.length)];
}

// --- 5. INTERAÇÃO (FIX MOBILE) ---
function onInteraction(e) {
    // Previne comportamento padrão apenas se for toque para não travar o scroll
    if (e.type === 'touchstart') e.preventDefault();
    
    if (isAiThinking || game.game_over()) return;

    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    mouse.x = (clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(tiles.concat(pieces), true);

    if (intersects.length > 0) {
        const obj = intersects[0].object;
        let tile = obj.userData.x !== undefined ? obj : 
                   tiles.find(t => t.userData.x === obj.parent.userData.gridX && t.userData.z === obj.parent.userData.gridZ);

        if (tile) {
            const square = toAlgebraic(tile.userData.x, tile.userData.z);
            if (selectedPiece) {
                const from = toAlgebraic(selectedPiece.userData.gridX, selectedPiece.userData.gridZ);
                if (game.move({ from, to: square, promotion: 'q' })) {
                    selectedPiece = null;
                    syncBoard();
                    if (document.getElementById('game-mode').value === 'pve') playAiTurn();
                } else {
                    selectedPiece = null;
                    syncBoard();
                }
            } else {
                const p = pieces.find(p => p.userData.gridX === tile.userData.x && p.userData.gridZ === tile.userData.z);
                if (p && p.userData.team === game.turn()) {
                    selectedPiece = p;
                    p.traverse(n => { if(n.isMesh) n.material.emissive.setHex(0x004444); });
                }
            }
        }
    }
}

// Escuta mouse e toque separadamente
window.addEventListener('mousedown', onInteraction);
window.addEventListener('touchstart', onInteraction, { passive: false });

// --- 6. RENDERIZAÇÃO E TABULEIRO ---
function createBoard() {
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const geo = new THREE.BoxGeometry(1, 0.2, 1);
            const mat = new THREE.MeshStandardMaterial({ color: (i + j) % 2 === 0 ? 0xeeeedd : 0x886644 });
            const tile = new THREE.Mesh(geo, mat);
            tile.position.set(i - 3.5, -0.1, j - 3.5);
            tile.userData = { x: i, z: j };
            scene.add(tile);
            tiles.push(tile);
        }
    }
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.position.set(0, 12, 10);
    camera.lookAt(0,0,0);
}

window.addEventListener('resize', onWindowResize);
document.getElementById('reset-button').addEventListener('click', () => { game.reset(); syncBoard(); });

createBoard();
syncBoard();
onWindowResize();
animate();