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

let turn = 'white';
const pieces = []; 
const tiles = [];
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

async function initGame() {
    createEnvironment();
    createBoard(); 
    
    const turnText = document.getElementById('turn-indicator');
    turnText.innerText = "A RECRUTAR EXÉRCITO...";

    // Carregamento Seguro
    const loadPromises = Object.entries(MODEL_FILES).map(([type, url]) => {
        return new Promise((resolve) => {
            loader.load(url, (gltf) => {
                modelCache[type] = gltf.scene;
                resolve();
            }, undefined, (err) => {
                console.error("Não encontrei o ficheiro:", url);
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
        
        // --- MOTOR DE REDIMENSIONAMENTO AUTOMÁTICO ---
        // Isto impede o erro das "listras" (peças gigantes)
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        
        // Define o tamanho final no tabuleiro (0.7 para peças normais, 0.9 para reis)
        const targetSize = (type === 'king' || type === 'queen') ? 0.85 : 0.65;
        const scale = targetSize / maxDim;
        model.scale.set(scale, scale, scale);

        // --- MOTOR DE POSICIONAMENTO ---
        // Garante que a base da peça toque no topo do tabuleiro
        const updatedBox = new THREE.Box3().setFromObject(model);
        const center = updatedBox.getCenter(new THREE.Vector3());
        model.position.x = -center.x;
        model.position.z = -center.z;
        model.position.y = -updatedBox.min.y; 

        model.traverse(child => {
            if (child.isMesh) {
                child.material = new THREE.MeshStandardMaterial({ 
                    color: colorHex,
                    metalness: 0.3,
                    roughness: 0.7
                });
                child.castShadow = true;
            }
        });
        group.add(model);
    } else {
        // Fallback: Se o GLB falhar, cria um cilindro para não crashar o jogo
        const geometry = new THREE.CylinderGeometry(0.25, 0.35, 0.8, 16);
        const material = new THREE.MeshStandardMaterial({ color: colorHex });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = 0.4;
        group.add(mesh);
    }

    group.position.set(x - 3.5, 0.05, z - 3.5); // 0.05 para ficar em cima do tile
    group.userData = { gridX: x, gridZ: z, team, type };
    if (team === 'black') group.rotation.y = Math.PI;

    scene.add(group);
    pieces.push(group);
}

// --- CONFIGURAÇÃO VISUAL ---
function createEnvironment() {
    scene.background = new THREE.Color(0x222222); // Fundo escuro para destacar
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const sun = new THREE.DirectionalLight(0xffffff, 1);
    sun.position.set(5, 10, 5);
    sun.castShadow = true;
    scene.add(sun);
}

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
// Câmara mais afastada e alta para garantir que vês o tabuleiro
camera.position.set(0, 12, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
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
                createPiece(c, r, sq.color === 'w' ? 0xeeeeee : 0x222222, typeMap[sq.type], sq.color === 'w' ? 'white' : 'black');
            }
        }
    }
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

initGame();