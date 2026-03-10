 const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const highScoreElement = document.getElementById('highScore');
const btnPause = document.getElementById('btnPause');

// --- 1. CONFIGURAÇÃO DE ÁUDIOS (MELHORADA PARA EVITAR TRAVAMENTOS) ---
const sfxAbertura = new Audio('abertura.mp3');
const sfxDescida = new Audio('descida.mp3');
const sfxPares = new Audio('formarpares.mp3');
const sfxMilPontos = new Audio('mil-pontos.mp3');
const sfxFim = new Audio('fim.mp3');

// Função para tocar som sem travar a CPU
function playSFX(audio, rate = 1) {
    audio.pause();
    audio.currentTime = 0;
    audio.playbackRate = rate;
    audio.play().catch(() => {}); // Ignora erro se o navegador bloquear o autoplay
}

// --- 2. VARIÁVEIS DE ESTADO INTEGRAL ---
const ROWS = 15;
const COLS = 10;
const BLOCK_SIZE = 40;
const FRUITS = ['🍎', '🍇', '🍊', '🍌', '💎', '🍓', '🥝'];

let score = 0;
let level = 1;
let speed = 1000;
let isPaused = false;
let isProcessing = false; // TRAVA DE SEGURANÇA MÁSTICA
let gameLoop = null;
let board = Array(ROWS).fill().map(() => Array(COLS).fill(null));
let blinkingBlocks = [];
let lastMilestone = 0; 
let comboCount = 0; 
let floatingTexts = []; 

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

// --- 3. TEXTO FLUTUANTE ULTRA-RÁPIDO ---
function addFloatingText(text, x, y, color = 'white', fontSize = '28px') {
    floatingTexts.push({
        text: text,
        x: x,
        y: y,
        alpha: 1.0,
        color: color,
        fontSize: fontSize,
        speedY: -12.0 // Velocidade aumentada
    });
}

// --- 4. RENDERIZAÇÃO ---
function draw(showBlinking = true) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Grade
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    for(let i=0; i<COLS; i++) {
        for(let j=0; j<ROWS; j++) {
            ctx.strokeRect(i*BLOCK_SIZE, j*BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        }
    }

    // Tabuleiro
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

    // Peça Ativa (escondida se estiver processando combo)
    if (!isProcessing) {
        piece.items.forEach((fruitIdx, i) => {
            if (piece.y + i < ROWS) {
                drawBlock(piece.x, piece.y + i, fruitIdx);
            }
        });
    }

    // Animação de Textos
    ctx.save();
    ctx.textAlign = 'center';
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        let ft = floatingTexts[i];
        ft.y += ft.speedY; 
        ft.alpha -= 0.15; 
        if (ft.alpha <= 0) {
            floatingTexts.splice(i, 1);
        } else {
            ctx.globalAlpha = ft.alpha;
            ctx.fillStyle = ft.color;
            ctx.font = `bold ${ft.fontSize} Arial`;
            ctx.fillText(ft.text, ft.x + 20, ft.y);
        }
    }
    ctx.restore();

    if (isPaused && !isProcessing) {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white";
        ctx.font = "30px Arial";
        ctx.textAlign = "center";
        ctx.fillText("PAUSADO", canvas.width/2, canvas.height/2);
    }
}

function drawBlock(x, y, fruitIdx) {
    ctx.font = "28px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(FRUITS[fruitIdx], x * BLOCK_SIZE + 20, y * BLOCK_SIZE + 20);
}

// --- 5. LOGICA DE MOVIMENTO ---
function moveDown() {
    if (isPaused || isProcessing) return;
    if (!checkCollision(piece.x, piece.y + 1)) {
        piece.y++;
    } else {
        lockPiece();
    }
    draw();
}

function checkCollision(nx, ny) {
    if (ny + 2 >= ROWS) return true;
    for (let i = 0; i < 3; i++) {
        if (board[ny + i] && board[ny + i][nx] !== null) return true;
    }
    return false;
}

function lockPiece() {
    isProcessing = true; // Trava o input do jogador
    comboCount = 0; 
    piece.items.forEach((fruitIdx, i) => {
        if (piece.y + i < ROWS) board[piece.y + i][piece.x] = fruitIdx;
    });
    clearMatches();
}

// --- 6. SISTEMA DE COMBOS E SONS SEM TRAVAMENTO ---
function clearMatches() {
    let toRemove = [];
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            let val = board[r][c];
            if (val === null) continue;
            if (c+2 < COLS && val === board[r][c+1] && val === board[r][c+2]) toRemove.push({r,c},{r,c:c+1},{r,c:c+2});
            if (r+2 < ROWS && val === board[r+1][c] && val === board[r+2][c]) toRemove.push({r,c},{r:r+1,c},{r:r+2,c});
            if (r+2 < ROWS && c+2 < COLS && val === board[r+1][c+1] && val === board[r+2][c+2]) toRemove.push({r,c},{r:r+1,c:c+1},{r:r+2,c:c+2});
            if (r-2 >= 0 && c+2 < COLS && val === board[r-1][c+1] && val === board[r-2][c+2]) toRemove.push({r,c},{r:r-1,c:c+1},{r:r-2,c:c+2});
        }
    }

    if (toRemove.length > 0) {
        blinkingBlocks = toRemove;
        comboCount++; 

        // Toca som de par com ajuste de tom
        playSFX(sfxPares, Math.min(2, 1 + (comboCount * 0.1)));

        let flashes = 0;
        let flashInterval = setInterval(() => {
            flashes++;
            draw(flashes % 2 === 0);
            if (flashes > 4) {
                clearInterval(flashInterval);
                
                let pts = (toRemove.length * 15) * comboCount;
                score += pts;
                scoreElement.innerText = score;

                addFloatingText(comboCount > 1 ? `x${comboCount}!` : `+${pts}`, toRemove[0].c * BLOCK_SIZE, toRemove[0].r * BLOCK_SIZE, comboCount > 1 ? '#FFD700' : 'white');

                // LÓGICA DE 1000 PONTOS (CORRIGIDA)
                if (Math.floor(score / 1000) > lastMilestone) {
                    lastMilestone = Math.floor(score / 1000);
                    playSFX(sfxMilPontos); // Toca o som de mil pontos
                    level++;
                    levelElement.innerText = level;
                    speed = Math.max(150, 1000 - (level * 80));
                    startGame();
                }

                if (score > highScore) {
                    highScore = score;
                    highScoreElement.innerText = highScore;
                    localStorage.setItem('fruitColumnsHighScore', highScore);
                }

                toRemove.forEach(b => board[b.r][b.c] = null);
                blinkingBlocks = [];
                applyGravity();
                
                // Delay estratégico para o próximo combo não encavalar
                setTimeout(clearMatches, 150); 
            }
        }, 50);
    } else {
        // Finaliza o processamento e traz nova peça
        isProcessing = false;
        let nextPiece = randomPiece();
        if (checkCollision(nextPiece.x, nextPiece.y)) {
            playSFX(sfxFim);
            alert("FIM DE JOGO!");
            resetGame();
        } else {
            piece = nextPiece;
        }
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

// --- 7. CONTROLES E INICIALIZAÇÃO ---
function startGame() {
    clearInterval(gameLoop);
    gameLoop = setInterval(moveDown, speed);
}

window.togglePause = function() {
    if (isProcessing) return;
    isPaused = !isPaused;
    btnPause.innerText = isPaused ? "Continuar" : "Pausar";
    if (!isPaused) startGame(); else clearInterval(gameLoop);
    draw();
}

window.resetGame = function() {
    playSFX(sfxAbertura);
    board = Array(ROWS).fill().map(() => Array(COLS).fill(null));
    score = 0; level = 1; speed = 1000; isPaused = false; isProcessing = false; lastMilestone = 0;
    scoreElement.innerText = "0"; levelElement.innerText = "1";
    piece = randomPiece();
    startGame();
    draw();
}

function handleAction(type) {
    if (isPaused || isProcessing) return;
    playSFX(sfxDescida);
    switch(type) {
        case 'left': if (piece.x > 0 && !checkCollision(piece.x - 1, piece.y)) piece.x--; break;
        case 'right': if (piece.x < COLS - 1 && !checkCollision(piece.x + 1, piece.y)) piece.x++; break;
        case 'down': moveDown(); break;
        case 'rotate': let last = piece.items.pop(); piece.items.unshift(last); break;
    }
    draw();
}

const controls = {'btnLeft': 'left', 'btnRight': 'right', 'btnDown': 'down', 'btnRotate': 'rotate'};
Object.keys(controls).forEach(id => {
    const btn = document.getElementById(id);
    if(btn) {
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); handleAction(controls[id]); }, { passive: false });
        btn.addEventListener('click', () => handleAction(controls[id]));
    }
});

startGame();
draw();