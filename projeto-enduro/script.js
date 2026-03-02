 const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 400; canvas.height = 400;

let playerX = 0, speed = 0, gameTick = 0, playerDist = 0;
let dayNumber = 1, baseGoal = 200, carsRemaining = baseGoal;
let gameState = "PLAYING"; 
let isPaused = false;

// --- SISTEMA DE RECORDES ---
let dayBestRecord = 0;     
let odometerNow = 0;       
let totalBestRecord = 0;   
let hasPlayedGoalMedia = false; 

let totalPasses = 0;           
let totalPassesOdometer = 0;   
let dayPassesBest = 0;         
let totalPassesBest = 0;       

// --- CONFIGURAÇÕES DE VELOCIDADE E TEMPO ---
const maxSpeed = 16; 
const STAGE_DURATION = 7200; 
const DAY_DURATION = STAGE_DURATION * 9; 
let currentTime = 0; 

let enemies = [];

// --- SISTEMA DE CURVAS ---
let roadCurve = 0;      
let targetCurve = 0;    
let curveTimer = 0;     
let curveSpeed = 0.015; 

// --- CLIMA E PARTÍCULAS ---
let raindrops = []; 
let lightningAlpha = 0; 

// --- SONS ---
const sfxChuva = new Audio('chuva.mp3');
sfxChuva.loop = true;
sfxChuva.volume = 0.5; 
const sfxTrovao = new Audio('trovao.mp3');
sfxTrovao.volume = 0.7;
const sfxDerrota = new Audio('game_over.mp3');
const sfxVitoriaAudio = new Audio('vitoria.mp3');

// --- PERSISTÊNCIA ---
function saveProgress() {
    const gameData = {
        dayNumber: dayNumber,
        carsRemaining: carsRemaining,
        playerDist: playerDist,
        currentTime: currentTime,
        odometerNow: odometerNow,
        dayBestRecord: dayBestRecord,
        totalBestRecord: totalBestRecord,
        hasPlayedGoalMedia: hasPlayedGoalMedia,
        dayPassesBest: dayPassesBest,
        totalPassesBest: totalPassesBest,
        totalPassesOdometer: totalPassesOdometer 
    };
    localStorage.setItem('enduro_pro_data', JSON.stringify(gameData));
}

function loadProgress() {
    const savedData = localStorage.getItem('enduro_pro_data');
    if (savedData) {
        const data = JSON.parse(savedData);
        dayNumber = data.dayNumber;
        carsRemaining = data.carsRemaining;
        playerDist = data.playerDist;
        currentTime = data.currentTime;
        odometerNow = data.odometerNow || 0;
        dayBestRecord = data.dayBestRecord || 0;
        totalBestRecord = data.totalBestRecord || 0;
        hasPlayedGoalMedia = data.hasPlayedGoalMedia || false;
        dayPassesBest = data.dayPassesBest || 0;
        totalPassesBest = data.totalPassesBest || 0;
        totalPassesOdometer = data.totalPassesOdometer || 0;
    }
}
loadProgress();

const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };
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
    if (gameState === "PLAYING") {
        isPaused = !isPaused;
        const btn = document.getElementById('pauseBtn');
        if (btn) btn.innerText = isPaused ? "Retomar" : "Pausar";
        if (isPaused) { 
            sfxChuva.pause(); 
            saveProgress(); 
        } else { 
            audioCtx.resume(); 
            update(); 
        }
    }
}

function resetGame() {
    dayNumber = 1; 
    baseGoal = 200; 
    odometerNow = 0; 
    totalPassesOdometer = 0; 
    resetDay();
    if (gameState !== "PLAYING") { gameState = "PLAYING"; update(); }
}

function resetDay() {
    currentTime = 0; 
    playerDist = 0; 
    speed = 0; 
    enemies = [];
    totalPasses = 0; 
    
    // Vídeos removidos daqui

    carsRemaining = 200 + ((dayNumber - 1) * 10);
    gameState = "PLAYING"; 
    isPaused = false;
    hasPlayedGoalMedia = false;
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
    let warningLightning = (currentStage === 2); 

    let colors = { sky: "#87CEEB", grass: "#1a7a1a", fog: 0, mt: "#555", nightMode: false, snowCaps: false };
    switch(currentStage) {
        case 0: colors.snowCaps = true; break; 
        case 1: colors.sky = "#DDD"; colors.grass = "#FFF"; colors.mt = "#999"; colors.snowCaps = true; break; 
        case 2: colors.sky = "#ff8c00"; colors.grass = "#145c14"; colors.mt = "#442200"; break; 
        case 3: colors.sky = "#2c3e50"; colors.grass = "#0a2a0a"; colors.mt = "#1a1a1a"; colors.fog = 0.6; break; 
        case 4: colors.sky = "#0d0d0e"; colors.grass = "#080808"; colors.mt = "#111"; colors.nightMode = true; break; 
        case 5: colors.sky = "#000011"; colors.grass = "#000800"; colors.mt = "#000"; colors.fog = 0.8; colors.nightMode = true; break; 
        case 6: colors.sky = "#000011"; colors.grass = "#000800"; colors.mt = "#000"; colors.nightMode = true; break; 
        case 7: colors.sky = "#2c3e50"; colors.grass = "#0a2a0a"; colors.mt = "#1a1a1a"; colors.fog = 0.6; break; 
        case 8: colors.sky = "#ade1f2"; colors.grass = "#1a7a1a"; colors.mt = "#555"; colors.snowCaps = true; break; 
    }

    if (gameState === "WIN_DAY" || gameState === "GAME_OVER") { 
        sfxChuva.pause();
        draw(colors, isRaining); 
        requestAnimationFrame(update); 
        return; 
    }

    gameTick++; 
    if (speed > 0) {
        let delta = (speed / 10);
        playerDist += delta;
        odometerNow += delta; 
    }
    currentTime++; 
    if (gameTick % 4 === 0) playEngineSound();
    
    if (playerDist > dayBestRecord) dayBestRecord = playerDist;
    if (odometerNow > totalBestRecord) totalBestRecord = odometerNow;

    const uiDist = document.getElementById('ui-dist');
    const uiDayBest = document.getElementById('ui-day-best');
    const uiTotalNow = document.getElementById('ui-total-now');
    const uiTotalBest = document.getElementById('ui-total-best');
    const uiPasses = document.getElementById('ui-passes');
    const uiPassesDay = document.getElementById('ui-passes-day-best');
    const uiPassesTotal = document.getElementById('ui-passes-total-best');
    const uiOdoPassesNow = document.getElementById('ui-total-passes-now'); 
    
    if(uiDist) uiDist.innerText = (playerDist / 100).toFixed(1);
    if(uiDayBest) uiDayBest.innerText = (dayBestRecord / 100).toFixed(1);
    if(uiTotalNow) uiTotalNow.innerText = (odometerNow / 100).toFixed(1);
    if(uiTotalBest) uiTotalBest.innerText = (totalBestRecord / 100).toFixed(1);
    if(uiPasses) uiPasses.innerText = totalPasses;
    if(uiPassesDay) uiPassesDay.innerText = dayPassesBest;
    if(uiPassesTotal) uiPassesTotal.innerText = totalPassesBest;
    if(uiOdoPassesNow) uiOdoPassesNow.innerText = totalPassesOdometer; 

    if (gameTick % 300 === 0) saveProgress();

    if (isRaining || warningLightning) {
        if (isRaining && sfxChuva.paused && audioCtx.state === 'running') sfxChuva.play().catch(e => {}); 
        if (Math.random() > 0.996) { 
            lightningAlpha = 0.7; 
            if (audioCtx.state === 'running') {
                sfxTrovao.volume = warningLightning ? 0.15 : 0.7;
                sfxTrovao.play().catch(e => {});
            }
        }
    } else { sfxChuva.pause(); }

    if (isRaining) {
        for (let i = 0; i < 12; i++) raindrops.push({ x: Math.random() * 400, y: -20, s: Math.random() * 10 + 22 });
    }
    raindrops.forEach((r, i) => { r.y += r.s; if (r.y > 400) raindrops.splice(i, 1); });
    if (lightningAlpha > 0) lightningAlpha -= 0.05;

    if (carsRemaining <= 0 && !hasPlayedGoalMedia) {
        hasPlayedGoalMedia = true;
        carsRemaining = 0; 
        sfxVitoriaAudio.play().catch(e => {});
        // Vídeo de vitória removido daqui
    }

     if (currentTime >= DAY_DURATION) {
        if (carsRemaining <= 0) {
            if (gameState !== "WIN_DAY") { 
                gameState = "WIN_DAY"; 
                dayNumber++; 
                baseGoal = 200 + ((dayNumber - 1) * 10);
                saveProgress();
                setTimeout(() => { resetDay(); }, 4000); 
            }
        } else { 
            if (gameState !== "GAME_OVER") { 
                gameState = "GAME_OVER"; 
                sfxDerrota.play().catch(e => {});
                // Vídeo de derrota removido daqui
                saveProgress(); 
            }
        }
        currentTime = DAY_DURATION - 1; 
    }

    let offRoad = Math.abs(playerX) > 380;
    if (keys.ArrowUp) {
        let accel = (speed < 5) ? 0.015 : 0.08; 
        speed = Math.min(speed + accel, offRoad ? 2 : maxSpeed);
    } else if (keys.ArrowDown) {
        speed = Math.max(speed - 0.2, 0); 
    } else {
        speed = Math.max(speed - 0.05, 0); 
    }

    playerX -= (roadCurve * 0.06) * (speed / maxSpeed); 
    if (keys.ArrowLeft) playerX -= 5;
    if (keys.ArrowRight) playerX += 5;
    playerX = Math.max(-480, Math.min(480, playerX));

    if (--curveTimer <= 0) { 
        if (Math.random() > 0.6) { targetCurve = 0; curveTimer = 100 + Math.random() * 200; }
        else { targetCurve = (Math.random() - 0.5) * 160; curveTimer = 80 + Math.random() * 150; }
    }
    roadCurve += (targetCurve - roadCurve) * curveSpeed;

    enemies.forEach((enemy) => {
        let effectiveEnemySpeed = (speed < 15) ? 15 : enemy.v; 
        enemy.z -= (speed - effectiveEnemySpeed);
        let p = 1 - (enemy.z / 4000); 
        let roadWidth = 20 + p * 800;
        let screenX = (200 - playerX * 0.05) + (roadCurve * p * p) - (playerX * p) + (enemy.lane * roadWidth * 0.5);
        
        if (p > 0.92 && p < 1.05 && Math.abs(screenX - 200) < 50) { 
             speed = -4; enemy.z += (maxSpeed * 120); playCrashSound();
        }
        
        if (p > 1.0 && !enemy.isOvertaken) { 
            enemy.isOvertaken = true;
            totalPasses++;         
            totalPassesOdometer++; 
            if (totalPasses > dayPassesBest) dayPassesBest = totalPasses;
            if (totalPassesOdometer > totalPassesBest) totalPassesBest = totalPassesOdometer;
            if (!hasPlayedGoalMedia) carsRemaining--; 
        } 
        
        if (p < 1.0 && enemy.isOvertaken) { 
            enemy.isOvertaken = false;
            totalPasses = Math.max(0, totalPasses - 1);
            totalPassesOdometer = Math.max(0, totalPassesOdometer - 1);
            if (!hasPlayedGoalMedia) carsRemaining++; 
        }

        enemy.lastY = 200 + (p * 140); enemy.lastX = screenX; enemy.lastP = p;
    });

    if (gameTick % 240 === 0 && enemies.length < 100) {
        enemies.push({ 
            lane: (Math.random() - 0.5) * 1.8, 
            z: 4000, 
            v: 10.0, 
            color: ["#F0F", "#0FF", "#0F0", "#FF0"][Math.floor(Math.random() * 4)],
            isOvertaken: false 
        });
    }

    if (gameTick % 240 === 75 && enemies.length < 100) {
        enemies.push({ 
            lane: (Math.random() - 0.5) * 1.8, 
            z: 4000, 
            v: 10.0, 
            color: ["#F0F", "#0FF", "#0F0", "#FF0"][Math.floor(Math.random() * 4)],
            isOvertaken: false 
        });
    }

    enemies = enemies.filter(e => e.z > -21800 && e.z < 6000);
    draw(colors, isRaining);
    requestAnimationFrame(update);
}

function draw(colors, isRaining) {
    ctx.fillStyle = colors.sky; ctx.fillRect(0, 0, 400, 200);
    ctx.fillStyle = colors.grass; ctx.fillRect(0, 200, 400, 200);
    
    let mtShift = (roadCurve * 0.6);
    for (let i = -3; i < 9; i++) {
        let bx = (i * 100) + mtShift;
        ctx.fillStyle = colors.mt;
        ctx.beginPath(); ctx.moveTo(bx - 70, 200); ctx.lineTo(bx, 130); ctx.lineTo(bx + 70, 200); ctx.fill();
        if (colors.snowCaps) { ctx.fillStyle = "white"; ctx.beginPath(); ctx.moveTo(bx, 130); ctx.lineTo(bx - 25, 155); ctx.lineTo(bx + 25, 155); ctx.fill(); }
    }

    for (let i = 200; i < 400; i += 4) {
        let p = (i - 200) / 140; 
        let x = (200 - playerX * 0.05) + (roadCurve * p * p) - (playerX * p);
        let w = 20 + p * 800;
        let asphaltColor1 = colors.nightMode ? "#050505" : "#333"; 
        let asphaltColor2 = colors.nightMode ? "#0a0a0a" : "#3d3d3d";
        ctx.fillStyle = Math.sin(i * 0.5 + playerDist * 0.2) > 0 ? asphaltColor1 : asphaltColor2;
        ctx.fillRect(x - w/2, i, w, 4);
        let curbColor1 = colors.nightMode ? "#600" : "red";
        let curbColor2 = colors.nightMode ? "#888" : "white";
        ctx.fillStyle = Math.sin(i * 0.5 + playerDist * 0.2) > 0 ? curbColor1 : curbColor2;
        ctx.fillRect(x - w/2 - 12*p, i, 12*p, 4);
        ctx.fillRect(x + w/2, i, 12*p, 4); 
    }

    let hasFog = colors.fog > 0;
    enemies.sort((a,b) => b.z - a.z).forEach(e => {
        if (e.lastP > 0 && e.lastP < 0.92) drawF1Car(e.lastX, e.lastY, e.lastP * 0.85, e.color, false, colors.nightMode, hasFog, isRaining);
    });
    
    drawF1Car(200, 350, 0.85, "#E00", true, colors.nightMode, hasFog, isRainy); 
    
    enemies.forEach(e => {
        if (e.lastP >= 0.92) drawF1Car(e.lastX, e.lastY, e.lastP * 0.85, e.color, false, colors.nightMode, hasFog, isRaining);
    });

    if (colors.fog > 0) { ctx.fillStyle = `rgba(140,145,160,${colors.fog})`; ctx.fillRect(0, 55, 400, 345); }
    if (isRaining) {
        ctx.strokeStyle = "rgba(200, 210, 255, 0.49)"; ctx.lineWidth = 1.2;
        raindrops.forEach(r => { ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x + 1.5, r.y + 12); ctx.stroke(); });
    }
    if (lightningAlpha > 0) { ctx.fillStyle = `rgba(255, 255, 255, ${lightningAlpha})`; ctx.fillRect(0, 55, 400, 345); }

    ctx.fillStyle = "black"; ctx.fillRect(0, 0, 400, 55);
    ctx.fillStyle = (hasPlayedGoalMedia) ? "lime" : "yellow";
    ctx.font = "bold 18px Courier";
    let carText = (hasPlayedGoalMedia) ? "CARS: 000" : `CARS: ${carsRemaining}`;
    ctx.fillText(carText, 15, 35);
    ctx.fillStyle = "yellow"; ctx.fillText(`DAY: ${dayNumber}`, 180, 35);
    ctx.fillStyle = "#444"; ctx.fillRect(280, 20, 100, 15);
    ctx.fillStyle = "lime"; ctx.fillRect(280, 20, (currentTime/DAY_DURATION) * 100, 15);

    if (gameState === "WIN_DAY") {
        ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(0, 55, 400, 345);
        ctx.fillStyle = "lime"; ctx.textAlign = "center";
        ctx.font = "bold 25px Courier"; ctx.fillText(`DIA ${dayNumber-1} COMPLETO!`, 200, 180);
        ctx.textAlign = "left";
    }
}

update();