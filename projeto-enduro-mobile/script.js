 const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 400; canvas.height = 400;

let playerX = 0, speed = 0, gameTick = 0, playerDist = 0;
let dayNumber = 1, baseGoal = 200, carsRemaining = baseGoal; 
let gameState = "PLAYING"; 
let isPaused = false;

const maxSpeed = 12; 
const STAGE_DURATION = 12800; 
const DAY_DURATION = STAGE_DURATION * 9; 
let currentTime = 0; 

let enemies = [];
let roadCurve = 0, targetCurve = 0, curveTimer = 0;

// --- CLIMA: CHUVA E RELÂMPAGOS ---
let raindrops = []; 
let lightningAlpha = 0; 

// --- SONS ---
const sfxChuva = new Audio('chuva.mp3');
sfxChuva.loop = true;
sfxChuva.volume = 0.5; 
const sfxTrovao = new Audio('trovao.mp3');
sfxTrovao.volume = 0.7;

// --- NOVOS ELEMENTOS DE MÍDIA (CORRIGIDOS COM Z-INDEX) ---
const videoVitoria = document.createElement('video');
videoVitoria.src = 'bandeira_vitoria.mp4';
videoVitoria.style.position = 'absolute';
videoVitoria.style.top = '55px';
videoVitoria.style.left = '0';
videoVitoria.style.width = '400px';
videoVitoria.style.height = '345px';
videoVitoria.style.display = 'none';
videoVitoria.style.zIndex = '10'; // Garante que fica na frente do canvas
videoVitoria.muted = true; // Ajuda no autoplay do navegador
videoVitoria.load();
document.body.appendChild(videoVitoria);

const videoDerrota = document.createElement('video');
videoDerrota.src = 'game_over.mp4';
videoDerrota.style.position = 'absolute';
videoDerrota.style.top = '55px';
videoDerrota.style.left = '0';
videoDerrota.style.width = '400px';
videoDerrota.style.height = '345px';
videoDerrota.style.display = 'none';
videoDerrota.style.zIndex = '10';
videoDerrota.muted = true;
videoDerrota.load();
document.body.appendChild(videoDerrota);

const sfxDerrota = new Audio('game_over.mp3');
const sfxVitoriaAudio = new Audio('vitoria.mp3');

const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };

// --- SISTEMA DE SAVE ---
function saveProgress() {
    const data = { dayNumber, carsRemaining, playerDist, currentTime };
    localStorage.setItem('enduro_save', JSON.stringify(data));
}

function loadProgress() {
    const saved = localStorage.getItem('enduro_save');
    if (saved) {
        const data = JSON.parse(saved);
        dayNumber = data.dayNumber;
        carsRemaining = data.carsRemaining;
        playerDist = data.playerDist;
        currentTime = data.currentTime;
    }
}
loadProgress();

// --- EVENTOS DE TECLADO ---
window.addEventListener('keydown', e => { 
    if (keys.hasOwnProperty(e.code)) keys[e.code] = true; 
    if (audioCtx.state === 'suspended') audioCtx.resume();
});
window.addEventListener('keyup', e => { if (keys.hasOwnProperty(e.code)) keys[e.code] = false; });

// --- CONTROLES MOBILE (MANTIDOS CONFORME O ORIGINAL) ---
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
    localStorage.removeItem('enduro_save');
    resetDay();
    if (gameState !== "PLAYING") { gameState = "PLAYING"; update(); }
}

function resetDay() {
    currentTime = 0; playerDist = 0; speed = 0; enemies = [];
    carsRemaining = baseGoal + (dayNumber - 1) * 10; 
    gameState = "PLAYING";
    isPaused = false;
    if (sfxChuva) { sfxChuva.pause(); sfxChuva.currentTime = 0; }
    saveProgress();
}

// --- DESENHO DO CARRO COM LANTERNAS MELHORADAS ---
function drawF1Car(x, y, scale, color, isPlayer = false, nightMode = false) {
    let s = scale * 1.2;
    if (s < 0.02 || s > 30) return;
    let w = 45 * s; let h = 22 * s;
    ctx.save();
    ctx.translate(x, y);
    if(isPlayer) ctx.rotate((roadCurve / 40) * Math.PI / 180);
    
    let carColor = nightMode ? "#000" : color;

    if (nightMode) {
        // LANTERNAS TRASEIRAS COM BRILHO
        ctx.fillStyle = "#FF0000";
        ctx.shadowBlur = 10 * s;
        ctx.shadowColor = "red";
        ctx.fillRect(-w * 0.4, h * 0.4, w * 0.15, h * 0.15);
        ctx.fillRect(w * 0.25, h * 0.4, w * 0.15, h * 0.15);
        ctx.shadowBlur = 0;

        // FAROL (Ajustado comprimento)
        let lightLength = h * 4.5;
        let gradient = ctx.createLinearGradient(0, 0, 0, -lightLength);
        gradient.addColorStop(0, "rgba(255, 255, 200, 0.7)");
        gradient.addColorStop(1, "rgba(255, 255, 200, 0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(-w * 0.2, 0); ctx.lineTo(-w * 1.3, -lightLength);
        ctx.lineTo(w * 1.3, -lightLength); ctx.lineTo(w * 0.2, 0);
        ctx.fill();
    }

    ctx.fillStyle = "#111"; // Rodas
    ctx.fillRect(-w * 0.5, -h * 0.1, w * 0.25, h * 0.8);
    ctx.fillRect(w * 0.25, -h * 0.1, w * 0.25, h * 0.8);

    ctx.fillStyle = carColor; // Corpo
    ctx.fillRect(-w * 0.25, h * 0.1, w * 0.5, h * 0.4); 
    ctx.fillRect(-w * 0.5, -h * 0.3, w, h * 0.2); 
    
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
        case 2: colors.sky = "#ff8c00"; colors.grass = "#145c14"; colors.mt = "#442200"; break; 
        case 3: colors.sky = "#2c3e50"; colors.grass = "#0a2a0a"; colors.mt = "#1a1a1a"; colors.fog = 0.6; break; 
        case 4: colors.sky = "#111144"; colors.grass = "#001100"; colors.mt = "#111"; colors.nightMode = true; break; 
        case 5: colors.sky = "#444"; colors.grass = "#333"; colors.mt = "#222"; colors.fog = 0.95; colors.nightMode = true; break; 
        case 6: colors.sky = "#000011"; colors.grass = "#000800"; colors.mt = "#000"; colors.nightMode = true; break; 
        case 7: colors.sky = "#34495e"; colors.grass = "#0d4d0d"; colors.mt = "#1a1a1a"; colors.fog = 0.7; break; 
        case 8: colors.sky = "#ade1f2"; colors.grass = "#1a7a1a"; colors.mt = "#555"; colors.snowCaps = true; break; 
    }

    if (gameState === "WIN_DAY" || gameState === "GAME_OVER") { 
        sfxChuva.pause();
        draw(colors, isRaining); 
        requestAnimationFrame(update); 
        return; 
    }

    gameTick++; playerDist += speed; currentTime++; 
    if (gameTick % 4 === 0) playEngineSound();
    if (gameTick % 60 === 0) saveProgress();

    if (isRaining) {
        if (sfxChuva.paused && audioCtx.state === 'running') sfxChuva.play().catch(e => {}); 
        for (let i = 0; i < 12; i++) raindrops.push({ x: Math.random() * 400, y: -20, s: Math.random() * 10 + 22 });
        if (Math.random() > 0.996) { 
            lightningAlpha = 0.7; 
            sfxTrovao.currentTime = 0;
            if (audioCtx.state === 'running') sfxTrovao.play().catch(e => {});
        }
    } else { sfxChuva.pause(); }

    raindrops.forEach((r, i) => { r.y += r.s; if (r.y > 400) raindrops.splice(i, 1); });
    if (lightningAlpha > 0) lightningAlpha -= 0.05;

    if (currentTime >= DAY_DURATION) {
        if (gameState === "GOAL_REACHED" || carsRemaining <= 0) {
            if (gameState !== "WIN_DAY") { 
                gameState = "WIN_DAY"; 
                sfxVitoriaAudio.play();
                videoVitoria.style.display = 'block';
                videoVitoria.play().catch(e => console.log("Erro video", e));
                dayNumber++; 
                setTimeout(() => { 
                    videoVitoria.style.display = 'none'; videoVitoria.pause();
                    resetDay(); 
                }, 4000); 
            }
        } else { 
            if (gameState !== "GAME_OVER") { 
                gameState = "GAME_OVER"; 
                sfxDerrota.play();
                videoDerrota.style.display = 'block';
                videoDerrota.play().catch(e => console.log("Erro video", e));
                localStorage.removeItem('enduro_save'); 
            }
        }
        currentTime = DAY_DURATION - 1; 
    }

    let offRoad = Math.abs(playerX) > 380;
    if (offRoad) speed = Math.min(speed + 0.01, 2); 
    else speed = Math.min(speed + ((speed < 5) ? 0.02 : 0.06), maxSpeed);
    
    if (keys.ArrowDown) speed = Math.max(speed - 0.2, 0);

    playerX -= (roadCurve / 35) * (speed / maxSpeed); 
    if (keys.ArrowLeft) playerX -= 4.5;
    if (keys.ArrowRight) playerX += 4.5;

    if (--curveTimer <= 0) { targetCurve = (Math.random() - 0.5) * 160; curveTimer = 120; }
    roadCurve += (targetCurve - roadCurve) * 0.02;

    if (gameTick % 150 === 0 && enemies.length < 100) {
        if (!enemies.some(e => e.z > 3000)) {
            enemies.push({ 
                lane: (Math.random() - 0.5) * 1.8, z: 4000, v: 8.5, 
                color: ["#F0F", "#0FF", "#0F0", "#FF0"][Math.floor(Math.random() * 4)],
                isOvertaken: false 
            });
        }
    }

    enemies.forEach((enemy) => {
        enemy.z -= (speed - enemy.v);
        let p = 1 - (enemy.z / 4000); 
        let roadWidth = 20 + p * 800;
        let screenX = (200 - playerX * 0.05) + (roadCurve * p * p) - (playerX * p) + (enemy.lane * roadWidth * 0.5);
        if (p > 0.92 && p < 1.05 && Math.abs(screenX - 200) < 50) { speed = -3; enemy.z += 800; playCrashSound(); }
        if (gameState === "PLAYING" || gameState === "GOAL_REACHED") {
            if (enemy.z <= 0 && !enemy.isOvertaken) { carsRemaining--; enemy.isOvertaken = true; }
            if (enemy.z > 0 && enemy.isOvertaken) { carsRemaining++; enemy.isOvertaken = false; }
            if (carsRemaining <= 0) { carsRemaining = 0; gameState = "GOAL_REACHED"; }
        }
        enemy.lastY = 200 + (p * 140); enemy.lastX = screenX; enemy.lastP = p;
    });

    enemies = enemies.filter(e => e.z > -15000 && e.z < 6000);
    draw(colors, isRaining);
    requestAnimationFrame(update);
}

function draw(colors, isRaining) {
    ctx.fillStyle = colors.sky; ctx.fillRect(0, 0, 400, 200);
    ctx.fillStyle = colors.grass; ctx.fillRect(0, 200, 400, 200);
    
    let mtShift = (roadCurve * 0.8);
    for (let i = -2; i < 8; i++) {
        let bx = (i * 100) + mtShift;
        ctx.fillStyle = colors.mt;
        ctx.beginPath(); ctx.moveTo(bx - 60, 200); ctx.lineTo(bx, 140); ctx.lineTo(bx + 60, 200); ctx.fill();
        if (colors.snowCaps) { 
            ctx.fillStyle = "white"; 
            ctx.beginPath(); ctx.moveTo(bx, 140); ctx.lineTo(bx - 20, 160); ctx.lineTo(bx + 20, 160); ctx.fill(); 
        }
        // RELÂMPAGO NAS MONTANHAS
        if (lightningAlpha > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${lightningAlpha * 0.8})`;
            ctx.beginPath(); ctx.moveTo(bx - 60, 200); ctx.lineTo(bx, 140); ctx.lineTo(bx + 60, 200); ctx.fill();
        }
    }

    for (let i = 200; i < 400; i += 4) {
        let p = (i - 200) / 140;
        let x = (200 - playerX * 0.05) + (roadCurve * p * p) - (playerX * p);
        let w = 20 + p * 800;
        ctx.fillStyle = Math.sin(i * 0.5 + playerDist * 0.2) > 0 ? "#333" : "#3d3d3d";
        ctx.fillRect(x - w/2, i, w, 4);
    }
    
    enemies.sort((a,b) => b.z - a.z).forEach(e => {
        if (e.lastP > 0 && e.lastP < 0.92) drawF1Car(e.lastX, e.lastY, e.lastP * 0.85, e.color, false, colors.nightMode || colors.fog > 0);
    });
    drawF1Car(200, 350, 0.85, "#E00", true, colors.nightMode || colors.fog > 0); 
    enemies.forEach(e => {
        if (e.lastP >= 0.92 && e.lastP < 2) drawF1Car(e.lastX, e.lastY, e.lastP * 0.85, e.color, false, colors.nightMode || colors.fog > 0);
    });

    if (colors.fog > 0) { ctx.fillStyle = `rgba(140,145,160,${colors.fog})`; ctx.fillRect(0, 55, 400, 345); }
    if (isRaining) {
        ctx.strokeStyle = "rgba(200, 210, 255, 0.35)"; ctx.lineWidth = 1.2;
        raindrops.forEach(r => { ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x + 1.5, r.y + 12); ctx.stroke(); });
    }
    if (lightningAlpha > 0) { ctx.fillStyle = `rgba(255, 255, 255, ${lightningAlpha})`; ctx.fillRect(0, 55, 400, 345); }

    // HUD
    ctx.fillStyle = "black"; ctx.fillRect(0, 0, 400, 55);
    ctx.fillStyle = (gameState === "GOAL_REACHED" || gameState === "WIN_DAY") ? "lime" : "yellow";
    ctx.font = "bold 18px Courier";
    ctx.fillText(gameState === "GOAL_REACHED" || gameState === "WIN_DAY" ? "GOAL OK!" : `CARS: ${carsRemaining}`, 15, 35);
    ctx.fillStyle = "yellow"; ctx.fillText(`DAY: ${dayNumber}`, 160, 35);
    ctx.fillStyle = "#444"; ctx.fillRect(260, 20, 120, 15);
    ctx.fillStyle = "lime"; ctx.fillRect(260, 20, (currentTime/DAY_DURATION) * 120, 15);
}
update();