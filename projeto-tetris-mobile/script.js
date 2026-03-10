 const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const highScoreElement = document.getElementById('highScore');
const btnPause = document.getElementById('btnPause');

// --- CONFIGURAÇÃO DE ÁUDIOS ---
const sfxAbertura = new Audio('abertura.mp3');
const sfxDescida = new Audio('descida.mp3');
const sfxPares = new Audio('formarpares.mp3');
const sfxMilPontos = new Audio('mil-pontos.mp3');
const sfxFim = new Audio('fim.mp3');

[sfxAbertura, sfxDescida, sfxPares, sfxMilPontos, sfxFim].forEach(audio => {
    audio.preload = 'auto';
    audio.load();
});

// Configurações do Jogo
const ROWS = 15;
const COLS = 10;
const BLOCK_SIZE = 40;
const FRUITS = ['🍎', '🍇', '🍊', '🍌', '💎', '🍓', '🥝'];

let score = 0;
let level = 1;
let speed = 1000;
let isPaused = false;
let isProcessingCombo = false; 
let gameLoop = null;
let board = Array(ROWS).fill().map(() => Array(COLS).fill(null));
let blinkingBlocks = [];
let lastMilestone = 0; 
let comboCount = 0; 

let floatingTexts = []; 

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

// TEXTOS FLUTUANTES RÁPIDOS
function addFloatingText(text, x, y, color = 'white', fontSize = '24px') {
    floatingTexts.push({
        text: text,
        x: x,
        y: y,
        alpha: 1.0,
        color: color,
        fontSize: fontSize,
        speedY: -12.0 
    });
}

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

    // Peça Ativa
    if (!isProcessingCombo) {
        piece.items.forEach((fruitIdx, i) => {
            if (piece.y + i < ROWS) {
                drawBlock(piece.x, piece.y + i, fruitIdx);
            }
        });
    }

    // Textos Flutuantes
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
    comboCount = 0; 
    piece.items.forEach((fruitIdx, i) => {
        if (piece.y + i < ROWS) board[piece.y + i][piece.x] = fruitIdx;
    });
    clearMatches();
}

// --- LÓGICA DE COMBOS (ONDE OCORRIA O TRAVAMENTO) ---
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

        // Toca som de par com segurança
        sfxPares.currentTime = 0;
        sfxPares.play().catch(() => {});

        let flashes = 0;
        let flashInterval = setInterval(() => {
            flashes++;
            draw(flashes % 2 === 0);
            
            if (flashes > 3) {
                clearInterval(flashInterval);
                
                let pts = (toRemove.length * 15) * comboCount;
                score += pts;
                scoreElement.innerText = score;

                // FEEDBACK DE MIL PONTOS SEM CONGELAR
                if (Math.floor(score / 1000) > lastMilestone) {
                    lastMilestone = Math.floor(score / 1000);
                    level++;
                    levelElement.innerText = level;
                    speed = Math.max(150, 1000 - (level * 80));
                    
                    // Toca som de mil pontos de forma assíncrona
                    setTimeout(() => { sfxMilPontos.play().catch(() => {}); }, 50);
                    
                    // Reinicia o loop com a nova velocidade apenas após o combo terminar
                    if(!isPaused) startGame(); 
                }

                if (score > highScore) {
                    highScore = score;
                    highScoreElement.innerText = highScore;
                    localStorage.setItem('fruitColumnsHighScore', highScore);
                }

                addFloatingText(comboCount > 1 ? `COMBO x${comboCount}!` : `+${pts}`, toRemove[0].c * BLOCK_SIZE, toRemove[0].r * BLOCK_SIZE);

                toRemove.forEach(b => board[b.r][b.c] = null);
                blinkingBlocks = [];
                applyGravity();
                
                setTimeout(clearMatches, 150);
            }
        }, 40);
    } else {
        isProcessingCombo = false;
        let nextPiece = randomPiece();
        if (checkCollision(nextPiece.x, nextPiece.y)) {
            sfxFim.play().catch(() => {});
            setTimeout(() => { alert("FIM DE JOGO!"); resetGame(); }, 100);
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

function startGame() {
    clearInterval(gameLoop);
    gameLoop = setInterval(moveDown, speed);
}

window.togglePause = function() {
    if (isProcessingCombo) return;
    isPaused = !isPaused;
    btnPause.innerText = isPaused ? "Continuar" : "Pausar";
    if (isPaused) clearInterval(gameLoop); else startGame();
    draw();
}

window.resetGame = function() {
    sfxAbertura.play().catch(() => {});
    board = Array(ROWS).fill().map(() => Array(COLS).fill(null));
    score = 0; level = 1; speed = 1000; isPaused = false; lastMilestone = 0; comboCount = 0;
    scoreElement.innerText = "0"; levelElement.innerText = "1";
    clearInterval(gameLoop);
    isProcessingCombo = false;
    piece = randomPiece();
    floatingTexts = [];
    startGame();
    draw();
}

function handleAction(type) {
    if (isPaused || isProcessingCombo) return;
    sfxDescida.currentTime = 0;
    sfxDescida.play().catch(() => {});
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