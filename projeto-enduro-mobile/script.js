 const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- AJUSTE PARA TELA CHEIA MOBILE ---
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight; 
}
window.addEventListener('resize', resize);
resize();

let playerX = 0, speed = 0, playerDist = 0, gameTick = 0;
let dayNumber = 1, carsRemaining = 200;
let roadCurve = 0, targetCurve = 0, curveTimer = 0;
let enemies = [];
let isPaused = false;

const maxSpeed = 12;
const keys = { ArrowLeft: false, ArrowRight: false };

// --- SISTEMA DE ÁUDIO (MANTIDO) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playEngineSound() {
    if (isPaused || speed <= 0 || audioCtx.state !== 'running') return;
    let osc = audioCtx.createOscillator();
    let gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(60 + (speed * 15), audioCtx.currentTime);
    gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.1);
}

function playCrashSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    let osc = audioCtx.createOscillator();
    let gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(80, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.4);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.4);
}

// --- DESENHO F1 ORIGINAL (ADAPTADO PARA ESCALA) ---
function drawF1Car(x, y, scale, color, isPlayer = false) {
    let s = scale * (canvas.width / 450); // Escala baseada na largura da tela
    let w = 45 * s; let h = 22 * s; 
    
    ctx.save();
    ctx.translate(x, y);
    if(isPlayer) ctx.rotate((roadCurve / 50) * Math.PI / 180);

    // Aerofólio Traseiro
    ctx.fillStyle = color;
    ctx.fillRect(-w * 0.5, -h * 0.3, w, h * 0.2);
    
    // Rodas
    ctx.fillStyle = "#111"; 
    ctx.fillRect(-w * 0.5, -h * 0.1, w * 0.25, h * 0.8); // Traseiras
    ctx.fillRect(w * 0.25, -h * 0.1, w * 0.25, h * 0.8);
    
    // Corpo
    ctx.fillStyle = color; 
    ctx.fillRect(-w * 0.25, h * 0.1, w * 0.5, h * 0.4); 
    
    // Aerofólio Dianteiro
    ctx.fillStyle = "#400";
    ctx.fillRect(-w * 0.4, -h * 0.2, w * 0.12, h * 0.15);
    ctx.fillRect(w * 0.28, -h * 0.2, w * 0.12, h * 0.15);
    
    ctx.restore();
}

// --- CONTROLES TOUCH ---
document.addEventListener('DOMContentLoaded', () => {
    const setup = (id, key) => {
        const el = document.getElementById(id);
        if(!el) return;
        el.addEventListener('touchstart', (e) => { e.preventDefault(); keys[key] = true; audioCtx.resume(); });
        el.addEventListener('touchend', (e) => { e.preventDefault(); keys[key] = false; });
    };
    setup('btnLeft', 'ArrowLeft');
    setup('btnRight', 'ArrowRight');
});

function update() {
    if (isPaused) return;
    gameTick++;
    
    if (gameTick % 4 === 0) playEngineSound();

    // Aceleração automática
    speed = Math.min(speed + (speed < 4 ? 0.08 : 0.04), maxSpeed);

    // Movimento lateral
    if (keys.ArrowLeft) playerX -= 10;
    if (keys.ArrowRight) playerX += 10;
    
    // O carro derrapa na curva
    playerX -= (roadCurve / 40) * (speed / maxSpeed);
    playerX = Math.max(-canvas.width * 0.8, Math.min(canvas.width * 0.8, playerX));

    playerDist += speed;

    // Gerador de Curvas
    if (--curveTimer <= 0) {
        targetCurve = (Math.random() - 0.5) * (canvas.width * 0.3);
        curveTimer = 120;
    }
    roadCurve += (targetCurve - roadCurve) * 0.02;

    // --- LÓGICA DE INIMIGOS VINDO DO HORIZONTE ---
    if (gameTick % 90 === 0 && enemies.length < 8) {
        const colors = ["#F0F", "#0FF", "#0F0", "#FF0", "#FFF"];
        enemies.push({ 
            lane: (Math.random() - 0.5) * 1.6, 
            z: 4000, // Começa no horizonte
            v: 7 + Math.random() * 2, 
            color: colors[Math.floor(Math.random() * colors.length)], 
            over: false 
        });
    }

    enemies.forEach(e => {
        // Velocidade relativa (Se você para, eles te ultrapassam vindo de trás)
        e.z -= (speed - e.v);
        
        let p = 1 - (e.z / 4000); // Proporção de distância
        let roadW = 20 + p * (canvas.width * 1.5);
        
        // Posição calculada para seguir a estrada perfeitamente
        e.x = (canvas.width/2) + (roadCurve * p * p) - (playerX * p) + (e.lane * roadW * 0.5);
        e.y = (canvas.height/2) + (p * p * (canvas.height/2.2));

        // Colisão (Recuperação automática)
        if (p > 0.88 && p < 1.05 && Math.abs(e.x - canvas.width/2) < (canvas.width * 0.1)) {
            speed = 0.5; // Quase para
            e.z += 1200; // Joga o inimigo para frente para evitar bugs
            playCrashSound();
        }

        if (e.z <= 0 && !e.over) {
            if (speed > e.v) carsRemaining = Math.max(0, carsRemaining - 1);
            e.over = true;
        }
    });

    enemies = enemies.filter(e => e.z > -1000 && e.z < 5000);
    draw();
    requestAnimationFrame(update);
}

function draw() {
    // Céu e Grama
    ctx.fillStyle = "#87CEEB"; ctx.fillRect(0, 0, canvas.width, canvas.height/2);
    ctx.fillStyle = "#1a7a1a"; ctx.fillRect(0, canvas.height/2, canvas.width, canvas.height/2);

    // Estrada com Zebras
    for (let i = canvas.height/2; i < canvas.height; i += 6) {
        let p = (i - canvas.height/2) / (canvas.height/2);
        let x = (canvas.width/2) + (roadCurve * p * p) - (playerX * p);
        let w = 20 + p * (canvas.width * 1.5);
        
        ctx.fillStyle = Math.sin(i * 0.5 + playerDist * 0.2) > 0 ? "#333" : "#444";
        ctx.fillRect(x - w/2, i, w, 6);
        
        ctx.fillStyle = Math.sin(i * 0.5 + playerDist * 0.2) > 0 ? "red" : "white";
        ctx.fillRect(x - w/2 - 10, i, 10, 6);
        ctx.fillRect(x + w/2, i, 10, 6);
    }

    // Desenha inimigos (ordenados para o que está longe ficar atrás do que está perto)
    enemies.sort((a,b) => b.z - a.z).forEach(e => {
        let p = 1 - (e.z / 4000);
        if (p > 0) drawF1Car(e.x, e.y, p, e.color);
    });

    // Desenha Jogador
    drawF1Car(canvas.width/2, canvas.height * 0.85, 1.2, "#E00", true);

    // HUD (Ocupando a largura da tela)
    ctx.fillStyle = "black"; ctx.fillRect(0, 0, canvas.width, 50);
    ctx.fillStyle = "yellow"; ctx.font = "bold 18px Courier";
    ctx.fillText(`CARS: ${carsRemaining}`, 20, 32);
}

function togglePause() { isPaused = !isPaused; if(!isPaused) update(); }
function resetGame() { location.reload(); }

update();