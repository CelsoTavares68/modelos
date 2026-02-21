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
    'pawn': 'peao.glb', 'rook': 'torre.glb', 'knight': 'cavaleiro.glb',
    'bishop': 'bispo.glb', 'queen': 'rainha.glb', 'king': 'rei.glb'
};

async function initGame() {
    // Luzes e Cenário
    scene.background = new THREE.Color(0x111111);
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set(5, 15, 5);
    scene.add(sun);

    createBoard(); 
    
    document.getElementById('turn-indicator').innerText = "CALIBRANDO MODELOS...";

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
    document.getElementById('turn-indicator').innerText = "SUA VEZ (BRANCAS)";
    animate();
}

function createPiece(x, z, colorHex, type, team) {
    const group = new THREE.Group();
    const original = modelCache[type];

    if (original) {
        const model = original.clone();
        
        // 1. FORÇAR ESCALA (Resolve peças minúsculas/gigantes)
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = (type === 'king' || type === 'queen' ? 0.85 : 0.7) / maxDim;
        model.scale.set(scale, scale, scale);

        // 2. CENTRALIZAR PIVOT (Resolve Torre sumida)
        const centerBox = new THREE.Box3().setFromObject(model);
        const center = centerBox.getCenter(new THREE.Vector3());
        model.position.x = -center.x;
        model.position.z = -center.z;
        model.position.y = -centerBox.min.y;

        // 3. CORREÇÃO DE MATERIAL E ROTAÇÃO
        model.traverse(child => {
            if (child.isMesh) {
                child.material = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.6 });
            }
        });
        
        // Virar as brancas de frente para as pretas
        model.rotation.y = (team === 'white') ? 0 : Math.PI;
        
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
                new THREE.BoxGeometry(1, 0.2, 1), // Mais espesso para o clique pegar melhor
                new THREE.MeshStandardMaterial({ color: (x + z) % 2 === 0 ? 0xddbb99 : 0x442211 })
            );
            tile.position.set(x - 3.5, -0.1, z - 3.5);
            tile.userData = { x, z };
            scene.add(tile);
            tiles.push(tile);
        }
    }
}

function handleInteraction(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const pieceHits = raycaster.intersectObjects(pieces, true);
    const tileHits = raycaster.intersectObjects(tiles);

    if (pieceHits.length > 0) {
        let clickedPiece = pieceHits[0].object;
        while(clickedPiece.parent && !clickedPiece.userData.team) clickedPiece = clickedPiece.parent;
        
        if (clickedPiece.userData.team === (game.turn() === 'w' ? 'white' : 'black')) {
            selectedPiece = clickedPiece;
            document.getElementById('message-log').innerText = "Peça pronta! Clique no destino.";
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

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 10, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

window.addEventListener('click', handleInteraction);
function animate() { requestAnimationFrame(animate); renderer.render(scene, camera); }

initGame();