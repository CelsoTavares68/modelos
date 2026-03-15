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

    // Desenha e atualiza partículas
     updateParticles();
particles.forEach(p => {
    ctx.save(); // Guarda o estado do canvas
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life / 20;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore(); // Restaura o estado para não afetar o resto do desenho
});

// Se houver partículas ou animações, redesenhamos no próximo frame
if (particles.length > 0 || blinkingBlocks.length > 0) {
    requestAnimationFrame(() => draw(showBlinking));
}
}


function updateNextPieceDisplay() {
    // Transforma os índices numéricos em emojis de fruta
    const emojis = nextPiece.items.map(idx => FRUITS[idx]).join("");
    nextPieceElement.innerText = emojis;
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
    // Verifica se a peça sai dos limites laterais
    if (nx < 0 || nx >= COLS) return true;
    
    // Verifica se a peça atinge o fundo
    if (ny + 2 >= ROWS) return true;

    // Verifica colisão com blocos já existentes no tabuleiro
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
    // ... (toda a tua lógica de deteção de combinações está correta aqui) ...
    // (Apenas certifique-se de manter a parte que preenche o array toRemove)

    if (toRemove.length > 0) {
        blinkingBlocks = toRemove;
        playSFX(sfxPares);

        let flashes = 0;
        let flashInterval = setInterval(() => {
            flashes++;
            if (flashes > 6) { // Terminou o piscar
                clearInterval(flashInterval);
                
                // 1. Criar partículas e APENAS AGORA remover do tabuleiro
                toRemove.forEach(p => {
                    const fruitIdx = board[p.r][p.c];
                    createParticles(p.c, p.r, "#00ffcc");
                    board[p.r][p.c] = null;
                });

                // 2. Cálculo de Pontuação (Corrigido: sem duplicar)
                const basePoints = toRemove.length * 15;
                const comboBonus = comboCount > 0 ? 1.3 : 1.0;
                const pointsGained = Math.floor(basePoints * comboBonus);

                score += pointsGained;
                scoreElement.innerText = score;
                
                // Se for combo, podemos mostrar algo no console ou preparar um texto
                if(comboCount > 0) console.log("COMBO X" + (comboCount + 1));
                
                comboCount++; 

                // 3. Sistema de Nível (Milestone)
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
                // Verifica se a queda das frutas gerou novos pares
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
    // A peça atual passa a ser a que estava na reserva
    piece = nextPiece;
    // Geramos uma nova reserva para a próxima jogada
    nextPiece = randomPiece();

    comboCount = 0;
    
    // Atualizamos o mostrador no ecrã
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
    startGame();
    draw();
    nextPiece = randomPiece();
updateNextPieceDisplay();
}

function handleAction(type) {
    if (isPaused || isProcessingCombo) return;
    playSFX(sfxDescida);

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

// Mapeamento de botões
const controls = { 'btnLeft': 'left', 'btnRight': 'right', 'btnDown': 'down', 'btnRotate': 'rotate' };

Object.keys(controls).forEach(id => {
    const btn = document.getElementById(id);
    if(btn) {
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            handleAction(controls[id]);
        }, { passive: false });
        btn.addEventListener('click', () => handleAction(controls[id]));
    }
});

// Inicialização
startGame();
draw();

function createParticles(x, y, color) {
    for (let i = 0; i < 8; i++) {
        particles.push({
            x: x * BLOCK_SIZE + 20,
            y: y * BLOCK_SIZE + 20,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            life: 20, // Frames de duração
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