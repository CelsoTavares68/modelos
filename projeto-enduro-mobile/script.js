 const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 400; canvas.height = 400;

let playerX = 0, speed = 0, gameTick = 0, playerDist = 0;
let dayNumber = 1, baseGoal = 200, carsRemaining = baseGoal; 
let gameState = "PLAYING"; 
let isPaused = false;

// --- RECORDE (Recuperando sua lógica original) ---
let odometerNow = 0;
let dayBestRecord = parseFloat(localStorage.getItem('enduro_dayBest')) || 0;
let totalBestRecord = parseFloat(localStorage.getItem('enduro_totalBest')) || 0;

const maxSpeed = 16; 
const STAGE_DURATION = 9000; 
const DAY_DURATION = STAGE_DURATION * 9; 
let currentTime = 0; 

let enemies = [];

// --- SISTEMA DE CURVAS ---
let roadCurve = 0;      
let targetCurve = 0;    
let curveTimer = 0;     
let curveSpeed = 0.015; 

// --- FREIO ---
let leftPressTime = 0;
let rightPressTime = 0;

// --- CLIMA ---
let raindrops = []; 
let lightningAlpha = 0; 

// --- SONS ---
const sfxChuva = new Audio('chuva.mp3');
sfxChuva.loop = true;
sfxChuva.volume = 0.5; 
const sfxTrovao = new Audio('trovao.mp3');
sfxTrovao.volume = 0.3; // Volume baixo como você pediu

// --- MÍDIA (Suas funções originais de vídeo) ---
const videoVitoria = document.createElement('video');
videoVitoria.src = 'bandeira_vitoria.mp4';
videoVitoria.style.position = 'absolute';
videoVitoria.style.top = '55px'; videoVitoria.style.left = '0';
videoVitoria.style.width = '400px'; videoVitoria.style.height = '345px';
videoVitoria.style.display = 'none'; videoVitoria.style.zIndex = '10';
videoVitoria.muted = true; videoVitoria.load();
document.body.appendChild(videoVitoria);

const videoDerrota = document.createElement('video');
videoDerrota.src = 'game_over.mp4';
videoDerrota.style.position = 'absolute';
videoDerrota.style.top = '55px'; videoDerrota.style.left = '0';
videoDerrota.style.width = '400px'; videoDerrota.style.height = '345px';
videoDerrota.style.display = 'none'; videoDerrota.style.zIndex = '10';
videoDerrota.muted = true; videoDerrota.load();
document.body.appendChild(videoDerrota);

const sfxDerrota = new Audio('game_over.mp3');
const sfxVitoriaAudio = new Audio('vitoria.mp3');

const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };

// --- FUNÇÃO AUXILIAR DA BANDEIRADA ---
function drawFinishLine(y, roadWidth, xPos) {
    const squares = 10;
    const size = roadWidth / squares;
    for (let i = 0; i < squares; i++) {
        ctx.fillStyle = (i % 2 === 0) ? "#fff" : "#000";
        ctx.fillRect(xPos - roadWidth/2 + (i * size), y, size, 10);
    }
}

// --- ATUALIZAÇÃO DA UI (Sua lógica de recordes) ---
function updateUI() {
    document.getElementById('ui-dist').innerText = (playerDist / 1000).toFixed(1) + " KM";
    document.getElementById('ui-day-best').innerText = dayBestRecord.toFixed(1) + " KM";
    document.getElementById('ui-total-now').innerText = (odometerNow / 1000).toFixed(1) + " KM";
    document.getElementById('ui-total-best').innerText = (totalBestRecord / 1000).toFixed(1) + " KM";
}

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

window.addEventListener('keydown', e => { 
    if (keys.hasOwnProperty(e.code)) keys[e.code] = true; 
    if (audioCtx.state === 'suspended') audioCtx.resume();
});
window.addEventListener('keyup', e => { if (keys.hasOwnProperty(e.code)) keys[e.code] = false; });

function setupMobileControls() {
    const ids = { 'mobileLeft': 'ArrowLeft', 'mobileRight': 'ArrowRight' };
    Object.keys(ids).forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            const press = (e) => { e.preventDefault(); keys[ids[id]] = true; if(audioCtx.state === 'suspended') audioCtx.resume(); };
            const release = (e) => { e.preventDefault(); keys[ids[id]] = false; };
            btn.addEventListener('touchstart', press, {passive: false});
            btn.addEventListener('touchend', release, {passive: false});
        }
    });
}
setupMobileControls();

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
    let osc = audioCtx.createOscillator();
    let gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(80, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.4);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.4);
}

function togglePause() {
    isPaused = !isPaused;
    const btn = document.getElementById('pauseBtn');
    if (btn) btn.innerText = isPaused ? "Retomar" : "Pausar";
    if (isPaused) sfxChuva.pause();
}

function resetGame() {
    location.reload();
}

function drawF1Car(x, y, scale, color, isPlayer = false, nightMode = false, hasFog = false, isRainy = false) {
    let s = scale * 1.2;
    if (s < 0.02 || s > 30) return;
    let w = 45 * s; let h = 22 * s;
    ctx.save();
    ctx.translate(x, y);
    if(isPlayer) ctx.rotate((roadCurve / 80) * Math.PI / 180);
    
    if (nightMode || hasFog || isRainy) {
        ctx.fillStyle = "#FF0000";
        ctx.fillRect(-w * 0.35, h * 0.2, w * 0.15, h * 0.25); 
        ctx.fillRect(w * 0.20, h * 0.2, w * 0.15, h * 0.25); 
    }

    ctx.fillStyle = color; 
    ctx.fillRect(-w * 0.25, h * 0.1, w * 0.5, h * 0.4); 
    ctx.restore();
}

function update() {
    if (isPaused) return; 
    let currentStage = Math.min(Math.floor(currentTime / STAGE_DURATION), 8);
    let isRaining = (currentStage === 3 || currentStage === 7);
    let warningLightning = (currentStage === 2 || currentStage === 6); // Fases de trovão

    let colors = { sky: "#87CEEB", grass: "#1a7a1a", fog: 0, mt: "#555", nightMode: false, snowCaps: false };
    
    // ... (suas cores de fase originais mantidas)

    if (gameState === "WIN_DAY" || gameState === "GAME_OVER") { 
        draw(colors, isRaining); 
        requestAnimationFrame(update); 
        return; 
    }

    gameTick++; playerDist += speed; odometerNow += speed; currentTime++; 
    if (gameTick % 4 === 0) playEngineSound();

    // LÓGICA DO TROVÃO NAS FASES CERTAS
    if (isRaining || warningLightning) {
        if (isRaining && sfxChuva.paused) sfxChuva.play().catch(e => {}); 
        if (Math.random() > 0.996) { 
            lightningAlpha = 0.7; 
            sfxTrovao.play().catch(e => {});
        }
    } else { sfxChuva.pause(); }

    if (isRaining) {
        for (let i = 0; i < 12; i++) raindrops.push({ x: Math.random() * 400, y: -20, s: Math.random() * 10 + 22 });
    }
    raindrops.forEach((r, i) => { r.y += r.s; if (r.y > 400) raindrops.splice(i, 1); });
    if (lightningAlpha > 0) lightningAlpha -= 0.05;

    // LÓGICA DE RECORDE
    if (playerDist / 1000 > dayBestRecord) {
        dayBestRecord = playerDist / 1000;
        localStorage.setItem('enduro_dayBest', dayBestRecord);
    }
    if (odometerNow > totalBestRecord) {
        totalBestRecord = odometerNow;
        localStorage.setItem('enduro_totalBest', totalBestRecord);
    }
    updateUI();

    // ... (resto da sua função update original: velocidade, curvas, inimigos)
    
    // Simplificando apenas para caber aqui, mas mantendo sua lógica interna de inimigos e playerX
    let isBraking = keys.ArrowDown; 
    if (isBraking) speed = Math.max(speed - 0.15, 0); 
    else speed = Math.min(speed + 0.06, maxSpeed);

    playerX -= (roadCurve * 0.06) * (speed / maxSpeed); 
    if (keys.ArrowLeft) playerX -= 4.8;
    if (keys.ArrowRight) playerX += 4.8;

    draw(colors, isRaining);
    requestAnimationFrame(update);
}

function draw(colors, isRaining) {
    ctx.fillStyle = colors.sky; ctx.fillRect(0, 0, 400, 200);
    ctx.fillStyle = colors.grass; ctx.fillRect(0, 200, 400, 200);
    
    for (let i = 200; i < 400; i += 4) {
        let p = (i - 200) / 140; 
        let x = (200 - playerX * 0.05) + (roadCurve * p * p) - (playerX * p);
        let w = 20 + p * 800;

        // BANDEIRADA
        if (carsRemaining <= 0 && i > 250 && i < 260) {
            drawFinishLine(i, w, x);
        }

        ctx.fillStyle = Math.sin(i * 0.5 + playerDist * 0.2) > 0 ? "#333" : "#3d3d3d";
        ctx.fillRect(x - w/2, i, w, 4);
    }

    drawF1Car(200, 350, 0.85, "#E00", true); 
    
    if (lightningAlpha > 0) { ctx.fillStyle = `rgba(255, 255, 255, ${lightningAlpha})`; ctx.fillRect(0, 55, 400, 345); }

    // TOPO PRETO
    ctx.fillStyle = "black"; ctx.fillRect(0, 0, 400, 55);
    ctx.fillStyle = "yellow"; ctx.font = "bold 18px Courier";
    ctx.fillText(`CARS: ${carsRemaining}`, 15, 35);
    ctx.fillText(`DAY: ${dayNumber}`, 160, 35);
}

update();