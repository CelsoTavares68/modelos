 const game = new Chess();
const scene = new THREE.Scene();
const loader = new THREE.GLTFLoader();
const modelCache = {};

// IMPORTANTE: Verifique se os nomes abaixo são IDENTICOS aos seus arquivos no GitHub
const MODEL_FILES = {
    'pawn': 'peao.glb',
    'rook': 'torre.glb',
    'knight': 'cavaleiro.glb',
    'bishop': 'bispo.glb',
    'queen': 'rainha.glb',
    'king': 'rei.glb'
};

let turn = 'white';
let isAiThinking = false;
const pieces = []; 
const tiles = [];
let selectedPiece = null;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

 async function initGame() {
    createEnvironment();
    createBoard(); 
    
    const turnText = document.getElementById('turn-indicator');
    turnText.innerText = "CARREGANDO BATALHÃO...";

    const loadPromises = Object.entries(MODEL_FILES).map(([type, url]) => {
        return new Promise((resolve) => {
            loader.load(url, (gltf) => {
                modelCache[type] = gltf.scene;
                resolve();
            }, undefined, (err) => {
                console.error("Erro no arquivo:", url);
                resolve();
            });
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
        
        // --- AJUSTE DE ESCALA INDIVIDUAL (O SEGREDO PARA NÃO BUGAR) ---
        // Se uma peça ficar gigante, diminua o número. Se sumir, aumente.
        let s = 0.5; 
        if (type === 'pawn') s = 0.005; // Alguns modelos vêm em escala enorme
        if (type === 'king') s = 0.6;
        if (type === 'knight') s = 0.8;
        if (type === 'rook') s = 0.1; // Exemplo: se a torre for gigante
        
        // Tente uma escala uniforme primeiro, se ficar ruim, ajustamos cada um:
        model.scale.set(s, s, s);

        // --- CENTRALIZAÇÃO ---
        // Garante que a peça fique em cima do quadrado e não dentro dele
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.x = -center.x;
        model.position.z = -center.z;
        model.position.y = -box.min.y; // Coloca a "base" no chão

        model.traverse(child => {
            if (child.isMesh) {
                child.material = new THREE.MeshStandardMaterial({ 
                    color: colorHex,
                    metalness: 0.2,
                    roughness: 0.8
                });
                child.castShadow = true;
            }
        });
        group.add(model);
    } else {
        // Cubo reserva se o modelo falhar
        const temp = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.7, 0.4), new THREE.MeshStandardMaterial({color: colorHex}));
        temp.position.y = 0.35;
        group.add(temp);
    }

    group.position.set(x - 3.5, 0, z - 3.5);
    group.userData = { gridX: x, gridZ: z, team, type };
    if (team === 'black') group.rotation.y = Math.PI;

    scene.add(group);
    pieces.push(group);
}

// --- RESTO DO CÓDIGO (Ambiente, Render, Board) ---
function createEnvironment() {
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const sun = new THREE.DirectionalLight(0xffffff, 1);
    sun.position.set(5, 10, 5);
    scene.add(sun);
}

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 8, 8);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

function createBoard() {
    for (let x = 0; x < 8; x++) {
        for (let z = 0; z < 8; z++) {
            const tile = new THREE.Mesh(
                new THREE.BoxGeometry(1, 0.1, 1),
                new THREE.MeshStandardMaterial({ color: (x + z) % 2 === 0 ? 0xddbb99 : 0x442211 })
            );
            tile.position.set(x - 3.5, -0.05, z - 3.5);
            scene.add(tile);
            tiles.push(tile);
        }
    }
}

function renderPiecesFromFen() {
    pieces.forEach(p => scene.remove(p));
    pieces.length = 0;
    const board = game.board();
    const typeMap = { 'p': 'pawn', 'r': 'rook', 'n': 'knight', 'b': 'bishop', 'q': 'queen', 'k': 'king' };
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const sq = board[r][c];
            if (sq) {
                createPiece(c, r, sq.color === 'w' ? 0xffffff : 0x222222, typeMap[sq.type], sq.color === 'w' ? 'white' : 'black');
            }
        }
    }
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

initGame();