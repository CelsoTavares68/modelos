  const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Ajuste dinâmico de resolução
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

let playerX = 0, speed = 0, gameTick = 0, playerDist = 0;
let dayNumber = 1, baseGoal = 200, carsRemaining = baseGoal; 
let gameState = "PLAYING"; 
let isPaused = false;

const maxSpeed = 12; 
const STAGE_DURATION = 12600; 
const DAY_DURATION = STAGE_DURATION * 9; 
let currentTime = 0; 

let enemies = [];
let roadCurve = 0, targetCurve = 0, curveTimer = 0;

const keys = { ArrowLeft: false, ArrowRight: false };

// --- ÁUDIO (TEU CÓDIGO ORIGINAL) ---
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

// --- CONTROLES MOBILE ---
const setupBtn = (id, key) => {
    const el = document.getElementById(id);
    el.addEventListener('touchstart', (e) => { e.preventDefault(); keys[key] = true; audioCtx.resume(); }, {passive: false});
    el.addEventListener('touchend', (e) => { e.preventDefault(); keys[key] = false; }, {passive: false});
};
setupBtn('btnLeft', 'ArrowLeft');
setupBtn('btnRight', 'ArrowRight');

// --- TEU DESENHO DE F1 (ADAPTADO) ---
function drawF1Car(x, y, scale, color, isPlayer = false, nightMode = false) {
    let s = scale * (canvas.width / 400); 
    if (s < 0.01) return; 
    let w = 45 * s; let h = 22 * s; 

    ctx.save();
    ctx.translate(x, y);
    if(isPlayer) ctx.rotate((roadCurve / 50) * Math.PI / 180);

    if (nightMode) {
        // ... (Teu código original de faróis mantido)
        ctx.fillStyle = "#ff0000"; ctx.fillRect(-w * 0.45, -h * 0.2, w * 0.25, h * 0.3); 
        ctx.fillRect(w * 0.2, -h * 0.2, w * 0.25, h * 0.3);
    } else {
        ctx.fillStyle = "#111"; 
        ctx.fillRect(-w * 0.5, -h * 0.1, w * 0.25, h * 0.8);
        ctx.fillRect(w * 0.25, -h * 0.1, w * 0.25, h * 0.8);
        ctx.fillStyle = color; 
        ctx.fillRect(-w * 0.25, h * 0.1, w * 0.5, h * 0.4); 
        ctx.fillRect(-w * 0.5, -h * 0.3, w, h * 0.2); 
        ctx.fillStyle = "#400";
        ctx.fillRect(-w * 0.4, -h * 0.2, w * 0.12, h * 0.15);
        ctx.fillRect(w * 0.28, -h * 0.2, w * 0.12, h * 0.15);
    }
    ctx.restore();
}

 function update() {
    if (isPaused) return; 
    gameTick++; playerDist += speed; currentTime++;
    if (gameTick % 4 === 0) playEngineSound();

    // 1. Lógica de Estágios e Cores
    let currentStage = Math.floor(currentTime / STAGE_DURATION);
    let colors = { sky: "#87CEEB", grass: "#1a7a1a", mt: "#555", nightMode: false };
    if (currentStage === 4 || currentStage === 5 || currentStage === 6) colors.nightMode = true;

    // 2. Aceleração Automática e Recuperação Lenta
    let offRoad = Math.abs(playerX) > canvas.width * 0.35; // Detecta se saiu da pista
    let targetMax = offRoad ? 3 : maxSpeed;
    
    // Recuperação após batida: se a velocidade for muito baixa, a aceleração é mínima (0.01)
    let accelRate = (speed < 5) ? 0.015 : 0.04; 
    speed = Math.min(speed + accelRate, targetMax);

    // 3. Movimento Lateral
    if (keys.ArrowLeft) playerX -= 8;
    if (keys.ArrowRight) playerX += 8;
    playerX -= (roadCurve / 45) * (speed / maxSpeed); // Drift na curva
    playerX = Math.max(-canvas.width * 0.8, Math.min(canvas.width * 0.8, playerX));

    // 4. Lógica de Curva
    if (--curveTimer <= 0) { 
        targetCurve = (Math.random() - 0.5) * (canvas.width * 0.25); 
        curveTimer = 150; 
    }
    roadCurve += (targetCurve - roadCurve) * 0.02;

    // 5. Gerador de Inimigos em Sequência (Fila)
    // Só cria um carro novo se o horizonte estiver limpo (z < 3000) e a cada 120 frames
    let horizonBusy = enemies.some(e => e.z > 3000);
    if (gameTick % 120 === 0 && enemies.length < 6 && !horizonBusy) {
        enemies.push({ 
            lane: (Math.random() - 0.5) * 1.2, // Faixa reduzida para garantir que fiquem no asfalto
            z: 4000, 
            v: 7.5, 
            color: ["#F0F","#0FF","#0F0","#FF0"][Math.floor(Math.random()*4)],
            over: false 
        });
    }

    // 6. Atualização dos Inimigos
    enemies.forEach(e => {
        // Velocidade relativa: se bater, eles te ultrapassam por trás
        e.z -= (speed - e.v); 
        
        let p = 1 - (e.z / 4000);
        // roadW ajustado para a escala mobile
        let roadW = 20 + p * (canvas.width * 1.2); 
        
        // Posição X calculada para seguir a perspectiva da estrada
        e.x = (canvas.width / 2) + (roadCurve * p * p) - (playerX * p) + (e.lane * roadW * 0.45);
        e.y = (canvas.height / 2) + (p * p * (canvas.height / 2.2));

        // Colisão com recuperação gradual
        if (p > 0.85 && p < 1.05 && Math.abs(e.x - canvas.width / 2) < (canvas.width * 0.12)) {
            speed = 0.2; // Velocidade cai quase a zero
            e.z += 1200; // Joga o inimigo para frente para não bater de novo
            playCrashSound();
        }

        if (e.z <= 0 && !e.over) { 
            if (speed > e.v) carsRemaining--; 
            e.over = true; 
        }
    });

    // Limpeza de inimigos fora de alcance
    enemies = enemies.filter(e => e.z > -1000 && e.z < 5000);
    
    draw(colors);
    requestAnimationFrame(update);
}

function draw(colors) {
    // Fundo
    ctx.fillStyle = colors.sky; ctx.fillRect(0, 0, canvas.width, canvas.height/2);
    ctx.fillStyle = colors.grass; ctx.fillRect(0, canvas.height/2, canvas.width, canvas.height/2);

    // Estrada (Tua original adaptada)
    for (let i = canvas.height/2; i < canvas.height; i += 6) {
        let p = (i - canvas.height/2) / (canvas.height/2);
        let x = (canvas.width/2) + (roadCurve * p * p) - (playerX * p);
        let w = 20 + p * (canvas.width * 1.5);
        ctx.fillStyle = Math.sin(i * 0.5 + playerDist * 0.2) > 0 ? "#333" : "#444";
        ctx.fillRect(x - w/2, i, w, 6);
    }

    enemies.sort((a,b) => b.z - a.z).forEach(e => {
        let p = 1 - (e.z/4000);
        if(p > 0) drawF1Car(e.x, e.y, p, e.color, false, colors.nightMode);
    });

    drawF1Car(canvas.width/2, canvas.height * 0.85, 1.2, "#E00", true, colors.nightMode);

    // HUD Original
    ctx.fillStyle = "black"; ctx.fillRect(0, 0, canvas.width, 55);
    ctx.fillStyle = "yellow"; ctx.font = "bold 18px Courier";
    ctx.fillText(`CARS: ${carsRemaining}`, 20, 35);
}

function togglePause() { isPaused = !isPaused; if(!isPaused) update(); }
function resetGame() { location.reload(); }
update();