 const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const highScoreElement = document.getElementById('highScore');

let isPaused = false;
const btnPause = document.getElementById('btnPause');

function togglePause() {
    if (isPaused) {
        // Retoma o jogo
        startGame();
        btnPause.innerText = "Pausar";
        btnPause.style.color = "#00ffcc";
        isPaused = false;
    } else {
        // Pausa o jogo
        clearInterval(gameLoop);
        btnPause.innerText = "Continuar";
        btnPause.style.color = "#ffcc00"; // Fica amarelo quando pausado
        isPaused = true;
        
        // Desenha "PAUSA" no meio do canvas
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white";
        ctx.font = "40px Arial";
        ctx.fillText("PAUSADO", canvas.width/2, canvas.height/2);
    }
}

// ATUALIZAÇÃO NOS CONTROLES: Bloquear movimento se estiver pausado
 

// --- CONFIGURAÇÕES DE DIMENSÃO (PC) ---
const ROWS = 15;        
const COLS = 10;       
const BLOCK_SIZE = 40; 
const FRUITS = ['🍎', '🍇', '🍊', '🍌', '💎', '🍓', '🥝'];

let score = 0;
let level = 1;
let speed = 1000;
let gameLoop;
let board = Array(ROWS).fill().map(() => Array(COLS).fill(null));

// --- LÓGICA DO RECORDE ---
// Carregamos do localStorage e garantimos que seja um número (parseInt)
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

// --- DESENHO ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Grid de fundo sutil
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    for(let i=0; i<COLS; i++) {
        for(let j=0; j<ROWS; j++) {
            ctx.strokeRect(i*BLOCK_SIZE, j*BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        }
    }

    // Desenha o tabuleiro fixo
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c] !== null) drawBlock(c, r, board[r][c]);
        }
    }

    // Desenha a peça ativa que está caindo
    piece.items.forEach((fruitIdx, i) => {
        if (piece.y + i < ROWS) {
            drawBlock(piece.x, piece.y + i, fruitIdx);
        }
    });
}

function drawBlock(x, y, fruitIdx) {
    ctx.font = "28px Arial"; 
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
        FRUITS[fruitIdx], 
        x * BLOCK_SIZE + (BLOCK_SIZE/2), 
        y * BLOCK_SIZE + (BLOCK_SIZE/2)
    );
}

// --- PONTUAÇÃO E RECORDE ---
function updateScore(points) {
    score += points;
    scoreElement.innerText = score;

    // Atualiza o Recorde em tempo real
    if (score > highScore) {
        highScore = score;
        highScoreElement.innerText = highScore;
        localStorage.setItem('fruitColumnsHighScore', highScore.toString());
    }

    // Sistema de Nível
    let newLevel = Math.floor(score / 1000) + 1;
    if (newLevel > level) {
        level = newLevel;
        levelElement.innerText = level;
        
        clearInterval(gameLoop);
        speed = Math.max(120, 1000 - (level * 80)); 
        startGame();
    }
}

// --- LÓGICA DE MOVIMENTO E COLISÃO ---
function moveDown() {
    if (!checkCollision(piece.x, piece.y + 1)) {
        piece.y++;
    } else {
        lockPiece();
    }
    draw();
}

function checkCollision(nx, ny) {
    // Se a base da coluna ultrapassar o fundo
    if (ny + 2 >= ROWS) return true;
    
    // Se bater em algum bloco já existente
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
    piece = randomPiece();
    
    // Verifica Game Over
    if (checkCollision(piece.x, piece.y)) {
        alert("GAME OVER! Sua pontuação: " + score);
        resetGame();
    }
}

// --- DETECÇÃO DE COMBINAÇÕES (MATCH-3) ---
function clearMatches() {
    let toRemove = [];

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            let val = board[r][c];
            if (val === null) continue;

            // 1. Horizontal
            if (c + 2 < COLS && val === board[r][c+1] && val === board[r][c+2]) 
                toRemove.push({r, c}, {r, c: c+1}, {r, c: c+2});

            // 2. Vertical
            if (r + 2 < ROWS && val === board[r+1][c] && val === board[r+2][c]) 
                toRemove.push({r, c}, {r: r+1, c}, {r: r+2, c});

            // 3. Diagonal Descendente (\)
            if (r + 2 < ROWS && c + 2 < COLS && val === board[r+1][c+1] && val === board[r+2][c+2]) 
                toRemove.push({r, c}, {r: r+1, c: c+1}, {r: r+2, c: c+2});

            // 4. Diagonal Ascendente (/)
            if (r - 2 >= 0 && c + 2 < COLS && val === board[r-1][c+1] && val === board[r-2][c+2]) 
                toRemove.push({r, c}, {r: r-1, c: c+1}, {r: r-2, c: c+2});
        }
    }

    if (toRemove.length > 0) {
        toRemove.forEach(pos => board[pos.r][pos.c] = null);
        updateScore(toRemove.length * 15);
        applyGravity();
        
        // Timeout para criar o efeito de "combo" em cadeia
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

// --- CONTROLE DE ESTADO DO JOGO ---
  function resetGame() {
    // 1. Limpa o tabuleiro
    board = Array(ROWS).fill().map(() => Array(COLS).fill(null));
    
    // 2. Reseta variáveis de controle
    score = 0;
    level = 1;
    speed = 1000;
    isPaused = false;
    
    // 3. Atualiza os elementos da tela (HTML)
    scoreElement.innerText = "0";
    levelElement.innerText = "1";
    if (btnPause) {
        btnPause.innerText = "Pausar";
        btnPause.style.color = "#00ffcc";
    }
    
    // 4. Reinicia o tempo e gera nova peça
    clearInterval(gameLoop);
    piece = randomPiece();
    startGame();
    
    // 5. Redesenha tudo limpo
    draw();
    
    console.log("Jogo reiniciado com sucesso!"); // Para você ver no console (F12) se funcionou
}

// Para garantir que o HTML encontre a função, você pode "forçar" ela no objeto window
window.resetGame = resetGame;

function startGame() {
    gameLoop = setInterval(moveDown, speed);
}

// --- CONTROLES DE TECLADO ---
 let isMoving = false;

// Substitua o seu window.addEventListener por este:
 function handleInput(e) {
    if (isPaused) return;

    // Captura a tecla e executa o movimento
    switch (e.key) {
        case 'ArrowLeft':
            if (piece.x > 0 && !checkCollision(piece.x - 1, piece.y)) {
                piece.x--;
            }
            break;
        case 'ArrowRight':
            if (piece.x < COLS - 1 && !checkCollision(piece.x + 1, piece.y)) {
                piece.x++;
            }
            break;
        case 'ArrowDown':
            moveDown();
            break;
        case 'ArrowUp':
        case ' ': // Espaço
            // Impede que o espaço faça a página rolar para baixo
            e.preventDefault(); 
            let last = piece.items.pop();
            piece.items.unshift(last);
            break;
    }
    
    // Desenha apenas uma vez após o processamento da tecla
    draw();
}

// GARANTIA: Remove qualquer ouvinte anterior e adiciona apenas um
window.onkeydown = handleInput; 

// Inicialização final
if (!gameLoop) {
    startGame();
}
draw();

// Funções auxiliares para os movimentos
function moveLeft() {
    if (!isPaused && piece.x > 0 && !checkCollision(piece.x - 1, piece.y)) {
        piece.x--;
        draw();
    }
}

function moveRight() {
    if (!isPaused && piece.x < COLS - 1 && !checkCollision(piece.x + 1, piece.y)) {
        piece.x++;
        draw();
    }
}

function rotatePiece() {
    if (!isPaused) {
        let last = piece.items.pop();
        piece.items.unshift(last);
        draw();
    }
}

// Ligar os botões do HTML
document.getElementById('btnLeft').addEventListener('touchstart', (e) => { e.preventDefault(); moveLeft(); });
document.getElementById('btnRight').addEventListener('touchstart', (e) => { e.preventDefault(); moveRight(); });
document.getElementById('btnRotate').addEventListener('touchstart', (e) => { e.preventDefault(); rotatePiece(); });
document.getElementById('btnDown').addEventListener('touchstart', (e) => { e.preventDefault(); moveDown(); });

// Suporte para cliques de mouse nos botões (para testar no PC)
document.getElementById('btnLeft').addEventListener('mousedown', moveLeft);
document.getElementById('btnRight').addEventListener('mousedown', moveRight);
document.getElementById('btnRotate').addEventListener('mousedown', rotatePiece);
document.getElementById('btnDown').addEventListener('mousedown', moveDown);

// Funções de movimento para os botões
const handleMobileMove = (action) => {
    if (isPaused) return;
    switch(action) {
        case 'left': if (piece.x > 0 && !checkCollision(piece.x - 1, piece.y)) piece.x--; break;
        case 'right': if (piece.x < COLS - 1 && !checkCollision(piece.x + 1, piece.y)) piece.x++; break;
        case 'rotate': let last = piece.items.pop(); piece.items.unshift(last); break;
        case 'down': moveDown(); break;
    }
    draw();
};

// Vinculando aos IDs do HTML
document.getElementById('btnLeft').onclick = () => handleMobileMove('left');
document.getElementById('btnRight').onclick = () => handleMobileMove('right');
document.getElementById('btnRotate').onclick = () => handleMobileMove('rotate');
document.getElementById('btnDown').onclick = () => handleMobileMove('down');