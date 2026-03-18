 const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 400; canvas.height = 400;

// --- CONFIGURAÇÕES DE ENTRADA E PREVENÇÃO DE PADRÕES ---
window.addEventListener('contextmenu', e => e.preventDefault(), false);
window.addEventListener('touchstart', e => {
    if (e.target.tagName === 'CANVAS') e.preventDefault();
}, { passive: false });

// --- VARIÁVEIS GLOBAIS DE ESTADO ---
let playerX = 0, speed = 0, gameTick = 0, playerDist = 0;
let dayNumber = 1, baseGoal = 200, carsRemaining = baseGoal; 
let gameState = "PLAYING"; 
let isPaused = false;
let vitoriaTocada = false; 

// --- SISTEMA DE RECORDES ---
let odometerNow = 0;
let dayBestRecord = parseFloat(localStorage.getItem('enduro_dayBest')) || 0;
let totalBestRecord = parseFloat(localStorage.getItem('enduro_totalBest')) || 0;
let passDayNow = 0;                                               
let passDayBest = parseInt(localStorage.getItem('enduro_passDayBest')) || 0;     
let passTotalOdo = parseInt(localStorage.getItem('enduro_passTotalOdo')) || 0;   
let passTotalBest = parseInt(localStorage.getItem('enduro_passTotalBest')) || 0; 

// --- CONSTANTES ---
const maxSpeed = 18; 
const STAGE_DURATION = 6000; 
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

// --- VÍDEOS DE FEEDBACK ---
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

// --- FUNÇÕES DE INTERFACE E SALVAMENTO ---
function drawFinishLine(y, roadWidth, xPos) {
    const squares = 10;
    const size = roadWidth / squares;
    for (let i = 0; i < squares; i++) {
        ctx.fillStyle = (i % 2 === 0) ? "#fff" : "#000";
        ctx.fillRect(xPos - roadWidth/2 + (i * size), y, size, 10);
    }
}

function updateUI() {
    if(document.getElementById('ui-dist')) document.getElementById('ui-dist').innerText = (playerDist / 1000).toFixed(1) + " KM";
    if(document.getElementById('ui-day-best')) document.getElementById('ui-day-best').innerText = dayBestRecord.toFixed(1) + " KM";
    if(document.getElementById('ui-total-now')) document.getElementById('ui-total-now').innerText = (odometerNow / 1000).toFixed(1) + " KM";
    if(document.getElementById('ui-total-best')) document.getElementById('ui-total-best').innerText = (totalBestRecord / 1000).toFixed(1) + " KM";
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
    localStorage.setItem('enduro_dayBest', dayBestRecord);
    localStorage.setItem('enduro_totalBest', totalBestRecord);
}

function loadProgress() {
    const saved = localStorage.getItem('enduro_save');
    if (saved) {
        const data = JSON.parse(saved);
        dayNumber = data.dayNumber; carsRemaining = data.carsRemaining;
        playerDist = data.playerDist; currentTime = data.currentTime;
        odometerNow = data.odometerNow || 0; passDayNow = data.passDayNow || 0;
        passTotalOdo = data.passTotalOdo || 0;
    }
    passDayBest = parseInt(localStorage.getItem('enduro_passDayBest')) || 0;
    passTotalBest = parseInt(localStorage.getItem('enduro_passTotalBest')) || 0;
    dayBestRecord = parseFloat(localStorage.getItem('enduro_dayBest')) || 0;
    totalBestRecord = parseFloat(localStorage.getItem('enduro_totalBest')) || 0;
}
loadProgress();

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
            btn.addEventListener('mousedown', press);
            btn.addEventListener('mouseup', release);
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
        if (isPaused) { sfxChuva.pause(); saveProgress(); }
        if (!isPaused) { audioCtx.resume(); update(); }
    }
}

function resetGame() {
    dayNumber = 1; baseGoal = 200; odometerNow = 0; passTotalOdo = 0;
    localStorage.removeItem('enduro_save');
    resetDay();
    if (gameState !== "PLAYING") { gameState = "PLAYING"; update(); }
}

function resetDay() {
    currentTime = 0; playerDist = 0; speed = 0; enemies = [];
    passDayNow = 0; carsRemaining = baseGoal + (dayNumber - 1) * 10; 
    gameState = "PLAYING"; isPaused = false; vitoriaTocada = false; 
    if (sfxChuva) { sfxChuva.pause(); sfxChuva.currentTime = 0; }
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
        let lightLength = h * 3; 
        let gradient = ctx.createLinearGradient(0, 0, 0, -lightLength);
        gradient.addColorStop(0, "rgba(255, 255, 200, 0.25)"); 
        gradient.addColorStop(1, "rgba(255, 255, 200, 0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(-w * 0.15, 0); ctx.lineTo(-w * 0.8, -lightLength); 
        ctx.lineTo(w * 0.8, -lightLength); ctx.lineTo(w * 0.15, 0);
        ctx.fill();
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
    let warningLightning = (currentStage === 2 || currentStage === 6);

    let colors = { sky: "#87CEEB", grass: "#1a7a1a", fog: 0, mt: "#555", nightMode: false, snowCaps: false };
    switch(currentStage) {
        case 0: colors.snowCaps = true; break; 
        case 1: colors.sky = "#DDD"; colors.grass = "#FFF"; colors.mt = "#999"; colors.snowCaps = true; break; 
        case 2: colors.sky = "#ff8c00"; colors.grass = "#145c14"; colors.mt = "#442200"; break; 
        case 3: colors.sky = "#2c3e50"; colors.grass = "#0a2a0a"; colors.mt = "#1a1a1a"; colors.fog = 0.7; break; 
        case 4: colors.sky = "#111144"; colors.grass = "#001100"; colors.mt = "#111"; colors.nightMode = true; break; 
        case 5: colors.sky = "#000011"; colors.grass = "#000000"; colors.mt = "#111"; colors.fog = 0.9; colors.nightMode = true; break; 
        case 6: colors.sky = "#111144"; colors.grass = "#001100"; colors.mt = "#111"; colors.nightMode = true; break; 
        case 7: colors.sky = "#2c3e50"; colors.grass = "#0a2a0a"; colors.mt = "#1a1a1a"; colors.fog = 0.7; break; 
        case 8: colors.sky = "#ade1f2"; colors.grass = "#1a7a1a"; colors.mt = "#555"; colors.snowCaps = true; break; 
    }

    if (gameState === "WIN_DAY" || gameState === "GAME_OVER") { 
        sfxChuva.pause(); draw(colors, isRaining, currentStage); 
        requestAnimationFrame(update); return; 
    }

    gameTick++; playerDist += speed; odometerNow += speed; currentTime++; 
    if (gameTick % 4 === 0) playEngineSound();
    if (playerDist / 1000 > dayBestRecord) { dayBestRecord = playerDist / 1000; }
    if (odometerNow > totalBestRecord) { totalBestRecord = odometerNow; }
    if (passDayNow > passDayBest) { passDayBest = passDayNow; }
    if (passTotalOdo > passTotalBest) { passTotalBest = passTotalOdo; }
    updateUI();

    if (isRaining || warningLightning) {
        if (isRaining && sfxChuva.paused && audioCtx.state === 'running') sfxChuva.play().catch(e => {}); 
        if (Math.random() > 0.996) { lightningAlpha = 0.7; sfxTrovao.play().catch(e => {}); }
    } else { sfxChuva.pause(); }

    if (isRaining) for (let i = 0; i < 12; i++) raindrops.push({ x: Math.random() * 400, y: -20, s: Math.random() * 10 + 22 });
    raindrops.forEach((r, i) => { r.y += r.s; if (r.y > 400) raindrops.splice(i, 1); });
    if (lightningAlpha > 0) lightningAlpha -= 0.05;

    if (currentTime >= DAY_DURATION) {
        if (gameState === "GOAL_REACHED" || carsRemaining <= 0) {
            if (gameState !== "WIN_DAY") { 
                gameState = "WIN_DAY"; sfxVitoriaAudio.play();
                videoVitoria.style.display = 'block'; videoVitoria.play().catch(e => {});
                dayNumber++; setTimeout(() => { videoVitoria.style.display = 'none'; resetDay(); }, 4000); 
            }
        } else { 
            if (gameState !== "GAME_OVER") { 
                gameState = "GAME_OVER"; sfxDerrota.play();
                videoDerrota.style.display = 'block'; videoDerrota.play().catch(e => {});
            }
        }
    }

    let offRoad = Math.abs(playerX) > 260;
    if (keys.ArrowLeft) leftPressTime++; else leftPressTime = 0;
    if (keys.ArrowRight) rightPressTime++; else rightPressTime = 0;

    let isBraking = (leftPressTime > 75 || rightPressTime > 75 || keys.ArrowDown); 
    if (isBraking) speed = Math.max(speed - 0.15, 0); 
    else {
        if (offRoad) speed = Math.min(speed + 0.01, 2); 
        else speed = Math.min(speed + ((speed < 5) ? 0.02 : 0.06), maxSpeed);
    }

    playerX -= (roadCurve * 0.06) * (speed / maxSpeed); 
    if (keys.ArrowLeft) playerX -= 4.2;
    if (keys.ArrowRight) playerX += 4.2;
    playerX = Math.max(-480, Math.min(480, playerX));

    if (--curveTimer <= 0) { 
        if (Math.random() > 0.6) { targetCurve = 0; curveTimer = 100 + Math.random() * 200; }
        else { targetCurve = (Math.random() - 0.5) * 160; curveTimer = 80 + Math.random() * 150; }
    }
    roadCurve += (targetCurve - roadCurve) * curveSpeed;

    // --- LÓGICA DE INIMIGOS (CORREÇÃO DO SPAWN E SUMIÇO) ---
    for (let i = enemies.length - 1; i >= 0; i--) {
        let enemy = enemies[i];
        let currentV = (speed < 0) ? enemy.v * 0.4 : enemy.v;
        enemy.z -= (speed - currentV);
        
        // Se o carro for muito à frente (te passou e sumiu) ou muito atrás
        // Calibrado: Carros nascem em 4000. Só somem se passarem de 5000 (longe) ou ficarem -15000 (atrás)
        if (enemy.z > 5000 || enemy.z < -15000) {
            enemies.splice(i, 1);
            continue;
        }

        let p = 1 - (enemy.z / 4000); 
        let roadWidth = 20 + p * 550;
        let screenX = (200 - playerX * 0.05) + (roadCurve * p * p) - (playerX * p) + (enemy.lane * roadWidth * 0.5);
        
        // Colisão
        if (enemy.z > 0 && p > 0.90 && p < 1.05 && Math.abs(screenX - 200) < 45) { 
            speed = -6;
            playCrashSound();
            enemy.z += 1500; 
        }

        if (gameState === "PLAYING" || gameState === "GOAL_REACHED") {
            if (enemy.z <= 0 && !enemy.isOvertaken) { 
                carsRemaining--; passDayNow++; passTotalOdo++; enemy.isOvertaken = true; 
                if (carsRemaining <= 0 && !vitoriaTocada) { gameState = "GOAL_REACHED"; sfxVitoriaAudio.play(); vitoriaTocada = true; }
            } else if (enemy.z > 0 && enemy.isOvertaken) { 
                carsRemaining++; passDayNow = Math.max(0, passDayNow - 1); passTotalOdo = Math.max(0, passTotalOdo - 1); enemy.isOvertaken = false; 
            }
        }
        enemy.lastY = 200 + (p * 140); enemy.lastX = screenX; enemy.lastP = p;
    }

    // --- SPAWN DE INIMIGOS ---
    enemySpawnTimer--;
    if (enemySpawnTimer <= 0 && enemies.length < 10) {
        let lanes = [-0.8, -0.4, 0, 0.4, 0.8];
        enemies.push({ 
            lane: lanes[Math.floor(Math.random() * lanes.length)], 
            z: 4000, 
            v: 7 + Math.random() * 3, 
            color: ["#F0F", "#0FF", "#0F0", "#FF0", "#FFF"][Math.floor(Math.random() * 5)], 
            isOvertaken: false 
        });
        enemySpawnTimer = 100 + Math.random() * 100; 
    }

    draw(colors, isRaining, currentStage);
    if (gameTick % 300 === 0) saveProgress();
    requestAnimationFrame(update);
}

function draw(colors, isRaining, currentStage) {
    ctx.fillStyle = colors.sky; ctx.fillRect(0, 0, 400, 200);
    ctx.fillStyle = colors.grass; ctx.fillRect(0, 200, 400, 200);
    let mtShift = (roadCurve * 0.6);
    for (let i = -3; i < 9; i++) {
        let bx = (i * 100) + mtShift;
        ctx.fillStyle = colors.mt;
        ctx.beginPath(); ctx.moveTo(bx - 70, 200); ctx.lineTo(bx, 130); ctx.lineTo(bx + 70, 200); ctx.fill();
        if (colors.snowCaps) { ctx.fillStyle = "white"; ctx.beginPath(); ctx.moveTo(bx, 130); ctx.lineTo(bx - 25, 155); ctx.lineTo(bx + 25, 155); ctx.fill(); }
    }
    if (lightningAlpha > 0 && (currentStage === 3 || currentStage === 7)) { 
        ctx.fillStyle = `rgba(255, 255, 255, ${lightningAlpha})`; ctx.fillRect(0, 55, 400, 345); 
    }
    let isSnowStage = (currentStage === 1);
    for (let i = 200; i < 400; i += 4) {
        let p = (i - 200) / 140; 
        let x = (200 - playerX * 0.05) + (roadCurve * p * p) - (playerX * p);
        let w = 20 + p * 550;
        if (carsRemaining <= 0 && i > 250 && i < 265) drawFinishLine(i, w, x);
        let asp = isSnowStage ? (Math.sin(i*0.5+playerDist*0.2)>0?"#FFF":"#E0E0E0") : (Math.sin(i*0.5+playerDist*0.2)>0?(colors.nightMode?"#050505":"#333"):(colors.nightMode?"#0a0a0a":"#3d3d3d"));
        ctx.fillStyle = asp; ctx.fillRect(x - w/2, i, w, 4);
        ctx.fillStyle = Math.sin(i * 0.5 + playerDist * 0.2) > 0 ? (colors.nightMode?"#600":"red") : (colors.nightMode?"#888":"white");
        ctx.fillRect(x - w/2 - 12*p, i, 12*p, 4); ctx.fillRect(x + w/2, i, 12*p, 4); 
    }
    let hasFog = colors.fog > 0;
    enemies.sort((a,b) => b.z - a.z).forEach(e => {
        if (e.lastP > -3 && e.lastP < 0.92) drawF1Car(e.lastX, e.lastY, e.lastP * 0.85, e.color, false, colors.nightMode, hasFog, isRaining);
    });
    drawF1Car(200, 350, 0.85, "#E00", true, colors.nightMode, hasFog, isRaining); 
    enemies.forEach(e => { if (e.lastP >= 0.92) drawF1Car(e.lastX, e.lastY, e.lastP * 0.85, e.color, false, colors.nightMode, hasFog, isRaining); });
    if (colors.fog > 0) { ctx.fillStyle = `rgba(140,145,160,${colors.fog})`; ctx.fillRect(0, 55, 400, 345); }
    if (isRaining) {
        ctx.strokeStyle = "rgba(200, 210, 255, 0.51)"; ctx.lineWidth = 1.2;
        raindrops.forEach(r => { ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x + 1.5, r.y + 12); ctx.stroke(); });
    }
    ctx.fillStyle = "black"; ctx.fillRect(0, 0, 400, 55);
    ctx.fillStyle = (gameState === "GOAL_REACHED" || gameState === "WIN_DAY") ? "lime" : "yellow";
    ctx.font = "bold 18px Courier";
    ctx.fillText(gameState === "GOAL_REACHED" || gameState === "WIN_DAY" ? "GOAL OK!" : `CARS: ${carsRemaining}`, 15, 35);
    ctx.fillStyle = "yellow"; ctx.fillText(`DAY: ${dayNumber}`, 160, 35);
    ctx.fillStyle = "#444"; ctx.fillRect(260, 20, 120, 15);
    ctx.fillStyle = "lime"; ctx.fillRect(260, 20, (currentTime/DAY_DURATION) * 120, 15);
}

function updateApp() {
    navigator.serviceWorker.getRegistration().then(reg => {
        if (reg && reg.waiting) reg.waiting.postMessage('skipWaiting');
        window.location.reload();
    });
}

update();