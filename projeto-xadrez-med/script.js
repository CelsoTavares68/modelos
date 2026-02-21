 // --- 1. CONFIGURAÇÃO INICIAL ---
const game = new Chess();
const scene = new THREE.Scene();
const loader = new THREE.GLTFLoader();
const modelCache = {};

// Mapeamento dos teus ficheiros (Devem estar na mesma pasta que o script.js)
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

// --- 2. CARREGAMENTO DOS MODELOS ---
async function initGame() {
    const turnText = document.getElementById('turn-indicator');
    
    // Criar Cenário
    createEnvironment();

    // Carregar todos os modelos em paralelo
    const loadPromises = Object.entries(MODEL_FILES).map(([type, url]) => {
        return new Promise((resolve) => {
            loader.load(url, (gltf) => {
                modelCache[type] = gltf.scene;
                resolve();
            }, undefined, (err) => {
                console.error("Erro ao carregar:", url, err);
                resolve();
            });
        });
    });

    await Promise.all(loadPromises);
    
    turnText.innerText = "VEZ DAS BRANCAS";
    createBoard();
    renderPiecesFromFen();
    onWindowResize();
    animate();
}

// --- 3. AMBIENTE E ILUMINAÇÃO ---
function createEnvironment() {
    // Céu
    const skyGeo = new THREE.SphereGeometry(100, 32, 15);
    const skyMat = new THREE.ShaderMaterial({
        uniforms: {
            topColor: { value: new THREE.Color(0x224488) },
            bottomColor: { value: new THREE.Color(0xffaa88) },
            offset: { value: 33 },
            exponent: { value: 0.6 }
        },
        vertexShader: `varying vec3 vWorldPosition; void main() { vec4 worldPosition = modelMatrix * vec4( position, 1.0 ); vWorldPosition = worldPosition.xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }`,
        fragmentShader: `uniform vec3 topColor; uniform vec3 bottomColor; uniform float offset; uniform float exponent; varying vec3 vWorldPosition; void main() { float h = normalize( vWorldPosition + offset ).y; gl_FragColor = vec4( mix( bottomColor, topColor, max( pow( max( h, 0.0 ), exponent ), 0.0 ) ), 1.0 ); }`,
        side: THREE.BackSide
    });
    scene.add(new THREE.Mesh(skyGeo, skyMat));

    // Chão
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x1a220a }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    scene.add(ground);
}

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const sun = new THREE.DirectionalLight(0xffddaa, 1.2);
sun.position.set(10, 15, 10);
sun.castShadow = true;
scene.add(sun);

// --- 4. TABULEIRO E PEÇAS ---
function createBoard() {
    for (let x = 0; x < 8; x++) {
        for (let z = 0; z < 8; z++) {
            const isBlack = (x + z) % 2 !== 0;
            const tile = new THREE.Mesh(
                new THREE.BoxGeometry(1, 0.1, 1),
                new THREE.MeshStandardMaterial({ color: isBlack ? 0x442211 : 0xddbb99 })
            );
            tile.position.set(x - 3.5, -0.05, z - 3.5);
            tile.userData = { x, z };
            scene.add(tile);
            tiles.push(tile);
        }
    }
}

function createPiece(x, z, colorHex, type, team) {
    const group = new THREE.Group();
    const original = modelCache[type];

    if (original) {
        const model = original.clone();
        
        // Ajuste de Escala baseado nos teus modelos
        let s = 0.4;
        if (type === 'king' || type === 'queen') s = 0.55;
        if (type === 'pawn') s = 0.35;
        model.scale.set(s, s, s);

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
    }

    group.position.set(x - 3.5, 0, z - 3.5);
    group.userData = { gridX: x, gridZ: z, team, type };
    if (team === 'black') group.rotation.y = Math.PI;

    scene.add(group);
    pieces.push(group);
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
                const color = sq.color === 'w' ? 0xffffff : 0x222222;
                createPiece(c, r, color, typeMap[sq.type], sq.color === 'w' ? 'white' : 'black');
            }
        }
    }
}

// --- 5. INTERAÇÃO E MOVIMENTO ---
function handleInteraction(clientX, clientY) {
    if (isAiThinking || game.game_over()) return;

    mouse.x = (clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const pieceHits = raycaster.intersectObjects(pieces, true);
    const tileHits = raycaster.intersectObjects(tiles);

    if (pieceHits.length > 0) {
        let obj = pieceHits[0].object;
        while (obj.parent && !obj.userData.team) obj = obj.parent;
        
        if (obj.userData.team === turn) {
            deselectAll();
            selectedPiece = obj;
            obj.traverse(n => { if(n.isMesh) n.material.emissive.setHex(0x224400); });
        } else if (selectedPiece) {
            executeMove(selectedPiece, obj.userData.gridX, obj.userData.gridZ);
        }
    } else if (selectedPiece && tileHits.length > 0) {
        executeMove(selectedPiece, tileHits[0].object.userData.x, tileHits[0].object.userData.z);
    }
}

function executeMove(p, tx, tz) {
    const from = ['a','b','c','d','e','f','g','h'][p.userData.gridX] + (8 - p.userData.gridZ);
    const to = ['a','b','c','d','e','f','g','h'][tx] + (8 - tz);
    
    const move = game.move({ from, to, promotion: 'q' });

    if (move) {
        renderPiecesFromFen();
        selectedPiece = null;
        updateStatus();
        if (document.getElementById('game-mode').value === 'pve' && !game.game_over()) playAiTurn();
    }
}

function playAiTurn() {
    isAiThinking = true;
    setTimeout(() => {
        const moves = game.moves();
        if (moves.length > 0) {
            game.move(moves[Math.floor(Math.random() * moves.length)]);
            renderPiecesFromFen();
        }
        isAiThinking = false;
        updateStatus();
    }, 500);
}

function updateStatus() {
    turn = game.turn() === 'w' ? 'white' : 'black';
    document.getElementById('turn-indicator').innerText = game.game_over() ? "FIM DE JOGO" : `VEZ DAS ${turn === 'white' ? 'BRANCAS' : 'PRETAS'}`;
}

function deselectAll() {
    pieces.forEach(p => p.traverse(n => { if(n.isMesh) n.material.emissive.setHex(0x000000); }));
}

// --- 6. CICLO PRINCIPAL ---
function onWindowResize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.position.set(0, 10, 8);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

window.addEventListener('resize', onWindowResize);
window.addEventListener('mousedown', (e) => handleInteraction(e.clientX, e.clientY));

initGame();