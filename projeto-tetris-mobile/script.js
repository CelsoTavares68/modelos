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

let score = 0;
let level = 1;
let speed = 1000;
let isPaused = false;
let isProcessingCombo = false; // Trava para evitar movimentos durante animações
let gameLoop = null;
let board = Array(ROWS).fill().map(() => Array(COLS).fill(null));
let blinkingBlocks = [];
let lastMilestone = 0;

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
    if (ny + 2 >= ROWS) return true;
    for (let i = 0; i < 3; i++) {
        if (board[ny + i] && board[ny + i][nx] !== null) return true;
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
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            let val = board[r][c];
            if (val === null) continue;
            // Horizontal, Vertical e Diagonais
            if (c+2 < COLS && val === board[r][c+1] && val === board[r][c+2]) toRemove.push({r,c},{r,c:c+1},{r,c:c+2});
            if (r+2 < ROWS && val === board[r+1][c] && val === board[r+2][c]) toRemove.push({r,c},{r:r+1,c},{r:r+2,c});
            if (r+2 < ROWS && c+2 < COLS && val === board[r+1][c+1] && val === board[r+2][c+2]) toRemove.push({r,c},{r:r+1,c:c+1},{r:r+2,c:c+2});
            if (r-2 >= 0 && c+2 < COLS && val === board[r-1][c+1] && val === board[r-2][c+2]) toRemove.push({r,c},{r:r-1,c:c+1},{r:r-2,c:c+2});
        }
    }

    if (toRemove.length > 0) {
        blinkingBlocks = toRemove;
        playSFX(sfxPares);

        let flashes = 0;
        let flashInterval = setInterval(() => {
            flashes++;
            draw(flashes % 2 === 0);
            
            if (flashes > 5) {
                clearInterval(flashInterval);
                toRemove.forEach(p => board[p.r][p.c] = null);
                score += toRemove.length * 15;
                scoreElement.innerText = score;
                
                // Sistema de Nível e Milestone
                if (Math.floor(score / 1000) > lastMilestone) {
                    playSFX(sfxMilPontos);
                    lastMilestone = Math.floor(score / 1000);
                    level++;
                    if(levelElement) levelElement.innerText = level;
                    speed = Math.max(200, 1000 - (level * 50)); // Aumenta velocidade
                    startGame(); 
                }

                if (score > highScore) {
                    highScore = score;
                    highScoreElement.innerText = highScore;
                    localStorage.setItem('fruitColumnsHighScore', highScore);
                }

                blinkingBlocks = [];
                applyGravity();
                setTimeout(clearMatches, 200);
            }
        }, 80);
    } else {
        isProcessingCombo = false;
        finalizeTurn();
    }
}

function finalizeTurn() {
    let nextPiece = randomPiece();
    if (checkCollision(nextPiece.x, nextPiece.y)) {
        playSFX(sfxFim);
        setTimeout(() => {
            alert("FIM DE JOGO! Pontos: " + score);
            resetGame();
        }, 100);
    } else {
        piece = nextPiece;
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