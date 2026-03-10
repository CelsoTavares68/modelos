 const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const highScoreElement = document.getElementById('highScore');
const btnPause = document.getElementById('btnPause');

// --- 1. CONFIGURAÇÃO DE ÁUDIOS (PRESERVAÇÃO TOTAL) ---
const sfxAbertura = new Audio('abertura.mp3');
const sfxDescida = new Audio('descida.mp3');
const sfxPares = new Audio('formarpares.mp3');
const sfxMilPontos = new Audio('mil-pontos.mp3');
const sfxFim = new Audio('fim.mp3');

[sfxAbertura, sfxDescida, sfxPares, sfxMilPontos, sfxFim].forEach(audio => {
    audio.preload = 'auto';
    audio.load();
});

// --- 2. VARIÁVEIS DE ESTADO ---
const ROWS = 15;
const COLS = 10;
const BLOCK_SIZE = 40;
const FRUITS = ['🍎', '🍇', '🍊', '🍌', '💎', '🍓', '🥝'];

let score = 0;
let level = 1;
let speed = 1000;
let isPaused = false;
let isProcessingCombo = false; // Trava para não bugar no Combo 3
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

// --- 3. SISTEMA DE TEXTO FLUTUANTE (AJUSTADO PARA VELOCIDADE MÁXIMA) ---
function addFloatingText(text, x, y, color = 'white', fontSize = '24px') {
    floatingTexts.push({
        text: text,
        x: x,
        y: y,
        alpha: 1.0,
        color: color,
        fontSize: fontSize,
        speedY: -12.0 // Dispara para cima rapidamente
    });
}

// --- 4. RENDERIZAÇÃO PRINCIPAL ---
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

    // Desenha Peça Ativa (esconde durante o combo para não sobrepor)
    if (!isProcessingCombo) {
        piece.items.forEach((fruitIdx, i) => {
            if (piece.y + i < ROWS) {
                drawBlock(piece.x, piece.y + i, fruitIdx);
            }
        });
    }

    // ATUALIZA E DESENHA TEXTOS FLUTUANTES (FRENÉTICO)
    ctx.save();
    ctx.textAlign = 'center';
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        let ft = floatingTexts[i];
        ft.y += ft.speedY; 
        ft.alpha -= 0.15; // Some em frações de segundo

        if (ft.alpha <= 0) {
            floatingTexts.splice(i, 1);
        } else {
            ctx.globalAlpha = ft.alpha;
            ctx.fillStyle = ft.color;
            ctx.font = `bold ${ft.fontSize} Arial`;
            ctx.shadowColor = 'black';
            ctx.shadowBlur = 4;
            ctx.fillText(ft.text, ft.x + 20, ft.y);
        }
    }
    ctx.restore();

    // Overlay de Pausa
    if (isPaused && !isProcessingCombo) {
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

// --- 5. LÓGICA DE MOVIMENTO E COLISÃO ---
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
    comboCount = 0; 
    piece.items.forEach((fruitIdx, i) => {
        if (piece.y + i < ROWS) board[piece.y + i][piece.x] = fruitIdx;
    });
    clearMatches();
}

// --- 6. SISTEMA DE COMBINAÇÕES (SEM SIMPLIFICAÇÃO) ---
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
        isProcessingCombo = true;
        blinkingBlocks = toRemove;
        comboCount++; 

        sfxPares.currentTime = 0; 
        sfxPares.playbackRate = Math.min(2, 1 + (comboCount * 0.1)); 
        sfxPares.play();

        let flashes = 0;
        let flashInterval = setInterval(() => {
            flashes++;
            draw(flashes % 2 === 0);
            if (flashes > 3) {
                clearInterval(flashInterval);
                
                let pts = (toRemove.length * 15) * comboCount;
                score += pts;
                scoreElement.innerText = score;

                // Centraliza texto no combo
                let avgC = toRemove[0].c;
                let avgR = toRemove[0].r;

                if (comboCount > 1) {
                    addFloatingText(`x${comboCount}!`, avgC * BLOCK_SIZE, avgR * BLOCK_SIZE, '#FFD700', '32px');
                } else {
                    addFloatingText(`+${pts}`, avgC * BLOCK_SIZE, avgR * BLOCK_SIZE, 'white', '22px');
                }

                // Milestones e Nível
                if (Math.floor(score / 1000) > lastMilestone) {
                    sfxMilPontos.play();
                    lastMilestone = Math.floor(score / 1000);
                    level++;
                    levelElement.innerText = level;
                    speed = Math.max(150, 1000 - (level * 100));
                    startGame();
                }

                // Recorde
                if (score > highScore) {
                    highScore = score;
                    highScoreElement.innerText = highScore;
                    localStorage.setItem('fruitColumnsHighScore', highScore);
                }

                toRemove.forEach(b => board[b.r][b.c] = null);
                blinkingBlocks = [];
                applyGravity();
                setTimeout(clearMatches, 50); // Continua reação quase instantânea
            }
        }, 40);
    } else {
        isProcessingCombo = false;
        let nextPiece = randomPiece();
        if (checkCollision(nextPiece.x, nextPiece.y)) {
            sfxFim.play();
            alert("FIM DE JOGO! Score: " + score);
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

// --- 7. FLUXO E CONTROLES ---
function startGame() {
    clearInterval(gameLoop);
    gameLoop = setInterval(moveDown, speed);
}

window.togglePause = function() {
    isPaused = !isPaused;
    btnPause.innerText = isPaused ? "Continuar" : "Pausar";
    if (isPaused) clearInterval(gameLoop); else startGame();
    draw();
}

window.resetGame = function() {
    sfxAbertura.play();
    board = Array(ROWS).fill().map(() => Array(COLS).fill(null));
    score = 0; level = 1; speed = 1000; isPaused = false; lastMilestone = 0;
    scoreElement.innerText = "0"; levelElement.innerText = "1";
    piece = randomPiece();
    floatingTexts = [];
    startGame();
    draw();
}

function handleAction(type) {
    if (isPaused || isProcessingCombo) return;
    sfxDescida.currentTime = 0; sfxDescida.play();
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