 const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 400; canvas.height = 400;

let playerX = 0, speed = 0, gameTick = 0, playerDist = 0;
let dayNumber = 1, baseGoal = 200, carsRemaining = baseGoal; 
let gameState = "PLAYING"; 
let isPaused = false;

const maxSpeed = 12; 
// Tempo de 2,5 minutos (9000 ticks)
const STAGE_DURATION = 9000; 
const DAY_DURATION = STAGE_DURATION * 9; 
let currentTime = 0; 

let enemies = [];
let roadCurve = 0, targetCurve = 0, curveTimer = 0;

const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };

window.addEventListener('keydown', e => { 
    if (keys.hasOwnProperty(e.code)) keys[e.code] = true; 
    if (audioCtx.state === 'suspended') audioCtx.resume();
});
window.addEventListener('keyup', e => { if (keys.hasOwnProperty(e.code)) keys[e.code] = false; });

function setupMobileControls() {
    const ids = { 'btnLeft': 'ArrowLeft', 'btnRight': 'ArrowRight', 'mobileLeft': 'ArrowLeft', 'mobileRight': 'ArrowRight' };
    Object.keys(ids).forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            const press = (e) => { 
                if(e.type === 'touchstart') e.preventDefault();
                keys[ids[id]] = true; 
                if(audioCtx.state === 'suspended') audioCtx.resume(); 
            };
            const release = () => { keys[ids[id]] = false; };
            btn.addEventListener('mousedown', press);
            btn.addEventListener('mouseup', release);
            btn.addEventListener('mouseleave', release);
            btn.addEventListener('touchstart', press, {passive: false});
            btn.addEventListener('touchend', release);
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
    // CORREÇÃO AQUI: Removido o "_" que causava o travamento
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
        if (!isPaused) { audioCtx.resume(); update(); }
    }
}

function resetGame() {
    audioCtx.resume();
    dayNumber = 1; baseGoal = 200; isPaused = false;
    const btn = document.getElementById('pauseBtn');
    if (btn) btn.innerText = "Pausar";
    resetDay();
    if (gameState !== "PLAYING") { gameState = "PLAYING"; update(); }
}

function resetDay() {
    currentTime = 0; playerDist = 0; speed = 0; enemies = [];
    carsRemaining = baseGoal + (dayNumber - 1) * 10; 
    if (gameState !== "PLAYING") gameState = "PLAYING";
}

function drawF1Car(x, y, scale, color, isPlayer = false, nightMode = false) {
    let s = scale * 1.2; 
    if (s < 0.02 || s > 30) return; 
    let w = 45 * s; let h = 22 * s; 
    ctx.save();
    ctx.translate(x, y);
    if(isPlayer) ctx.rotate((roadCurve / 40) * Math.PI / 180);
    if (nightMode) {
        ctx.fillStyle = "#ff0000";
        ctx.fillRect(-w * 0.45, -h * 0.2, w * 0.25, h * 0.3); 
        ctx.fillRect(w * 0.2, -h * 0.2, w * 0.25, h * 0.3);
    } else {
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
    if (gameState === "WIN_DAY" || gameState === "GAME_OVER") { draw(); requestAnimationFrame(update); return; }

    gameTick++; playerDist += speed; currentTime++;
    if (gameTick % 4 === 0) playEngineSound();

    let currentStage = Math.floor(currentTime / STAGE_DURATION);
    let colors = { sky: "#87CEEB", grass: "#1a7a1a", fog: 0, mt: "#555", nightMode: false, snowCaps: false };

    switch(currentStage) {
        case 0: colors.snowCaps = true; break; 
        case 1: colors.sky = "#DDD"; colors.grass = "#FFF"; colors.mt = "#999"; colors.snowCaps = true; break; 
        case 2: colors.sky = "#ff8c00"; colors.grass = "#145c14"; colors.mt = "#442200"; break; 
        case 3: colors.sky = "#4B0082"; colors.grass = "#0a2a0a"; colors.mt = "#221100"; break; 
        case 4: colors.sky = "#111144"; colors.grass = "#001100"; colors.mt = "#111"; colors.nightMode = true; break; 
        case 5: colors.sky = "#444"; colors.grass = "#333"; colors.mt = "#222"; colors.fog = 0.8; colors.nightMode = true; break; 
        case 6: colors.sky = "#000011"; colors.grass = "#000800"; colors.mt = "#000"; colors.nightMode = true; break; 
        case 7: colors.sky = "#5c97ea"; colors.grass = "#0d4d0d"; colors.mt = "#222"; colors.fog = 0.3; colors.nightMode = false; break; 
        case 8: colors.sky = "#ade1f2"; colors.grass = "#1a7a1a"; colors.mt = "#555"; break; 
    }

    if (currentTime >= DAY_DURATION) {
        if (gameState === "GOAL_REACHED" || carsRemaining <= 0) {
            gameState = "WIN_DAY"; dayNumber++; setTimeout(resetDay, 3500);
        } else { gameState = "GAME_OVER"; }
    }

    let offRoad = Math.abs(playerX) > 380;
    speed = Math.min(speed + (offRoad ? 0.025 : 0.06), offRoad ? 2 : maxSpeed); 
    if (keys.ArrowDown) speed = Math.max(speed - 0.2, 0);

    playerX -= (roadCurve / 25) * (speed / maxSpeed); 
    if (keys.ArrowLeft) playerX -= 7;
    if (keys.ArrowRight) playerX += 7;
    playerX = Math.max(-450, Math.min(450, playerX));

    if (--curveTimer <= 0) { targetCurve = (Math.random() - 0.5) * 160; curveTimer = 120; }
    roadCurve += (targetCurve - roadCurve) * 0.02;

    // --- SUA TRAVA ORIGINAL RESTAURADA ---
    if (gameTick % 150 === 0 && enemies.length < 100) {
        let horizonClear = !enemies.some(e => e.z > 3000);
        if (horizonClear) {
            enemies.push({ 
                lane: (Math.random() - 0.5) * 1.8, z: 4000, v: 8.5, 
                color: ["#F0F", "#0FF", "#0F0", "#FF0"][Math.floor(Math.random() * 4)],
                isOvertaken: false 
            });
        }
    }

    enemies.forEach((enemy) => {
        enemy.z -= (speed - enemy.v);
        if (gameState === "PLAYING") {
            if (enemy.z <= 0 && !enemy.isOvertaken) { carsRemaining--; enemy.isOvertaken = true; }
            if (enemy.z > 0 && enemy.isOvertaken) { carsRemaining++; enemy.isOvertaken = false; }
            if (carsRemaining <= 0) { carsRemaining = 0; gameState = "GOAL_REACHED"; }
        }
        
        let p = 1 - (enemy.z / 4000); 
        let roadWidth = 20 + p * 800;
        let screenX = (200 - playerX * 0.05) + (roadCurve * p * p) - (playerX * p) + (enemy.lane * roadWidth * 0.5);
        
        // --- COLISÃO EM CUBO ---
        if (p > 0.94 && p < 1.05 && Math.abs(screenX - 200) < 30) { 
            speed = -1; 
            enemy.z += 600; 
            playCrashSound(); 
        }
        enemy.lastY = 200 + (p * 140); enemy.lastX = screenX; enemy.lastP = p;
    });

    enemies = enemies.filter(e => e.z > -1000 && e.z < 5000);
    draw(colors);
    requestAnimationFrame(update);
}

function draw(colors) {
    ctx.fillStyle = colors.sky; ctx.fillRect(0, 0, 400, 200);
    ctx.fillStyle = colors.grass; ctx.fillRect(0, 200, 400, 200);
    
    let mtShift = (roadCurve * 0.8);
    for (let i = -2; i < 8; i++) {
        let bx = (i * 100) + mtShift;
        ctx.fillStyle = colors.mt;
        ctx.beginPath(); ctx.moveTo(bx - 60, 200); ctx.lineTo(bx, 140); ctx.lineTo(bx + 60, 200); ctx.fill();
    }

    for (let i = 200; i < 400; i += 4) {
        let p = (i - 200) / 140;
        let x = (200 - playerX * 0.05) + (roadCurve * p * p) - (playerX * p);
        let w = 20 + p * 800;
        ctx.fillStyle = Math.sin(i * 0.5 + playerDist * 0.2) > 0 ? "#333" : "#3d3d3d";
        ctx.fillRect(x - w/2, i, w, 4);
        ctx.fillStyle = Math.sin(i * 0.5 + playerDist * 0.2) > 0 ? "red" : "white";
        ctx.fillRect(x - w/2 - 10*p, i, 10*p, 4);
        ctx.fillRect(x + w/2, i, 10*p, 4);
    }
    
    enemies.sort((a,b) => b.z - a.z).forEach(e => {
        if (e.lastP > -2) drawF1Car(e.lastX, e.lastY, e.lastP * 0.85, e.color, false, colors.nightMode);
    });
    
    drawF1Car(200, 350, 0.85, "#E00", true, colors.nightMode); 
    
    ctx.fillStyle = "black"; ctx.fillRect(0, 0, 400, 55);
    ctx.fillStyle = (gameState === "GOAL_REACHED") ? "lime" : "yellow";
    ctx.font = "bold 18px Courier";
    ctx.fillText(gameState === "GOAL_REACHED" ? "GOAL OK!" : `CARS: ${carsRemaining}`, 15, 35);
    ctx.fillStyle = "yellow"; ctx.fillText(`DAY: ${dayNumber}`, 160, 35);
    ctx.fillStyle = "#444"; ctx.fillRect(260, 20, 120, 15);
    ctx.fillStyle = "lime"; ctx.fillRect(260, 20, (currentTime/DAY_DURATION) * 120, 15);

    if (isPaused) {
        ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(0, 55, 400, 345);
        ctx.fillStyle = "white"; ctx.textAlign = "center";
        ctx.font = "30px Courier"; ctx.fillText("PAUSADO", 200, 200);
        ctx.textAlign = "left";
    }
}
update();