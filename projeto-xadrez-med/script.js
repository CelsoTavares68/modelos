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
    // 1. Criar o mundo primeiro
    createEnvironment();
    createBoard(); 
    animate(); 

    // 2. Tentar carregar as peças
    const loadPromises = Object.entries(MODEL_FILES).map(([type, url]) => {
        return new Promise((resolve) => {
            loader.load(url, (gltf) => {
                modelCache[type] = gltf.scene;
                resolve();
            }, undefined, (err) => {
                console.error("Arquivo não encontrado ou erro no nome:", url);
                resolve(); // Não deixa o jogo travar
            });
        });
    });

    await Promise.all(loadPromises);
    
    // 3. Colocar as peças no tabuleiro (se carregaram, usam 3D, se não, usam caixas)
    renderPiecesFromFen();
    document.getElementById('turn-indicator').innerText = "VEZ DAS BRANCAS";
}

function createPiece(x, z, colorHex, type, team) {
    const group = new THREE.Group();
    const original = modelCache[type];

    if (original) {
        const model = original.clone();
        let s = 0.4;
        if (type === 'king' || type === 'queen') s = 0.55;
        model.scale.set(s, s, s);

        model.traverse(child => {
            if (child.isMesh) {
                child.material = new THREE.MeshStandardMaterial({ color: colorHex });
                child.castShadow = true;
            }
        });
        group.add(model);
    } else {
        // Se o arquivo .glb falhar (404), cria um cubo colorido para você poder jogar
        const tempGeo = new THREE.BoxGeometry(0.5, type === 'king' ? 1.2 : 0.7, 0.5);
        const tempMat = new THREE.MeshStandardMaterial({ color: colorHex });
        const tempMesh = new THREE.Mesh(tempGeo, tempMat);
        tempMesh.position.y = 0.35;
        group.add(tempMesh);
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
camera.position.set(0, 10, 10);
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