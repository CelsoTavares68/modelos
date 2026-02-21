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

let animations = []; // Lista para controlar as peças que estão deslizando

// --- 2. AUXILIARES ---
function toAlgebraic(x, z) {
    const col = String.fromCharCode(97 + x);
    const row = 8 - z;
    return col + row;
}

function createExplosion(pos, color) {
    for (let i = 0; i < 15; i++) {
        const p = new THREE.Mesh(
            new THREE.SphereGeometry(0.05), 
            new THREE.MeshStandardMaterial({ color, emissive: color })
        );
        p.position.copy(pos);
        // Velocidade aleatória para a explosão
        const vel = new THREE.Vector3(
            (Math.random() - 0.5) * 0.1, 
            Math.random() * 0.2, 
            (Math.random() - 0.5) * 0.1
        );
        scene.add(p);
        particles.push({ mesh: p, vel, life: 1.0 });
    }
}

  function syncBoard() {
    const board = game.board();
    const newPositions = [];

    // 1. Mapeia o estado atual do motor de xadrez
    for (let j = 0; j < 8; j++) {
        for (let i = 0; i < 8; i++) {
            const p = board[j][i];
            if (p) {
                newPositions.push({ x: i, z: j, type: p.type, team: p.color });
            }
        }
    }

    // 2. Identifica e anima APENAS a peça que se moveu (Correção do efeito de grupo)
    pieces.forEach(p => {
        // Procuramos se existe uma peça EXATAMENTE na posição onde este objeto 3D estava
        const isStillThere = newPositions.find(pos => 
            pos.x === p.userData.gridX && 
            pos.z === p.userData.gridZ && 
            pos.type === p.userData.type && 
            pos.team === p.userData.team
        );

        // Se a peça NÃO está mais na casa antiga, vamos ver para onde ela foi
        if (!isStillThere) {
            const match = newPositions.find(pos => 
                pos.type === p.userData.type && 
                pos.team === p.userData.team && 
                // Garante que não pegamos uma peça que já tem um objeto 3D associado noutra casa
                !pieces.some(otherP => otherP !== p && otherP.userData.gridX === pos.x && otherP.userData.gridZ === pos.z)
            );

            if (match) {
                animations.push({
                    obj: p,
                    startPos: p.position.clone(),
                    targetPos: new THREE.Vector3(match.x - 3.5, 0.1, match.z - 3.5),
                    alpha: 0
                });
                p.userData.gridX = match.x;
                p.userData.gridZ = match.z;
            }
        }
    });

    // 3. Remove as peças capturadas e gera explosão
    for (let i = pieces.length - 1; i >= 0; i--) {
        const p = pieces[i];
        const stillExists = newPositions.some(pos => 
            pos.x === p.userData.gridX && 
            pos.z === p.userData.gridZ && 
            pos.type === p.userData.type && 
            pos.team === p.userData.team
        );
        
        if (!stillExists) {
            const particleColor = p.userData.team === 'w' ? 0xffffff : 0x333333;
            createExplosion(p.position, particleColor);
            scene.remove(p);
            pieces.splice(i, 1);
        }
    }

    // 4. Cria peças novas (Promoções ou início)
    newPositions.forEach(pos => {
        const pieceExists = pieces.some(p => p.userData.gridX === pos.x && p.userData.gridZ === pos.z);
        if (!pieceExists) {
            const color = pos.team === 'w' ? 0xffffff : 0x333333;
            createPiece(pos.x, pos.z, color, pos.type, pos.team);
        }
    });

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
    for (let m of moves) { if (m.includes('x')) return m; }
    return moves[Math.floor(Math.random() * moves.length)];
}

// --- 5. INTERAÇÃO (FIX DEFINITIVO) ---
function onInteraction(e) {
    // CORREÇÃO DOS BOTÕES: Se o clique/toque for em elementos da interface (UI), não faz nada.
    if (e.target.closest('#ui-overlay') || e.target.tagName === 'BUTTON' || e.target.tagName === 'SELECT') {
        return; 
    }

    if (e.cancelable) e.preventDefault();
    if (isAiThinking || game.game_over()) return;

    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }

    mouse.x = (clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(tiles.concat(pieces), true);

    if (intersects.length > 0) {
        let obj = intersects[0].object;
        let tile = obj.userData.x !== undefined ? obj : null;
        if (!tile && obj.parent) {
            tile = tiles.find(t => t.userData.x === obj.parent.userData.gridX && t.userData.z === obj.parent.userData.gridZ);
        }

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

    // 1. Processa os movimentos das peças (Lerp + Salto)
    animations.forEach((anim, index) => {
        anim.alpha += 0.04; 
        anim.obj.position.lerpVectors(anim.startPos, anim.targetPos, anim.alpha);
        const jumpHeight = 0.5; 
        anim.obj.position.y = 0.1 + (Math.sin(anim.alpha * Math.PI) * jumpHeight);
        
        if (anim.alpha >= 1) {
            anim.obj.position.copy(anim.targetPos);
            animations.splice(index, 1);
        }
    });

    // 2. Levitação da peça selecionada
    if (selectedPiece && animations.length === 0) {
        selectedPiece.position.y = 0.2 + Math.sin(Date.now() * 0.008) * 0.1;
    }

    // 3. Processa as partículas de explosão
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.mesh.position.add(p.vel);
        p.vel.y -= 0.005; 
        p.life -= 0.02;   
        p.mesh.material.transparent = true;
        p.mesh.material.opacity = p.life;
        
        if (p.life <= 0) {
            scene.remove(p.mesh);
            particles.splice(i, 1);
        }
    }

    // 4. RENDERIZAÇÃO (Agora fora de qualquer ciclo, garantindo que o tabuleiro apareça sempre)
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

// Eventos de Botão (Garantindo que funcionem no mobile)
document.getElementById('reset-button').addEventListener('click', (e) => {
    game.reset(); 
    syncBoard();
});

document.getElementById('update-button').addEventListener('click', (e) => {
    window.location.reload(true);
});

createBoard();
syncBoard();
onWindowResize();
animate();