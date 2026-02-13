  const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const highScoreElement = document.getElementById('highScore');

// --- CONFIGURAÇÃO DE ÁUDIOS ---
const sfxAbertura = new Audio('abertura.mp3');
const sfxDescida = new Audio('descida.mp3');
const sfxPares = new Audio('formarpares.mp3');
const sfxMilPontos = new Audio('mil-pontos.mp3');
const sfxFim = new Audio('fim.mp3');

// Garantir que os sons carreguem
[sfxAbertura, sfxDescida, sfxPares, sfxMilPontos, sfxFim].forEach(audio => audio.preload = 'auto');

let isPaused = false;
const btnPause = document.getElementById('btnPause');

// --- CONFIGURAÇÕES DE DIMENSÃO ---
const ROWS = 15;        
const COLS = 10;       
const BLOCK_SIZE = 40; 
const FRUITS = ['🍎', '🍇', '🍊', '🍌', '💎', '🍓', '🥝'];

let score = 0;
let level = 1;
let speed = 1000;
let gameLoop;
let board = Array(ROWS).fill().map(() => Array(COLS).fill(null));
let lastMilestone = 0; // Controle para som de 1000 pontos

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

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    for(let i=0; i<COLS; i++) {
        for(let j=0; j<ROWS; j++) {
            ctx.strokeRect(i*BLOCK_SIZE, j*BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        }
    }
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c] !== null) drawBlock(c, r, board[r][c]);
        }
    }
    piece.items.forEach((fruitIdx, i) => {
        if (piece.y + i < ROWS) drawBlock(piece.x, piece.y + i, fruitIdx);
    });
}

function drawBlock(x, y, fruitIdx) {
    ctx.font = "28px Arial"; 
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(FRUITS[fruitIdx], x * BLOCK_SIZE + 20, y * BLOCK_SIZE + 20);
}

function updateScore(points) {
    score += points;
    scoreElement.innerText = score;

    if (score > highScore) {
        highScore = score;
        highScoreElement.innerText = highScore;
        localStorage.setItem('fruitColumnsHighScore', highScore.toString());
    }

    // SOM: 1000 Pontos
    if (Math.floor(score / 1000) > lastMilestone) {
        sfxMilPontos.play();
        lastMilestone = Math.floor(score / 1000);
    }

    let newLevel = Math.floor(score / 1000) + 1;
    if (newLevel > level) {
        level = newLevel;
        levelElement.innerText = level;
        clearInterval(gameLoop);
        speed = Math.max(120, 1000 - (level * 80)); 
        startGame();
    }
}

function moveDown() {
    if (isPaused) return;
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
    piece.items.forEach((fruitIdx, i) => {
        board[piece.y + i][piece.x] = fruitIdx;
    });
    
    clearMatches();
    let nextPiece = randomPiece();
    
    // SOM: Fim de Jogo
    if (checkCollision(nextPiece.x, nextPiece.y)) {
        sfxFim.play();
        setTimeout(() => {
            alert("GAME OVER! Sua pontuação: " + score);
            resetGame();
        }, 100);
    } else {
        piece = nextPiece;
    }
}

function clearMatches() {
    let toRemove = [];
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            let val = board[r][c];
            if (val === null) continue;
            if (c + 2 < COLS && val === board[r][c+1] && val === board[r][c+2]) toRemove.push({r, c}, {r, c: c+1}, {r, c: c+2});
            if (r + 2 < ROWS && val === board[r+1][c] && val === board[r+2][c]) toRemove.push({r, c}, {r: r+1, c}, {r: r+2, c});
            if (r + 2 < ROWS && c + 2 < COLS && val === board[r+1][c+1] && val === board[r+2][c+2]) toRemove.push({r, c}, {r: r+1, c: c+1}, {r: r+2, c: c+2});
            if (r - 2 >= 0 && c + 2 < COLS && val === board[r-1][c+1] && val === board[r-2][c+2]) toRemove.push({r, c}, {r: r-1, c: c+1}, {r: r-2, c: c+2});
        }
    }

    if (toRemove.length > 0) {
        // SOM: Formar Pares
        sfxPares.currentTime = 0;
        sfxPares.play();
        
        toRemove.forEach(pos => board[pos.r][pos.c] = null);
        updateScore(toRemove.length * 15);
        applyGravity();
        setTimeout(clearMatches, 200);
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

function togglePause() {
    if (isPaused) {
        startGame();
        btnPause.innerText = "Pausar";
        btnPause.style.color = "#00ffcc";
        isPaused = false;
    } else {
        clearInterval(gameLoop);
        btnPause.innerText = "Continuar";
        btnPause.style.color = "#ffcc00";
        isPaused = true;
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white";
        ctx.font = "40px Arial";
        ctx.textAlign = "center";
        ctx.fillText("PAUSADO", canvas.width/2, canvas.height/2);
    }
}

function resetGame() {
    // SOM: Abertura
    sfxAbertura.play();
    board = Array(ROWS).fill().map(() => Array(COLS).fill(null));
    score = 0; level = 1; speed = 1000; isPaused = false; lastMilestone = 0;
    scoreElement.innerText = "0"; levelElement.innerText = "1";
    if (btnPause) {
        btnPause.innerText = "Pausar";
        btnPause.style.color = "#00ffcc";
    }
    clearInterval(gameLoop);
    piece = randomPiece();
    startGame();
    draw();
}

window.resetGame = resetGame;

function startGame() {
    gameLoop = setInterval(moveDown, speed);
}

function handleInput(e) {
    if (isPaused) return;

    // Teclas de ação que emitem som
    const actionKeys = ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' '];
    if (actionKeys.includes(e.key)) {
        // SOM: Descida/Movimento
        sfxDescida.currentTime = 0;
        sfxDescida.play();
    }

    switch (e.key) {
        case 'ArrowLeft':
            if (piece.x > 0 && !checkCollision(piece.x - 1, piece.y)) piece.x--;
            break;
        case 'ArrowRight':
            if (piece.x < COLS - 1 && !checkCollision(piece.x + 1, piece.y)) piece.x++;
            break;
        case 'ArrowDown':
            moveDown();
            break;
        case 'ArrowUp':
        case ' ':
            e.preventDefault(); 
            let last = piece.items.pop();
            piece.items.unshift(last);
            break;
    }
    draw();
}

window.onkeydown = handleInput; 

// Inicialização (Pode precisar de um clique do usuário para o som de abertura tocar)
if (!gameLoop) startGame();
draw();