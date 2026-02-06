 const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Ajuste automático de resolução
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 50; // Desconta o header
}
window.addEventListener('resize', resize);
resize();

let playerX = 0, speed = 0, playerDist = 0;
let dayNumber = 1, carsRemaining = 200;
let gameState = "PLAYING", isPaused = false;
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

// --- CONTROLES TOUCH ---
function initTouch() {
    const left = document.getElementById('btnLeft');
    const right = document.getElementById('btnRight');
    
    const handle = (el, key, val) => {
        el.addEventListener('touchstart', (e) => { e.preventDefault(); keys[key] = val; audioCtx.resume(); });
        el.addEventListener('touchend', (e) => { e.preventDefault(); keys[key] = !val; });
    };
    
    handle(left, 'ArrowLeft', true);
    handle(right, 'ArrowRight', true);
}
initTouch();

function update() {
    if (isPaused) return;

    // Aceleração Automática (Recupera após batida)
    let accel = speed < 5 ? 0.1 : 0.03; // Acelera mais rápido se estiver devagar
    speed = Math.min(speed + accel, maxSpeed);

    // Curvas e Movimento
    if (keys.ArrowLeft) playerX -= 8;
    if (keys.ArrowRight) playerX += 8;
    
    // O carro tende a sair da pista na curva
    playerX -= (roadCurve / 35) * (speed / maxSpeed);
    playerX = Math.max(-500, Math.min(500, playerX));

    playerDist += speed;

    // Lógica da Estrada
    if (--curveTimer <= 0) {
        targetCurve = (Math.random() - 0.5) * 180;
        curveTimer = 100;
    }
    roadCurve += (targetCurve - roadCurve) * 0.03;

    // Gerar Inimigos
    if (Math.random() < 0.02 && enemies.length < 10) {
        enemies.push({ lane: (Math.random() - 0.5) * 1.5, z: 4000, v: 7, over: false });
    }

    enemies.forEach(e => {
        e.z -= (speed - e.v);
        let p = 1 - (e.z / 4000);
        let roadW = canvas.width * 0.1 + p * (canvas.width * 2);
        let x = (canvas.width/2) + (roadCurve * p * p) - (playerX * p) + (e.lane * roadW * 0.5);
        let y = (canvas.height/2) + (p * p * (canvas.height/2));

        // Colisão (Recuperação automática ligada)
        if (p > 0.85 && p < 1.05 && Math.abs(x - canvas.width/2) < 40) {
            speed = 0.5; // Quase para, mas a aceleração automática o puxa de volta
            e.z += 1000;
            playCrash();
        }

        if (e.z <= 0 && !e.over) {
            carsRemaining = Math.max(0, carsRemaining - 1);
            e.over = true;
        }
        e.screenX = x; e.screenY = y; e.p = p;
    });

    enemies = enemies.filter(e => e.z > -500);
    
    // UI
    document.getElementById('infoCars').innerText = `CARROS: ${carsRemaining}`;
    
    draw();
    requestAnimationFrame(update);
}

function draw() {
    // Céu e Grama
    ctx.fillStyle = "#87CEEB"; ctx.fillRect(0, 0, canvas.width, canvas.height/2);
    ctx.fillStyle = "#1a7a1a"; ctx.fillRect(0, canvas.height/2, canvas.width, canvas.height/2);

    // Estrada Responsiva
    for (let i = canvas.height/2; i < canvas.height; i += 4) {
        let p = (i - canvas.height/2) / (canvas.height/2);
        let x = (canvas.width/2) + (roadCurve * p * p) - (playerX * p);
        let w = 20 + p * (canvas.width * 2);
        ctx.fillStyle = Math.sin(i * 0.5 + playerDist * 0.2) > 0 ? "#333" : "#444";
        ctx.fillRect(x - w/2, i, w, 4);
    }

    // Carros
    enemies.forEach(e => {
        if(e.p > 0) {
            ctx.fillStyle = "yellow";
            ctx.fillRect(e.screenX - (20*e.p), e.screenY - (10*e.p), 40*e.p, 20*e.p);
        }
    });

    // Player
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(canvas.width/2 - 25, canvas.height - 80, 50, 25);
}

function togglePause() { isPaused = !isPaused; if(!isPaused) update(); }

update();