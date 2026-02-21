 const game = new Chess();
const scene = new THREE.Scene();
const loader = new THREE.GLTFLoader();
const modelCache = {};
const pieces = []; 
const tiles = [];
let selectedPiece = null;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const MODEL_FILES = {
    'pawn': 'peao.glb',
    'rook': 'torre.glb',
    'knight': 'cavaleiro.glb',
    'bishop': 'bispo.glb',
    'queen': 'rainha.glb',
    'king': 'rei.glb'
};

async function initGame() {
    scene.background = new THREE.Color(0x222222);
    createEnvironment();
    createBoard(); 
    
    document.getElementById('turn-indicator').innerText = "A PREPARAR BATALHA...";

    const loadPromises = Object.entries(MODEL_FILES).map(([type, url]) => {
        return new Promise((resolve) => {
            loader.load(url, (gltf) => {
                modelCache[type] = gltf.scene;
                resolve();
            }, undefined, resolve);
        });
    });

    await Promise.all(loadPromises);
    renderPiecesFromFen();
    document.getElementById('turn-indicator').innerText = "TUA VEZ (BRANCAS)";
    animate();
}

function createPiece(x, z, colorHex, type, team) {
    const group = new THREE.Group();
    const original = modelCache[type];

    if (original) {
        const model = original.clone();
        
        // 1 & 2. CORREÇÃO DE ESCALA E ORIENTAÇÃO (PEÇAS MAIORES)
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        
        // Aumentamos o targetSize para 1.5 - 2.0 para as peças ficarem imponentes
        const targetSize = (type === 'king' || type === 'queen') ? 1.8 : 1.4;
        const scale = targetSize / maxDim;
        model.scale.set(scale, scale, scale);

        // 3. CENTRALIZAÇÃO (Resolve a Torre "quadrada")
        const centerBox = new THREE.Box3().setFromObject(model);
        const center = centerBox.getCenter(new THREE.Vector3());
        model.position.x = -center.x;
        model.position.z = -center.z;
        model.position.y = -centerBox.min.y;

        // 4. CORREÇÃO DE MATERIAIS (Brancas vs Pretas)
        model.traverse(child => {
            if (child.isMesh) {
                child.material = new THREE.MeshStandardMaterial({ 
                    color: colorHex, 
                    roughness: 0.4,
                    metalness: 0.3
                });
            }
        });
        
        // 1. RODAR AS PEÇAS PARA FICAREM DE FRENTE
        // Ajuste manual de 180 graus (Math.PI) conforme a equipa
        model.rotation.y = (team === 'white') ? Math.PI : 0;
        
        group.add(model);
    }

    group.position.set(x - 3.5, 0, z - 3.5);
    group.userData = { gridX: x, gridZ: z, team, type };
    scene.add(group);
    pieces.push(group);
}

function createBoard() {
    for (let x = 0; x < 8; x++) {
        for (let z = 0; z < 8; z++) {
            const tile = new THREE.Mesh(
                new THREE.BoxGeometry(1, 0.2, 1),
                new THREE.MeshStandardMaterial({ color: (x + z) % 2 === 0 ? 0xddbb99 : 0x442211 })
            );
            tile.position.set(x - 3.5, -0.1, z - 3.5);
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
    
    // 5. MAPEAMENTO CORRETO (Torre -> Cavaleiro -> Bispo)
    // A biblioteca chess.js já retorna r, n, b nesta ordem. 
    // Se estiverem trocados, o erro costuma estar na visualização da câmara.
    const typeMap = { 'p': 'pawn', 'r': 'rook', 'n': 'knight', 'b': 'bishop', 'q': 'queen', 'k': 'king' };
    
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const sq = board[r][c];
            if (sq) {
                const color = sq.color === 'w' ? 0xffffff : 0x222222;
                createPiece(c, r, color, typeMap[sq.type], sq.color === 'w' ? 'white' : 'black');
            }
        }
    }
}

// LÓGICA DE MOVIMENTO (Clicar na peça e depois no destino)
function handleInteraction(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const pieceHits = raycaster.intersectObjects(pieces, true);
    const tileHits = raycaster.intersectObjects(tiles);

    if (pieceHits.length > 0) {
        let p = pieceHits[0].object;
        while(p.parent && !p.userData.team) p = p.parent;
        if (p.userData.team === (game.turn() === 'w' ? 'white' : 'black')) {
            selectedPiece = p;
            document.getElementById('message-log').innerText = "Peça escolhida. Onde queres movê-la?";
        }
    } else if (selectedPiece && tileHits.length > 0) {
        const t = tileHits[0].object.userData;
        const from = String.fromCharCode(97 + selectedPiece.userData.gridX) + (8 - selectedPiece.userData.gridZ);
        const to = String.fromCharCode(97 + t.x) + (8 - t.z);
        
        const move = game.move({ from, to, promotion: 'q' });
        if (move) {
            renderPiecesFromFen();
            selectedPiece = null;
            document.getElementById('turn-indicator').innerText = game.turn() === 'w' ? "BRANCAS" : "PRETAS";
        }
    }
}

function createEnvironment() {
    const light = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(light);
    const sun = new THREE.DirectionalLight(0xffffff, 0.5);
    sun.position.set(5, 15, 5);
    scene.add(sun);
}

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
// Vista de cima e de lado para ver melhor a profundidade
camera.position.set(0, 12, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

window.addEventListener('click', handleInteraction);
function animate() { requestAnimationFrame(animate); renderer.render(scene, camera); }

initGame();