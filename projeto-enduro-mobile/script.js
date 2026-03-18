 const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 400; canvas.height = 400;

// --- CONFIGURAÇÕES DE ENTRADA ---
window.addEventListener('contextmenu', e => e.preventDefault(), false);
window.addEventListener('touchstart', e => {
    if (e.target.tagName === 'CANVAS') e.preventDefault();
}, { passive: false });

// --- VARIÁVEIS GLOBAIS ---
let playerX = 0, speed = 0, gameTick = 0, playerDist = 0;
let dayNumber = 1, baseGoal = 200, carsRemaining = baseGoal; 
let gameState = "PLAYING"; 
let isPaused = false;
let vitoriaTocada = false; 

// --- SISTEMA DE RECORDES (PLACARES) ---
let odometerNow = 0;
let dayBestRecord = parseFloat(localStorage.getItem('enduro_dayBest')) || 0;
let totalBestRecord = parseFloat(localStorage.getItem('enduro_totalBest')) || 0;

let passDayNow = 0;                                               
let passDayBest = parseInt(localStorage.getItem('enduro_passDayBest')) || 0;     
let passTotalOdo = parseInt(localStorage.getItem('enduro_passTotalOdo')) || 0;   
let passTotalBest = parseInt(localStorage.getItem('enduro_passTotalBest')) || 0; 

// --- CONSTANTES ---
const maxSpeed = 18; 
const STAGE_DURATION = 5400; 
const DAY_DURATION = STAGE_DURATION * 9; 
let currentTime = 0; 

let enemies = [];
let enemySpawnTimer = 0; 
let roadCurve = 0;      
let targetCurve = 0;    
let curveTimer = 0;     
let curveSpeed = 0.015; 
let leftPressTime = 0, rightPressTime = 0;
let raindrops = []; 
let lightningAlpha = 0; 

// --- ÁUDIOS ---
const sfxChuva = new Audio('chuva.mp3'); sfxChuva.loop = true; sfxChuva.volume = 0.5; 
const sfxTrovao = new Audio('trovao.mp3'); sfxTrovao.volume = 0.2; 
const sfxVitoriaAudio = new Audio('vitoria.mp3');
const sfxDerrota = new Audio('game_over.mp3');

// --- VÍDEOS ---
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

const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };

// --- FUNÇÕES DE UI E PERSISTÊNCIA ---
function updateUI() {
    // Distância
    if(document.getElementById('ui-dist')) document.getElementById('ui-dist').innerText = (playerDist / 1000).toFixed(1) + " KM";
    if(document.getElementById('ui-day-best')) document.getElementById('ui-day-best').innerText = dayBestRecord.toFixed(1) + " KM";
    if(document.getElementById('ui-total-now')) document.getElementById('ui-total-now').innerText = (odometerNow / 1000).toFixed(1) + " KM";
    if(document.getElementById('ui-total-best')) document.getElementById('ui-total-best').innerText = (totalBestRecord / 1000).toFixed(1) + " KM";
    
    // Ultrapassagens (O que você pediu para corrigir)
    if(document.getElementById('ui-pass-day')) document.getElementById('ui-pass-day').innerText = passDayNow;
    if(document.getElementById('ui-passes-day-best')) document.getElementById('ui-passes-day-best').innerText = passDayBest;
    if(document.getElementById('ui-total-passes-now')) document.getElementById('ui-total-passes-now').innerText = passTotalOdo;
    if(document.getElementById('ui-passes-total-best')) document.getElementById('ui-passes-total-best').innerText = passTotalBest;
}

function saveProgress() {
    const data = { dayNumber, carsRemaining, playerDist, currentTime, odometerNow, passDayNow, passTotalOdo };
    localStorage.setItem('enduro_save', JSON.stringify(data));
    localStorage.setItem('enduro_passDayBest', passDayBest);
    localStorage.setItem('enduro_passTotalBest', passTotalBest);
    localStorage.setItem('enduro_dayBest', dayBestRecord.toString());
    localStorage.setItem('enduro_totalBest', totalBestRecord.toString());
}

function loadProgress() {
    const saved = localStorage.getItem('enduro_save');
    if (saved) {
        const data = JSON.parse(saved);
        dayNumber = data.dayNumber || 1; 
        carsRemaining = data.carsRemaining;
        playerDist = data.playerDist || 0; 
        currentTime = data.currentTime || 0;
        odometerNow = data.odometerNow || 0; 
        passDayNow = data.passDayNow || 0;
        passTotalOdo = data.passTotalOdo || 0;
    }
}
loadProgress();

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
window.addEventListener('keydown', e => { 
    if (keys.hasOwnProperty(e.code)) keys[e.code] = true; 
    if (audioCtx.state === 'suspended') audioCtx.resume();
});
window.addEventListener('keyup', e => { if (keys.hasOwnProperty(e.code)) keys[e.code] = false; });

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

function togglePause() {
    if (gameState === "PLAYING" || gameState === "GOAL_REACHED") {
        isPaused = !isPaused;
        const btn = document.getElementById('pauseBtn');
        if (btn) btn.innerText = isPaused ? "Retomar" : "Pausar";
        if (isPaused) saveProgress();
        if (!isPaused) { audioCtx.resume(); update(); }
    }
}

function resetGame() {
    dayNumber = 1; baseGoal = 200; odometerNow = 0; passTotalOdo = 0;
    localStorage.clear();
    resetDay();
    if (gameState !== "PLAYING") { gameState = "PLAYING"; update(); }
}

function resetDay() {
    currentTime = 0; playerDist = 0; speed = 0; enemies = [];
    passDayNow = 0; carsRemaining = baseGoal + (dayNumber - 1) * 10; 
    gameState = "PLAYING"; isPaused = false; vitoriaTocada = false; 
    saveProgress();
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
    if (!(nightMode || (hasFog && !isRainy))) {
        ctx.fillStyle = "#111"; 
        ctx.fillRect(-w * 0.5, -h * 0.1, w * 0.25, h * 0.8);
        ctx.fillRect(w * 0.25, -h * 0.1, w * 0.25, h * 0.8);
        ctx.fillStyle = color; 
        ctx.fillRect(-w * 0.25, h * 0.1, w * 0.5, h * 0.4); 
        ctx.fillRect(-w * 0.5, -h * 0.3, w, h * 0.2); 
    }
    ctx.restore();
}

function update() {
    if (isPaused) return; 
    let currentStage = Math.min(Math.floor(currentTime / STAGE_DURATION), 8);
    let isRaining = (currentStage === 3 || currentStage === 7);

    let colors = { sky: "#87CEEB", grass: "#1a7a1a", fog: 0, mt: "#555", nightMode: false, snowCaps: false };
    switch(currentStage) {
        case 0: colors.snowCaps = true; break; 
        case 1: colors.sky = "#DDD"; colors.grass = "#FFF"; colors.mt = "#999"; colors.snowCaps = true; break; 
        case 3: colors.sky = "#2c3e50"; colors.grass = "#0a2a0a"; colors.mt = "#1a1a1a"; colors.fog = 0.7; break; 
        case 4: colors.sky = "#111144"; colors.grass = "#001100"; colors.mt = "#111"; colors.nightMode = true; break; 
        case 5: colors.sky = "#000011"; colors.grass = "#000000"; colors.mt = "#111"; colors.fog = 0.9; colors.nightMode = true; break; 
    }

    if (gameState === "WIN_DAY" || gameState === "GAME_OVER") { 
        draw(colors, isRaining, currentStage); 
        requestAnimationFrame(update); return; 
    }

    gameTick++; playerDist += speed; odometerNow += speed; currentTime++; 
    if (gameTick % 4 === 0) playEngineSound();
    
    // --- ATUALIZAÇÃO DOS RECORDES ---
    if (playerDist / 1000 > dayBestRecord) dayBestRecord = playerDist / 1000;
    if (odometerNow / 1000 > totalBestRecord) totalBestRecord = odometerNow / 1000;
    if (passDayNow > passDayBest) passDayBest = passDayNow;
    if (passTotalOdo > passTotalBest) passTotalBest = passTotalOdo;
    
    updateUI();

    // Movimentação do Jogador
    if (keys.ArrowLeft) playerX -= 4.2;
    if (keys.ArrowRight) playerX += 4.2;
    let isBraking = keys.ArrowDown;
    if (isBraking) speed = Math.max(speed - 0.2, 0); 
    else speed = Math.min(speed + 0.05, maxSpeed);

    playerX = Math.max(-480, Math.min(480, playerX));
    roadCurve += (targetCurve - roadCurve) * curveSpeed;
    if (--curveTimer <= 0) {
        targetCurve = (Math.random() - 0.5) * 150;
        curveTimer = 100 + Math.random() * 200;
    }

    // --- LÓGICA DE INIMIGOS E ULTRAPASSAGENS ---
    for (let i = enemies.length - 1; i >= 0; i--) {
        let enemy = enemies[i];
        enemy.z -= (speed - enemy.v);
        
        // Sumir no horizonte (frente ou trás)
        if (enemy.z > 5000 || enemy.z < -10000) {
            enemies.splice(i, 1);
            continue;
        }

        let p = 1 - (enemy.z / 4000); 
        let roadWidth = 20 + p * 550;
        let screenX = (200 - playerX * 0.05) + (roadCurve * p * p) - (playerX * p) + (enemy.lane * roadWidth * 0.5);
        
        // Colisão
        if (enemy.z > 0 && p > 0.92 && p < 1.05 && Math.abs(screenX - 200) < 40) { 
            speed = 2; playCrashSound(); enemy.z += 1000; 
        }

        // --- CONTADOR DE ULTRAPASSAGENS ---
        if (!enemy.isOvertaken && enemy.z <= 0) {
            carsRemaining--; 
            passDayNow++; 
            passTotalOdo++; 
            enemy.isOvertaken = true;
            if (carsRemaining <= 0 && !vitoriaTocada) { sfxVitoriaAudio.play(); vitoriaTocada = true; }
        }
        
        enemy.lastY = 200 + (p * 140); enemy.lastX = screenX; enemy.lastP = p;
    }

    // Criar Inimigos
    enemySpawnTimer--;
    if (enemySpawnTimer <= 0 && enemies.length < 10) {
        enemies.push({ 
            lane: [-0.8, -0.4, 0, 0.4, 0.8][Math.floor(Math.random()*5)], 
            z: 4000, v: 7 + Math.random() * 5, 
            color: ["#F0F", "#0FF", "#0F0", "#FF0", "#FFF"][Math.floor(Math.random()*5)], 
            isOvertaken: false 
        });
        enemySpawnTimer = 90 + Math.random() * 100;
    }

    if (gameTick % 300 === 0) saveProgress(); // Auto-save a cada 5 segundos
    draw(colors, isRaining, currentStage);
    requestAnimationFrame(update);
}

function draw(colors, isRaining, currentStage) {
    ctx.fillStyle = colors.sky; ctx.fillRect(0, 0, 400, 200);
    ctx.fillStyle = colors.grass; ctx.fillRect(0, 200, 400, 200);
    
    for (let i = 200; i < 400; i += 4) {
        let p = (i - 200) / 140; 
        let x = (200 - playerX * 0.05) + (roadCurve * p * p) - (playerX * p);
        let w = 20 + p * 550;
        ctx.fillStyle = (Math.sin(i*0.5+playerDist*0.2)>0) ? "#333" : "#3d3d3d";
        ctx.fillRect(x - w/2, i, w, 4);
    }

    enemies.sort((a,b) => b.z - a.z).forEach(e => {
        drawF1Car(e.lastX, e.lastY, e.lastP * 0.8, e.color, false, colors.nightMode, colors.fog > 0, isRaining);
    });
    drawF1Car(200, 350, 0.8, "#E00", true, colors.nightMode, colors.fog > 0, isRaining);

    // HUD Superior
    ctx.fillStyle = "black"; ctx.fillRect(0, 0, 400, 55);
    ctx.fillStyle = "yellow"; ctx.font = "bold 18px Courier";
    ctx.fillText(`CARS: ${carsRemaining}`, 15, 35);
    ctx.fillText(`DAY: ${dayNumber}`, 160, 35);
}

function updateApp() {
    navigator.serviceWorker.getRegistration().then(reg => {
        if (reg && reg.waiting) reg.waiting.postMessage('skipWaiting');
        window.location.reload();
    });
}

update();