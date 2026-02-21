 const game = new Chess();
const scene = new THREE.Scene();
const loader = new THREE.GLTFLoader();
const modelCache = {};

const MODEL_FILES = {
    'pawn': 'peao.glb',
    'rook': 'torre.glb',
    'knight': 'cavaleiro.glb',
    'bishop': 'bispo.glb',
    'queen': 'rainha.glb',
    'king': 'rei.glb'
};

const pieces = []; 
const tiles = [];
let selectedPiece = null;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

async function initGame() {
    createEnvironment();
    createBoard(); 
    
    const turnText = document.getElementById('turn-indicator');
    turnText.innerText = "FORJANDO PEÇAS...";

    const loadPromises = Object.entries(MODEL_FILES).map(([type, url]) => {
        return new Promise((resolve) => {
            loader.load(url, (gltf) => {
                modelCache[type] = gltf.scene;
                resolve();
            }, undefined, (err) => resolve());
        });
    });

    await Promise.all(loadPromises);
    renderPiecesFromFen();
    turnText.innerText = "VEZ DAS BRANCAS";
    animate();
}

function createPiece(x, z, colorHex, type, team) {
    const group = new THREE.Group();
    const original = modelCache[type];

    if (original) {
        const model = original.clone();
        
        // --- 1. NORMALIZAÇÃO DE ESCALA REAL ---
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        
        // Define o tamanho real no tabuleiro (Rei/Rainha maiores que Peão)
        const targetSize = (type === 'king' || type === 'queen') ? 0.9 : 0.75;
        const scale = targetSize / maxDim;
        model.scale.set(scale, scale, scale);

        // --- 2. CENTRALIZAÇÃO E ALTURA (Resolve a Torre invisível/enterrada) ---
        const updatedBox = new THREE.Box3().setFromObject(model);
        const center = updatedBox.getCenter(new THREE.Vector3());
        model.position.x = -center.x;
        model.position.z = -center.z;
        model.position.y = -updatedBox.min.y; // Força a base a tocar o tabuleiro

        // --- 3. CORREÇÃO DE MATERIAIS (Resolve Bispos/Rainha pretos) ---
        model.traverse(child => {
            if (child.isMesh) {
                child.material = new THREE.MeshStandardMaterial({ 
                    color: colorHex,
                    metalness: 0.2,
                    roughness: 0.6,
                    // Garante que a cor ignore texturas antigas do ficheiro
                    map: null 
                });
                child.castShadow = true;
            }
        });
        group.add(model);
    }

    group.position.set(x - 3.5, 0.05, z - 3.5);
    group.userData = { gridX: x, gridZ: z, team, type };
    
    // Inverter as pretas para ficarem de frente
    if (team === 'black') group.rotation.y = Math.PI;

    scene.add(group);
    pieces.push(group);
}

// --- TABULEIRO E LÓGICA DE JOGO ---
function createBoard() {
    for (let x = 0; x < 8; x++) {
        for (let z = 0; z < 8; z++) {
            const tile = new THREE.Mesh(
                new THREE.BoxGeometry(1, 0.1, 1),
                new THREE.MeshStandardMaterial({ color: (x + z) % 2 === 0 ? 0xddbb99 : 0x442211 })
            );
            tile.position.set(x - 3.5, -0.05, z - 3.5);
            tile.userData = { x, z };
            scene.add(tile);
            tiles.push(tile);
        }
    }
}

function renderPiecesFromFen() {
    pieces.forEach(p => scene.remove(p));
    pieces.length = 0;
    const board = game.board();
    
    // Mapeamento correto das peças da biblioteca chess.js
    const typeMap = { 'p': 'pawn', 'r': 'rook', 'n': 'knight', 'b': 'bishop', 'q': 'queen', 'k': 'king' };
    
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const sq = board[r][c];
            if (sq) {
                // Brancas: Cinza muito claro | Pretas: Cinza muito escuro
                const color = sq.color === 'w' ? 0xffffff : 0x222222;
                createPiece(c, r, color, typeMap[sq.type], sq.color === 'w' ? 'white' : 'black');
            }
        }
    }
}

// --- INTERAÇÃO (Adicionando o movimento que faltava) ---
function handleInteraction(clientX, clientY) {
    mouse.x = (clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const pieceHits = raycaster.intersectObjects(pieces, true);
    const tileHits = raycaster.intersectObjects(tiles);

    if (pieceHits.length > 0) {
        let obj = pieceHits[0].object;
        while(obj.parent && !obj.userData.team) obj = obj.parent;
        
        if (obj.userData.team === (game.turn() === 'w' ? 'white' : 'black')) {
            selectedPiece = obj;
            document.getElementById('message-log').innerText = "Peça selecionada!";
        }
    } else if (selectedPiece && tileHits.length > 0) {
        const t = tileHits[0].object.userData;
        const from = String.fromCharCode(97 + selectedPiece.userData.gridX) + (8 - selectedPiece.userData.gridZ);
        const to = String.fromCharCode(97 + t.x) + (8 - t.z);
        
        const move = game.move({ from, to, promotion: 'q' });
        if (move) {
            renderPiecesFromFen();
            selectedPiece = null;
            document.getElementById('turn-indicator').innerText = game.turn() === 'w' ? "VEZ DAS BRANCAS" : "VEZ DAS PRETAS";
        }
    }
}

function createEnvironment() {
    scene.background = new THREE.Color(0x333333);
    const light = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(light);
    const sun = new THREE.DirectionalLight(0xffffff, 0.6);
    sun.position.set(5, 10, 5);
    scene.add(sun);
}

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 10, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

window.addEventListener('mousedown', (e) => handleInteraction(e.clientX, e.clientY));
function animate() { requestAnimationFrame(animate); renderer.render(scene, camera); }

initGame();