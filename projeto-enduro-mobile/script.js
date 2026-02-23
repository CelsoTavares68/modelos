 const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 400; canvas.height = 400;

let playerX = 0, speed = 0, gameTick = 0, playerDist = 0;
let dayNumber = 1, baseGoal = 200, carsRemaining = baseGoal; 
let gameState = "PLAYING"; 
let isPaused = false;

// --- NOVO SISTEMA DE RECORDES E ODÔMETRO ---
let dayBestRecord = 0;     // Maior distância em um único dia (Persistente)
let odometerNow = 0;       // Soma de todos os dias da partida atual (Reseta no Game Over)
let totalBestRecord = 0;   // Recorde histórico máximo (Persistente)
let hasPlayedGoalMedia = false; 

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

// --- FREIO E CONTROLE ---
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
sfxTrovao.volume = 0.7;
const sfxDerrota = new Audio('game_over.mp3');
const sfxVitoriaAudio = new Audio('vitoria.mp3');

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

// --- PERSISTÊNCIA ATUALIZADA ---
function saveProgress() {
    const data = { 
        dayNumber, carsRemaining, playerDist, currentTime,
        odometerNow, dayBestRecord, totalBestRecord 
    };
    localStorage.setItem('enduro_save_v3', JSON.stringify(data));
}

function loadProgress() {
    const saved = localStorage.getItem('enduro_save_v3');
    if (saved) {
        const data = JSON.parse(saved);
        dayNumber = data.dayNumber || 1;
        carsRemaining = data.carsRemaining || 200;
        playerDist = data.playerDist || 0;
        currentTime = data.currentTime || 0;
        odometerNow = data.odometerNow || 0;
        dayBestRecord = data.dayBestRecord || 0;
        totalBestRecord = data.totalBestRecord || 0;
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
        if (isPaused) sfxChuva.pause();
        if (!isPaused) { audioCtx.resume(); update(); }
    }
}

function resetGame() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    dayNumber = 1; baseGoal = 200; isPaused = false;
    odometerNow = 0; // Reseta odômetro da partida, mas mantém recordes
    resetDay();
    if (gameState !== "PLAYING") { gameState = "PLAYING"; update(); }
}

function resetDay() {
    currentTime = 0; playerDist = 0; speed = 0; enemies = [];
    carsRemaining = baseGoal + (dayNumber - 1) * 10; 
    gameState = "PLAYING"; isPaused = false;
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

    // 1. Definição do estágio e clima
    let currentStage = Math.min(Math.floor(currentTime / STAGE_DURATION), 8);
    let isRaining = (currentStage === 3 || currentStage === 7);
    let warningLightning = (currentStage === 2); 

    // Verificação de Estado de Jogo (Vitória ou Derrota)
    if (gameState === "WIN_DAY" || gameState === "GAME_OVER") { 
        sfxChuva.pause();
        draw(getColors(currentStage), isRaining); 
        requestAnimationFrame(update); 
        return; 
    }

    gameTick++; 
    currentTime++; 

    // 2. LÓGICA DE DISTÂNCIA E RECORDES (O que você pediu)
    if (speed > 0) {
        let delta = (speed / 10);
        playerDist += delta;      // Distância do dia atual
        odometerNow += delta;     // Acumulado da partida (Odômetro)
    }

    // Atualiza os valores lógicos dos recordes
    if (playerDist > dayBestRecord) dayBestRecord = playerDist;
    if (odometerNow > totalBestRecord) totalBestRecord = odometerNow;

    // ATUALIZAÇÃO DA UI (HTML)
    // Usamos ?. para evitar erro caso o elemento não exista na tela ainda
    const uiDist = document.getElementById('ui-dist');
    const uiDayBest = document.getElementById('ui-day-best');
    const uiTotalNow = document.getElementById('ui-total-now');
    const uiTotalBest = document.getElementById('ui-total-best');
    
    if(uiDist) uiDist.innerText = (playerDist / 100).toFixed(1) + " KM";
    if(uiDayBest) uiDayBest.innerText = (dayBestRecord / 100).toFixed(1) + " KM";
    if(uiTotalNow) uiTotalNow.innerText = (odometerNow / 100).toFixed(1) + " KM";
    if(uiTotalBest) uiTotalBest.innerText = (totalBestRecord / 100).toFixed(1) + " KM";

    // 3. Sons e Clima
    if (gameTick % 4 === 0) playEngineSound();

    if (isRaining || warningLightning) {
        if (isRaining && sfxChuva.paused && audioCtx.state === 'running') {
            sfxChuva.play().catch(e => {}); 
        }
        if (Math.random() > 0.996) { 
            lightningAlpha = 0.7; 
            if (isRaining && audioCtx.state === 'running') sfxTrovao.play().catch(e => {});
        }
    } else {
        sfxChuva.pause();
    }

    if (isRaining) {
        for (let i = 0; i < 12; i++) {
            raindrops.push({ x: Math.random() * 400, y: -20, s: Math.random() * 10 + 22 });
        }
    }
    raindrops.forEach((r, i) => { 
        r.y += r.s; 
        if (r.y > 400) raindrops.splice(i, 1); 
    });
    
    if (lightningAlpha > 0) lightningAlpha -= 0.05;

    // 4. Verificação de Metas (Bandeirada)
    if (carsRemaining <= 0 && !hasPlayedGoalMedia) {
        hasPlayedGoalMedia = true;
        carsRemaining = 0;
        gameState = "GOAL_REACHED";
        if (typeof sfxVitoriaAudio !== 'undefined') sfxVitoriaAudio.play().catch(e => {});
        videoVitoria.style.display = 'block';
        videoVitoria.play().catch(e => {});
        setTimeout(() => { videoVitoria.style.display = 'none'; }, 4000);
    }

    // Fim do Dia
    if (currentTime >= DAY_DURATION) {
        if (gameState === "GOAL_REACHED" || carsRemaining <= 0) {
            if (gameState !== "WIN_DAY") { 
                gameState = "WIN_DAY"; 
                dayNumber++; 
                saveProgress();
                setTimeout(() => { resetDay(); }, 4000); 
            }
        } else { 
            if (gameState !== "GAME_OVER") { 
                gameState = "GAME_OVER"; 
                if (typeof sfxDerrota !== 'undefined') sfxDerrota.play();
                videoDerrota.style.display = 'block'; 
                videoDerrota.play().catch(e => {});
                saveProgress();
            }
        }
        currentTime = DAY_DURATION - 1; 
    }

    // 5. Física de Movimento e Curvas
    let offRoad = Math.abs(playerX) > 380;
    if (keys.ArrowLeft) leftPressTime++; else leftPressTime = 0;
    if (keys.ArrowRight) rightPressTime++; else rightPressTime = 0;

    let isBraking = (leftPressTime > 60 || rightPressTime > 60 || keys.ArrowDown); 
    
    if (isBraking) {
        speed = Math.max(speed - 0.15, 0); 
    } else {
        if (offRoad) speed = Math.min(speed + 0.01, 2); 
        else speed = Math.min(speed + ((speed < 5) ? 0.02 : 0.06), maxSpeed);
    }

    playerX -= (roadCurve * 0.06) * (speed / maxSpeed); 
    if (keys.ArrowLeft) playerX -= 4.8;
    if (keys.ArrowRight) playerX += 4.8;
    playerX = Math.max(-480, Math.min(480, playerX));

    if (--curveTimer <= 0) { 
        if (Math.random() > 0.6) { targetCurve = 0; curveTimer = 100 + Math.random() * 200; }
        else { targetCurve = (Math.random() - 0.5) * 160; curveTimer = 80 + Math.random() * 150; }
    }
    roadCurve += (targetCurve - roadCurve) * curveSpeed;

    // 6. Inimigos e Colisão
    enemies.forEach((enemy) => {
        let effectiveEnemySpeed = (speed < 15) ? 15 : enemy.v; 
        enemy.z -= (speed - effectiveEnemySpeed);
        
        let p = 1 - (enemy.z / 4000); 
        let roadWidth = 20 + p * 800;
        let screenX = (200 - playerX * 0.05) + (roadCurve * p * p) - (playerX * p) + (enemy.lane * roadWidth * 0.5);
        
        // Detecção de Colisão
        if (p > 0.92 && p < 1.05 && Math.abs(screenX - 200) < 50) { 
            speed = -4; 
            enemy.z += 800; 
            playCrashSound(); 
        }

        // Contagem de ultrapassagem
        if (gameState === "PLAYING" || gameState === "GOAL_REACHED") {
            if (enemy.z <= 0 && !enemy.isOvertaken) { 
                carsRemaining--; 
                enemy.isOvertaken = true; 
            }
        }
        
        enemy.lastY = 200 + (p * 140); 
        enemy.lastX = screenX; 
        enemy.lastP = p;
    });

    // Gerar novos inimigos
    if (gameTick % 250 === 0 && enemies.length < 100) {
        enemies.push({ 
            lane: (Math.random() - 0.5) * 1.8, 
            z: 4000, 
            v: 11.5, 
            color: ["#F0F", "#0FF", "#0F0", "#FF0"][Math.floor(Math.random() * 4)],
            isOvertaken: false 
        });
    }

    enemies = enemies.filter(e => e.z > -15000 && e.z < 6000);

    // 7. Renderização final
    draw(getColors(currentStage), isRaining);
    saveProgress();
    requestAnimationFrame(update);
}

// Função auxiliar para pegar as cores (certifique-se de que as variáveis batem com as suas)
function getColors(stage) {
    let c = { sky: "#87CEEB", grass: "#1a7a1a", fog: 0, mt: "#555", nightMode: false, snowCaps: false };
    switch(stage) {
        case 0: c.snowCaps = true; break; 
        case 1: c.sky = "#DDD"; c.grass = "#FFF"; c.mt = "#999"; c.snowCaps = true; break; 
        case 2: c.sky = "#ff8c00"; c.grass = "#145c14"; c.mt = "#442200"; break; 
        case 3: c.sky = "#2c3e50"; c.grass = "#0a2a0a"; c.mt = "#1a1a1a"; c.fog = 0.6; break; 
        case 4: c.sky = "#111144"; c.grass = "#001100"; c.mt = "#111"; c.nightMode = true; break; 
        case 5: c.sky = "#000011"; c.grass = "#000000"; c.mt = "#111"; c.fog = 0.9; c.nightMode = true; break; 
        case 6: c.sky = "#111144"; c.grass = "#001100"; c.mt = "#111"; c.nightMode = true; break; 
        case 7: c.sky = "#2c3e50"; c.grass = "#0a2a0a"; c.mt = "#1a1a1a"; c.fog = 0.6; break; 
        case 8: c.sky = "#ade1f2"; c.grass = "#1a7a1a"; c.mt = "#555"; c.snowCaps = true; break; 
    }
    return c;
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
    
    drawF1Car(200, 350, 0.85, "#E00", true, colors.nightMode, hasFog, isRaining); 
    
    enemies.forEach(e => {
        if (e.lastP >= 0.92) drawF1Car(e.lastX, e.lastY, e.lastP * 0.85, e.color, false, colors.nightMode, hasFog, isRaining);
    });

    if (colors.fog > 0) { ctx.fillStyle = `rgba(140,145,160,${colors.fog})`; ctx.fillRect(0, 55, 400, 345); }
    if (isRaining) {
        ctx.strokeStyle = "rgba(200, 210, 255, 0.51)"; ctx.lineWidth = 1.2;
        raindrops.forEach(r => { ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x + 1.5, r.y + 12); ctx.stroke(); });
    }
    if (lightningAlpha > 0) { ctx.fillStyle = `rgba(255, 255, 255, ${lightningAlpha})`; ctx.fillRect(0, 55, 400, 345); }

    ctx.fillStyle = "black"; ctx.fillRect(0, 0, 400, 55);
    ctx.fillStyle = (gameState === "GOAL_REACHED" || gameState === "WIN_DAY") ? "lime" : "yellow";
    ctx.font = "bold 18px Courier";
    ctx.fillText(gameState === "GOAL_REACHED" || gameState === "WIN_DAY" ? "GOAL OK!" : `CARS: ${carsRemaining}`, 15, 35);
    ctx.fillStyle = "yellow"; ctx.fillText(`DAY: ${dayNumber}`, 160, 35);
    ctx.fillStyle = "#444"; ctx.fillRect(260, 20, 120, 15);
    ctx.fillStyle = "lime"; ctx.fillRect(260, 20, (currentTime/DAY_DURATION) * 120, 15);

    if (gameState === "WIN_DAY") {
        ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(0, 55, 400, 345);
        ctx.fillStyle = "lime"; ctx.textAlign = "center";
        ctx.font = "bold 25px Courier"; ctx.fillText(`DIA ${dayNumber-1} COMPLETO!`, 200, 180);
        ctx.textAlign = "left";
    }
}

update();