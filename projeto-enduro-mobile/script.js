 const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// VARIÁVEIS ORIGINAIS DO SEU ARQUIVO
let playerX = 0, speed = 0, gameTick = 0, playerDist = 0;
let dayNumber = 1, baseGoal = 200, carsRemaining = baseGoal; 
let gameState = "PLAYING", isPaused = false, currentTime = 0;
const maxSpeed = 12; 
const STAGE_DURATION = 12600; 
let enemies = [];
let roadCurve = 0, targetCurve = 0, curveTimer = 0;
const keys = { ArrowLeft: false, ArrowRight: false };

// --- ÁUDIO ORIGINAL ---
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

// --- CONTROLES MOBILE ---
const setupBtn = (id, key) => {
    const el = document.getElementById(id);
    el.addEventListener('touchstart', (e) => { 
        e.preventDefault(); keys[key] = true; 
        if (audioCtx.state === 'suspended') audioCtx.resume(); 
    });
    el.addEventListener('touchend', (e) => { e.preventDefault(); keys[key] = false; });
};
setupBtn('btnLeft', 'ArrowLeft');
setupBtn('btnRight', 'ArrowRight');

function update() {
    if (isPaused) return; 
    gameTick++; playerDist += speed; currentTime++;
    if (gameTick % 4 === 0) playEngineSound();

    let currentStage = Math.floor(currentTime / STAGE_DURATION);
    let colors = { sky: "#87CEEB", grass: "#1a7a1a", mt: "#555", nightMode: false, snowCaps: true };
    if (currentStage === 1) { colors.sky = "#DDD"; colors.grass = "#FFF"; colors.mt = "#999"; }
    if (currentStage >= 4 && currentStage <= 6) colors.nightMode = true;

    // Aceleração automática
    speed = Math.min(speed + (speed < 5 ? 0.02 : 0.06), maxSpeed);

    if (keys.ArrowLeft) playerX -= 12;
    if (keys.ArrowRight) playerX += 12;
    playerX -= (roadCurve / 30) * (speed / maxSpeed);

    // Inimigos em fila (evita amontoados)
    if (gameTick % 100 === 0 && enemies.length < 5 && enemies.every(e => e.z < 3000)) {
        enemies.push({ 
            lane: (Math.random() - 0.5) * 1.6, z: 4000, v: 7, 
            color: ["#F0F", "#0FF", "#0F0", "#FF0"][Math.floor(Math.random() * 4)],
            isOvertaken: false 
        });
    }

    enemies.forEach((e) => {
        e.z -= (speed - e.v);
        if (e.z <= 0 && !e.isOvertaken) { carsRemaining--; e.isOvertaken = true; }
        let p = 1 - (e.z / 4000); 
        // PISTA GIGANTE (Fator 2.5 para ocupar a tela)
        let roadWidth = 20 + (p * p * canvas.width * 2.5); 
        e.screenX = (canvas.width/2) + (roadCurve * p * p) - (playerX * p) + (e.lane * roadWidth * 0.45);
        e.screenY = (canvas.height/2) + (p * p * (canvas.height/2.1));
        
        let hitBox = (canvas.width * 0.08) * p;
        if (p > 0.85 && p < 1.05 && Math.abs(e.screenX - canvas.width/2) < hitBox) { 
            speed = 0.5; e.z += 1000; 
        }
    });

    if (--curveTimer <= 0) { targetCurve = (Math.random() - 0.5) * (canvas.width * 0.4); curveTimer = 150; }
    roadCurve += (targetCurve - roadCurve) * 0.02;

    enemies = enemies.filter(e => e.z > -500);
    draw(colors);
    requestAnimationFrame(update);
}

function draw(colors) {
    ctx.fillStyle = colors.sky; ctx.fillRect(0, 0, canvas.width, canvas.height/2);
    
    // MONTANHAS ORIGINAIS (Com picos de neve)
    ctx.fillStyle = colors.mt;
    for (let i = -2; i < 5; i++) {
        let bx = (canvas.width/2) + (i * canvas.width * 0.9) - (playerX * 0.1) + (roadCurve * 0.6);
        ctx.beginPath();
        ctx.moveTo(bx - 300, canvas.height/2); ctx.lineTo(bx, canvas.height/2 - 120); ctx.lineTo(bx + 300, canvas.height/2);
        ctx.fill();
        if (colors.snowCaps) {
            ctx.fillStyle = "#FFF"; ctx.beginPath();
            ctx.moveTo(bx - 40, canvas.height/2 - 105); ctx.lineTo(bx, canvas.height/2 - 120); ctx.lineTo(bx + 40, canvas.height/2 - 105);
            ctx.fill(); ctx.fillStyle = colors.mt;
        }
    }

    ctx.fillStyle = colors.grass; ctx.fillRect(0, canvas.height/2, canvas.width, canvas.height/2);

    // ESTRADA AFUNILADA (Impressão de infinito)
    for (let i = canvas.height/2; i < canvas.height; i += 4) {
        let p = (i - canvas.height/2) / (canvas.height/2);
        let roadW = 20 + (p * p * canvas.width * 2.5); 
        let x = (canvas.width/2) + (roadCurve * p * p) - (playerX * p);
        ctx.fillStyle = Math.sin(i * 0.5 + playerDist * 0.2) > 0 ? "#333" : "#3d3d3d";
        ctx.fillRect(x - roadW/2, i, roadW, 4);
        ctx.fillStyle = Math.sin(i * 0.5 + playerDist * 0.2) > 0 ? "red" : "white";
        ctx.fillRect(x - roadW/2 - 15*p, i, 15*p, 4);
        ctx.fillRect(x + roadW/2, i, 15*p, 4);
    }
    
    enemies.sort((a,b) => b.z - a.z).forEach(e => {
        let p = 1 - (e.z/4000);
        if (p > 0) drawF1Car(e.screenX, e.screenY, p, e.color, false, colors.nightMode);
    });
    drawF1Car(canvas.width/2, canvas.height * 0.9, 1.3, "#E00", true, colors.nightMode);

    ctx.fillStyle = "black"; ctx.fillRect(0, 0, canvas.width, 60);
    ctx.fillStyle = "yellow"; ctx.font = "bold 20px Courier";
    ctx.fillText(`CARS: ${Math.max(0, carsRemaining)}`, 20, 40);
}

function drawF1Car(x, y, scale, color, isPlayer, nightMode) {
    let s = scale * (canvas.width / 400); 
    let w = 45 * s; let h = 22 * s;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color; ctx.fillRect(-w/2, -h, w, h*0.5); 
    ctx.fillStyle = "#111"; ctx.fillRect(-w/1.8, -h, w/4, h); 
    ctx.fillRect(w/3, -h, w/4, h);
    ctx.restore();
}

function togglePause() { isPaused = !isPaused; if(!isPaused) update(); }
function resetGame() { dayNumber = 1; currentTime = 0; playerDist = 0; speed = 0; enemies = []; carsRemaining = baseGoal; isPaused = false; update(); }

update();