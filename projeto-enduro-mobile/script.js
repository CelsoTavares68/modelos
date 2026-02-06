  const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Ajuste de ecrã para Mobile/Tablet
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 60; // Deixa espaço para o topo
}
window.addEventListener('resize', resize);
resize();

let playerX = 0, speed = 0, playerDist = 0;
let dayNumber = 1, carsRemaining = 200;
let roadCurve = 0, targetCurve = 0, curveTimer = 0;
let enemies = [];
const maxSpeed = 12;
const keys = { ArrowLeft: false, ArrowRight: false };

// --- ÁUDIO ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playCrash() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    let osc = audioCtx.createOscillator();
    let g = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(100, audioCtx.currentTime);
    g.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
    osc.connect(g); g.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.3);
}

// --- DESENHO DO CARRO (PROPORCIONAL) ---
function drawCar(x, y, scale, color) {
    let s = scale * (canvas.width / 400); // Escala baseada na largura da tela
    let w = 40 * s;
    let h = 20 * s;
    ctx.fillStyle = color;
    ctx.fillRect(x - w/2, y - h, w, h);
    // Rodas
    ctx.fillStyle = "black";
    ctx.fillRect(x - w/2, y - h/4, w/4, h/4);
    ctx.fillRect(x + w/4, y - h/4, w/4, h/4);
}

// --- CONTROLES TOUCH ---
document.addEventListener('DOMContentLoaded', () => {
    const setup = (id, key) => {
        const el = document.getElementById(id);
        el.addEventListener('touchstart', (e) => { e.preventDefault(); keys[key] = true; audioCtx.resume(); });
        el.addEventListener('touchend', (e) => { e.preventDefault(); keys[key] = false; });
    };
    setup('btnLeft', 'ArrowLeft');
    setup('btnRight', 'ArrowRight');
});

function update() {
    // Aceleração automática e recuperação
    speed = Math.min(speed + (speed < 4 ? 0.08 : 0.04), maxSpeed);

    // Movimento lateral (proporcional à tela)
    if (keys.ArrowLeft) playerX -= 10;
    if (keys.ArrowRight) playerX += 10;
    
    // Força da curva (arrasta o carro)
    playerX -= (roadCurve / 40) * (speed / maxSpeed);
    playerX = Math.max(-canvas.width * 0.8, Math.min(canvas.width * 0.8, playerX));

    playerDist += speed;

    // Lógica da Curva
    if (--curveTimer <= 0) {
        targetCurve = (Math.random() - 0.5) * (canvas.width * 0.4);
        curveTimer = 100;
    }
    roadCurve += (targetCurve - roadCurve) * 0.03;

    // Inimigos (vêm um de cada vez em intervalos)
    if (gameTick % 100 === 0 && enemies.length < 8) {
        enemies.push({ lane: (Math.random() - 0.5) * 1.5, z: 4000, v: 7, color: "yellow", over: false });
    }
    gameTick++;

    enemies.forEach(e => {
        e.z -= (speed - e.v);
        let p = 1 - (e.z / 4000);
        
        // CÁLCULO DE PISTA: centraliza os inimigos na estrada visível
        let roadW = 40 + p * (canvas.width * 1.5);
        e.x = (canvas.width/2) + (roadCurve * p * p) - (playerX * p) + (e.lane * roadW * 0.5);
        e.y = (canvas.height/2) + (p * p * (canvas.height/2.2));

        // Colisão
        if (p > 0.85 && p < 1.05 && Math.abs(e.x - canvas.width/2) < (canvas.width * 0.1)) {
            speed = 0.5; e.z += 1000; playCrash();
        }

        if (e.z <= 0 && !e.over) {
            carsRemaining = Math.max(0, carsRemaining - 1);
            e.over = true;
        }
    });

    enemies = enemies.filter(e => e.z > -500);
    draw();
    requestAnimationFrame(update);
}
let gameTick = 0;

function draw() {
    ctx.fillStyle = "#87CEEB"; ctx.fillRect(0, 0, canvas.width, canvas.height/2); // Céu
    ctx.fillStyle = "#1a7a1a"; ctx.fillRect(0, canvas.height/2, canvas.width, canvas.height/2); // Grama

    // Estrada
    for (let i = canvas.height/2; i < canvas.height; i += 5) {
        let p = (i - canvas.height/2) / (canvas.height/2);
        let x = (canvas.width/2) + (roadCurve * p * p) - (playerX * p);
        let w = 20 + p * (canvas.width * 1.5);
        ctx.fillStyle = Math.sin(i * 0.5 + playerDist * 0.2) > 0 ? "#333" : "#444";
        ctx.fillRect(x - w/2, i, w, 5);
    }

    // Desenha Inimigos
    enemies.forEach(e => {
        if(e.z > 0 && e.z < 4000) drawCar(e.x, e.y, (1 - e.z/4000), e.color);
    });

    // Desenha Jogador (Sempre visível no fundo da tela)
    drawCar(canvas.width/2, canvas.height * 0.9, 1.2, "#ff0000");

    // UI
    document.getElementById('infoCars').innerText = `CARROS: ${carsRemaining}`;
}

update();