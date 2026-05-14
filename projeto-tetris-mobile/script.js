 const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level'); // Note: Verifique se existe no HTML ou será ignorado
const highScoreElement = document.getElementById('highScore');
const btnPause = document.getElementById('btnPause');

// --- 1. CONFIGURAÇÃO DE ÁUDIOS ---
const sfxAbertura = new Audio('abertura.mp3');
const sfxDescida = new Audio('descida.mp3');
const sfxPares = new Audio('formarpares.mp3');
const sfxMilPontos = new Audio('mil-pontos.mp3');
const sfxFim = new Audio('fim.mp3');

// Função de segurança para tocar áudio
function playSFX(audio) {
    audio.pause();
    audio.currentTime = 0;
    audio.play().catch(e => console.log("Audio play blocked")); 
}

// --- 2. CONFIGURAÇÕES E ESTADO DO JOGO ---
const ROWS = 15;
const COLS = 10;
const BLOCK_SIZE = 40;
const FRUITS = ['🍎', '🍇', '🍊', '🍌', '💎', '🍓', '🥝'];
const nextPieceElement = document.getElementById('nextPiece');

let score = 0;
let level = 1;
let speed = 1000;
let isPaused = false;
let isProcessingCombo = false; // Trava para evitar movimentos durante animações
let gameLoop = null;
let board = Array(ROWS).fill().map(() => Array(COLS).fill(null));
let blinkingBlocks = [];
let lastMilestone = 0;
let nextPiece = randomPiece(); // Gera a primeira "reserva"
let comboCount = 0; // Quantidade de explosões seguidas na mesma jogada
let particles = [];
let comboMessages = []; // Mensagens flutuantes de combo

// Recorde Local
let highScore = parseInt(localStorage.getItem('fruitColumnsHighScore')) || 0;
highScoreElement.innerText = highScore;

let piece = randomPiece();

function randomPiece() {
    return {
        x: Math.floor(COLS / 2) - 1,
        y: 0,
        items: [
            Math.floor(Math.random() * FRUITS.length),
            Math.floor(Math.random() * FRUITS.length),
            Math.floor(Math.random() * FRUITS.length)
        ]
    };
}

// --- 3. RENDERIZAÇÃO ---
function draw(showBlinking = true) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Grade de fundo
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    for(let i=0; i<COLS; i++) {
        for(let j=0; j<ROWS; j++) {
            ctx.strokeRect(i*BLOCK_SIZE, j*BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        }
    }

    // Desenha Tabuleiro
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c] !== null) {
                const isBlinking = blinkingBlocks.some(b => b.r === r && b.c === c);
                if (!isBlinking || showBlinking) {
                    drawBlock(c, r, board[r][c]);
                }
            }
        }
    }

    // Desenha Peça Ativa (apenas se não estiver processando combo)
    if (!isProcessingCombo) {
        piece.items.forEach((fruitIdx, i) => {
            if (piece.y + i < ROWS) {
                drawBlock(piece.x, piece.y + i, fruitIdx);
            }
        });
    }

    // Overlay de Pausa
    if (isPaused && blinkingBlocks.length === 0) {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white";
        ctx.font = "30px Arial";
        ctx.textAlign = "center";
        ctx.fillText("PAUSADO", canvas.width/2, canvas.height/2);
    }

    // Desenha Mensagens de Combo
    drawComboMessages();

    // Desenha e atualiza partículas
    updateParticles();
    particles.forEach(p => {
        ctx.save(); 
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 20;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore(); 
    });

    // Se houver partículas ou animações, redesenhamos no próximo frame
    if (particles.length > 0 || blinkingBlocks.length > 0 || comboMessages.length > 0) {
        requestAnimationFrame(() => draw(showBlinking));
    }
}

function updateNextPieceDisplay() {
    if (nextPieceElement) {
        const emojis = nextPiece.items.map(idx => FRUITS[idx]).join("");
        nextPieceElement.innerText = emojis;
    }
}

function drawBlock(x, y, fruitIdx) {
    ctx.font = "28px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(FRUITS[fruitIdx], x * BLOCK_SIZE + 20, y * BLOCK_SIZE + 20);
}

// --- 4. MOVIMENTAÇÃO E COLISÃO ---
function moveDown() {
    if (isPaused || isProcessingCombo) return;
    if (!checkCollision(piece.x, piece.y + 1)) {
        piece.y++;
    } else {
        lockPiece();
    }
    draw();
}

function checkCollision(nx, ny) {
    if (nx < 0 || nx >= COLS) return true;
    if (ny + 2 >= ROWS) return true;
    for (let i = 0; i < 3; i++) {
        if (ny + i >= 0 && board[ny + i][nx] !== null) {
            return true;
        }
    }
    return false;
}

function lockPiece() {
    isProcessingCombo = true;
    piece.items.forEach((fruitIdx, i) => {
        if (piece.y + i < ROWS) board[piece.y + i][piece.x] = fruitIdx;
    });
    
    clearMatches();
}

// --- 5. SISTEMA DE COMBINAÇÕES ---
function clearMatches() {
    let toRemove = [];
    let matchSet = new Set();

    // Deteção de Trincas
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            let val = board[r][c];
            if (val === null) continue;

            // Horizontal
            if (c + 2 < COLS && val === board[r][c + 1] && val === board[r][c + 2]) {
                [0, 1, 2].forEach(i => matchSet.add(`${r},${c + i}`));
            }
            // Vertical
            if (r + 2 < ROWS && val === board[r + 1][c] && val === board[r + 2][c]) {
                [0, 1, 2].forEach(i => matchSet.add(`${r + i},${c}`));
            }
            // Diagonal \
            if (r + 2 < ROWS && c + 2 < COLS && val === board[r + 1][c + 1] && val === board[r + 2][c + 2]) {
                [0, 1, 2].forEach(i => matchSet.add(`${r + i},${c + i}`));
            }
            // Diagonal /
            if (r - 2 >= 0 && c + 2 < COLS && val === board[r - 1][c + 1] && val === board[r - 2][c + 2]) {
                [0, 1, 2].forEach(i => matchSet.add(`${r - i},${c + i}`));
            }
        }
    }

    matchSet.forEach(pos => {
        const [r, c] = pos.split(',').map(Number);
        toRemove.push({ r, c });
    });

    if (toRemove.length > 0) {
        blinkingBlocks = toRemove;
        playSFX(sfxPares);

        let flashes = 0;
        let flashInterval = setInterval(() => {
            flashes++;
            if (flashes > 6) { 
                clearInterval(flashInterval);
                
                // Cálculo de Pontuação com bónus de Combo (30%)
                const basePoints = toRemove.length * 15;
                const comboBonus = comboCount > 0 ? 1.3 : 1.0;
                const pointsGained = Math.floor(basePoints * comboBonus);

                score += pointsGained;
                scoreElement.innerText = score;
                
                if (comboCount > 0) {
                    createComboMessage(toRemove[0].c, toRemove[0].r, `COMBO X${comboCount + 1}!`);
                }
                
                comboCount++; 

                // Criar partículas e remover do tabuleiro
                toRemove.forEach(p => {
                    createParticles(p.c, p.r, "#00ffcc");
                    board[p.r][p.c] = null;
                });

                // Sistema de Nível
                if (Math.floor(score / 1000) > lastMilestone) {
                    playSFX(sfxMilPontos);
                    lastMilestone = Math.floor(score / 1000);
                    level++;
                    if(levelElement) levelElement.innerText = level;
                    speed = Math.max(200, 1000 - (level * 50));
                    startGame(); 
                }

                if (score > highScore) {
                    highScore = score;
                    highScoreElement.innerText = highScore;
                    localStorage.setItem('fruitColumnsHighScore', highScore);
                }

                blinkingBlocks = [];
                applyGravity();
                setTimeout(clearMatches, 300); 
            } else {
                draw(flashes % 2 === 0);
            }
        }, 100);
    } else {
        isProcessingCombo = false;
        finalizeTurn();
    }
}

function finalizeTurn() {
    piece = nextPiece;
    nextPiece = randomPiece();
    comboCount = 0;
    updateNextPieceDisplay();

    if (checkCollision(piece.x, piece.y)) {
        playSFX(sfxFim);
        setTimeout(() => {
            alert("FIM DE JOGO! Pontos: " + score);
            resetGame();
        }, 100);
    }
}

function applyGravity() {
    for (let c = 0; c < COLS; c++) {
        for (let r = ROWS - 1; r > 0; r--) {
            if (board[r][c] === null) {
                for (let k = r - 1; k >= 0; k--) {
                    if (board[k][c] !== null) {
                        board[r][c] = board[k][c];
                        board[k][c] = null;
                        break;
                    }
                }
            }
        }
    }
    draw();
}

// --- 6. CONTROLOS E FLUXO ---
function startGame() {
    clearInterval(gameLoop);
    gameLoop = setInterval(moveDown, speed);
}

window.togglePause = function() {
    if (isProcessingCombo) return;
    isPaused = !isPaused;
    if (isPaused) {
        clearInterval(gameLoop);
        btnPause.innerText = "Continuar";
    } else {
        startGame();
        btnPause.innerText = "Pausar";
    }
    draw();
}

window.resetGame = function() {
    playSFX(sfxAbertura);
    board = Array(ROWS).fill().map(() => Array(COLS).fill(null));
    score = 0; level = 1; speed = 1000; isPaused = false; lastMilestone = 0;
    scoreElement.innerText = "0";
    if(levelElement) levelElement.innerText = "1";
    btnPause.innerText = "Pausar";
    isProcessingCombo = false;
    clearInterval(gameLoop);
    piece = randomPiece();
    nextPiece = randomPiece();
    updateNextPieceDisplay();
    startGame();
    draw();
}

document.addEventListener('contextmenu', event => event.preventDefault());

function handleAction(type) {
    if (isPaused || isProcessingCombo) return;
    
    // Opcional: Feedback tátil se disponível no dispositivo
    if (navigator.vibrate) navigator.vibrate(10);

    switch(type) {
        case 'left': if (piece.x > 0 && !checkCollision(piece.x - 1, piece.y)) piece.x--; break;
        case 'right': if (piece.x < COLS - 1 && !checkCollision(piece.x + 1, piece.y)) piece.x++; break;
        case 'down': moveDown(); break;
        case 'rotate': 
            let last = piece.items.pop(); 
            piece.items.unshift(last); 
            break;
    }
    draw();
}

const controls = { 'btnLeft': 'left', 'btnRight': 'right', 'btnDown': 'down', 'btnRotate': 'rotate' };

Object.keys(controls).forEach(id => {
    const btn = document.getElementById(id);
    if(btn) {
        // Usamos touchstart para resposta imediata no mobile
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Crucial: Impede zoom, seleção e cliques fantasmas
            handleAction(controls[id]);
        }, { passive: false });

        // Mantemos o click para funcionamento em Desktop, mas o e.preventDefault() no touch 
        // impede que o click seja disparado logo em seguida no mobile.
        btn.addEventListener('click', (e) => {
            if (e.pointerType !== 'touch') { // Só executa se não for toque (evita duplo acionamento)
                handleAction(controls[id]);
            }
        });
    }
}); 

function createParticles(x, y, color) {
    for (let i = 0; i < 8; i++) {
        particles.push({
            x: x * BLOCK_SIZE + 20,
            y: y * BLOCK_SIZE + 20,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            life: 20, 
            color: color
        });
    }
}

function updateParticles() {
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
    });
}

  // --- 5. SISTEMA DE COMBINAÇÕES (DURAÇÃO ESTENDIDA) ---

function createComboMessage(x, r, text) {
    comboMessages.push({
        x: x * BLOCK_SIZE,
        y: r * BLOCK_SIZE,
        text: text,
        life: 180 // Aumentado para 180 (aprox. 3 segundos a 60fps)
    });
}

function drawComboMessages() {
    comboMessages = comboMessages.filter(m => m.life > 0);
    comboMessages.forEach(m => {
        // Fade out mais lento: só começa a sumir de verdade nos últimos 60 frames
        let opacity = m.life > 60 ? 1.0 : m.life / 60;
        
        ctx.save(); // Salva o estado do contexto para não afetar outros desenhos
        ctx.globalAlpha = opacity;
        ctx.fillStyle = "#ffcc00";
        ctx.shadowColor = "black";
        ctx.shadowBlur = 4;
        ctx.font = "bold 26px Arial";
        ctx.textAlign = "center";
        
        // Movimento de subida constante e bem lento
        // O valor (180 - m.life) representa o tempo decorrido
        const elapsed = 180 - m.life;
        const offset = elapsed * 0.4; // Multiplicador baixo = subida mais lenta
        
        ctx.fillText(m.text, m.x + 20, m.y - offset); 
        
        ctx.restore(); // Restaura o estado (limpa o alpha e o shadow)
        m.life--;
    });
}

// Inicialização
updateNextPieceDisplay();
startGame();
draw();