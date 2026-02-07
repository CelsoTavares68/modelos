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

const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };

window.addEventListener('keydown', e => { 
    if (keys.hasOwnProperty(e.code)) keys[e.code] = true; 
    if (audioCtx.state === 'suspended') audioCtx.resume();
});
window.addEventListener('keyup', e => { if (keys.hasOwnProperty(e.code)) keys[e.code] = false; });

// Controle Mobile
function setupMobileControls() {
    const ids = { 'mobileLeft': 'ArrowLeft', 'mobileRight': 'ArrowRight' };
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

// --- SISTEMA DE ÁUDIO ---
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

function playWinSound() {
    const notes = [523, 659, 783, 1046]; 
    notes.forEach((f, i) => {
        setTimeout(() => {
            let o = audioCtx.createOscillator();
            let g = audioCtx.createGain();
            o.type = 'square'; o.frequency.value = f;
            g.gain.setValueAtTime(0.1, audioCtx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
            o.connect(g); g.connect(audioCtx.destination);
            o.start(); o.stop(audioCtx.currentTime + 0.4);
        }, i * 150);
    });
}

function playGameOverSound() {
    const notes = [200, 150, 100];
    notes.forEach((f, i) => {
        setTimeout(() => {
            let o = audioCtx.createOscillator();
            let g = audioCtx.createGain();
            o.type = 'sawtooth'; o.frequency.value = f;
            g.gain.setValueAtTime(0.1, audioCtx.currentTime);
            g.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.6);
            o.connect(g); g.connect(audioCtx.destination);
            o.start(); o.stop(audioCtx.currentTime + 0.6);
        }, i * 200);
    });
}

// --- LÓGICA DE JOGO ---
function togglePause() {
    if (gameState === "PLAYING" || gameState === "GOAL_REACHED") {
        isPaused = !isPaused;
        document.getElementById('pauseBtn').innerText = isPaused ? "Retomar" : "Pausar";
        if (!isPaused) update();
    }
}

function resetGame() {
    dayNumber = 1; baseGoal = 200; isPaused = false;
    document.getElementById('pauseBtn').innerText = "Pausar";
    resetDay();
    if (gameState !== "PLAYING") { gameState = "PLAYING"; update(); }
}

function resetDay() {
    currentTime = 0; playerDist = 0; speed = 0; enemies = [];
    carsRemaining = baseGoal + (dayNumber - 1) * 20; 
    gameState = "PLAYING";
}

function drawF1Car(x, y, scale, color, isPlayer = false, nightMode = false) {
    let s = scale * 1.2; 
    if (s < 0.02 || s > 30) return; 
    let w = 45 * s; let h = 22 * s; 
    ctx.save();
    ctx.translate(x, y);
    if(isPlayer) ctx.rotate((roadCurve / 40) * Math.PI / 180);

    if (nightMode) {
        ctx.fillStyle = "#111"; 
        ctx.fillRect(-w * 0.5, -h * 0.1, w * 0.25, h * 0.8);
        ctx.fillRect(w * 0.25, -h * 0.1, w * 0.25, h * 0.8);
        ctx.fillRect(-w * 0.25, h * 0.1, w * 0.5, h * 0.4); 
        ctx.fillRect(-w * 0.5, -h * 0.3, w, h * 0.2);
        // Faróis
        ctx.fillStyle = "rgba(255, 255, 200, 0.2)";
        ctx.beginPath(); ctx.arc(-w * 0.3, h * 0.5, w * 0.2, 0, Math.PI * 2); 
        ctx.arc(w * 0.3, h * 0.5, w * 0.2, 0, Math.PI * 2); ctx.fill();
        // Lanternas
        ctx.fillStyle = "#ff0000";
        ctx.fillRect(-w * 0.45, -h * 0.2, w * 0.2, h * 0.2); 
        ctx.fillRect(w * 0.25, -h * 0.2, w * 0.2, h * 0.2);
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

    let stage = Math.floor(currentTime / STAGE_DURATION);
    let colors = { sky: "#87CEEB", grass: "#1a7a1a", fog: 0, mt: "#555", nightMode: false, snowCaps: false };

    switch(stage) {
        case 0: colors.snowCaps = true; break; 
        case 1: colors.sky = "#DDD"; colors.grass = "#FFF"; colors.mt = "#999"; colors.snowCaps = true; break; 
        case 2: colors.sky = "#ff8c00"; colors.grass = "#145c14"; colors.mt = "#442200"; break; 
        case 4: colors.sky = "#111144"; colors.grass = "#001100"; colors.nightMode = true; break; 
        case 5: colors.sky = "#444"; colors.grass = "#333"; colors.fog = 0.8; colors.nightMode = true; break; 
        case 6: colors.sky = "#000"; colors.grass = "#000"; colors.nightMode = true; break;
        default: break;
    }

    if (currentTime >= DAY_DURATION && gameState === "PLAYING") {
        if (carsRemaining <= 0) { 
            gameState = "WIN_DAY"; playWinSound(); dayNumber++; setTimeout(resetDay, 4500); 
        } else { 
            gameState = "GAME_OVER"; playGameOverSound(); 
        }
    }

    let offRoad = Math.abs(playerX) > 380;
    speed = Math.min(speed + (offRoad ? 0.025 : 0.06), offRoad ? 2 : maxSpeed); 
    if (keys.ArrowDown) speed = Math.max(speed - 0.2, 0);

    playerX -= (roadCurve / 35) * (speed / maxSpeed); 
    if (keys.ArrowLeft) playerX -= 4.5;
    if (keys.ArrowRight) playerX += 4.5;
    playerX = Math.max(-450, Math.min(450, playerX));

    if (--curveTimer <= 0) { targetCurve = (Math.random() - 0.5) * 160; curveTimer = 120; }
    roadCurve += (targetCurve - roadCurve) * 0.02;

    if (gameTick % 150 === 0 && enemies.length < 20) {
        enemies.push({ lane: (Math.random() - 0.5) * 1.8, z: 4000, v: 8.5, color: "#F0F", isOvertaken: false });
    }

    enemies.forEach((enemy) => {
        enemy.z -= (speed - enemy.v);
        let p = 1 - (enemy.z / 4000); 
        let roadWidth = 20 + p * 800;
        let screenX = (200 - playerX * 0.05) + (roadCurve * p * p) - (playerX * p) + (enemy.lane * roadWidth * 0.5);
        
        if (p > 0.92 && p < 1.02 && Math.abs(screenX - 200) < 48) { 
            speed = -1; enemy.z += 800; playCrashSound(); 
        }
        if (enemy.z <= 0 && !enemy.isOvertaken) { carsRemaining = Math.max(0, carsRemaining - 1); enemy.isOvertaken = true; }
        
        enemy.lastY = 200 + (p * 140); enemy.lastX = screenX; enemy.lastP = p;
    });

    enemies = enemies.filter(e => e.z > -2000);
    draw(colors);
    requestAnimationFrame(update);
}

function draw(colors) {
    if (!colors) return;
    ctx.fillStyle = colors.sky; ctx.fillRect(0, 0, 400, 200);
    ctx.fillStyle = colors.grass; ctx.fillRect(0, 200, 400, 200);
    
    // Montanhas
    for (let i = -2; i < 8; i++) {
        let bx = (i * 100) + (roadCurve * 0.8);
        ctx.fillStyle = colors.mt;
        ctx.beginPath(); ctx.moveTo(bx-60, 200); ctx.lineTo(bx, 140); ctx.lineTo(bx+60, 200); ctx.fill();
        if (colors.snowCaps) {
            ctx.fillStyle = "white";
            ctx.beginPath(); ctx.moveTo(bx, 140); ctx.lineTo(bx-20, 160); ctx.lineTo(bx+20, 160); ctx.fill();
        }
    }

    // Estrada
    for (let i = 200; i < 400; i += 4) {
        let p = (i - 200) / 140;
        let x = (200 - playerX * 0.05) + (roadCurve * p * p) - (playerX * p);
        let w = 20 + p * 800;
        ctx.fillStyle = Math.sin(i * 0.5 + playerDist * 0.2) > 0 ? "#333" : "#3d3d3d";
        ctx.fillRect(x - w/2, i, w, 4);
    }
    
    // Inimigos Longe
    enemies.sort((a,b) => b.z - a.z).forEach(e => {
        if (e.lastP > 0 && e.lastP < 0.92) drawF1Car(e.lastX, e.lastY, e.lastP * 0.85, e.color, false, colors.nightMode);
    });
    
    // Jogador
    drawF1Car(200, 350, 0.85, "#E00", true, colors.nightMode); 

    // Inimigos Perto (Profundidade)
    enemies.forEach(e => {
        if (e.lastP >= 0.92 && e.lastP < 2) drawF1Car(e.lastX, e.lastY, e.lastP * 0.85, e.color, false, colors.nightMode);
    });

    // Bandeiras Vitória
    if (gameState === "WIN_DAY") {
        let wave = Math.sin(gameTick * 0.2) * 5;
        ctx.fillStyle = "white"; ctx.fillRect(160, 310, 2, 30); ctx.fillRect(240, 310, 2, 30);
        ctx.fillStyle = (gameTick % 10 < 5) ? "black" : "white";
        ctx.fillRect(135 + wave, 310, 25, 15); ctx.fillRect(242 + wave, 310, 25, 15);
    }

    if (colors.fog > 0) { ctx.fillStyle = `rgba(200,200,200,${colors.fog})`; ctx.fillRect(0, 200, 400, 200); }
    
    // UI
    ctx.fillStyle = "black"; ctx.fillRect(0, 0, 400, 55);
    ctx.fillStyle = carsRemaining <= 0 ? "lime" : "yellow";
    ctx.font = "bold 18px Courier";
    ctx.fillText(carsRemaining <= 0 ? "GOAL OK!" : `CARS: ${carsRemaining}`, 15, 35);
    ctx.fillStyle = "yellow"; ctx.fillText(`DAY: ${dayNumber}`, 160, 35);
    ctx.fillStyle = "#444"; ctx.fillRect(260, 20, 120, 15);
    ctx.fillStyle = "lime"; ctx.fillRect(260, 20, (currentTime/DAY_DURATION) * 120, 15);

    if (gameState === "WIN_DAY") {
        ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(0, 55, 400, 345);
        ctx.fillStyle = "lime"; ctx.textAlign = "center";
        ctx.font = "bold 25px Courier"; ctx.fillText(`DIA ${dayNumber-1} COMPLETO!`, 200, 180);
        ctx.textAlign = "left";
    }

    if (gameState === "GAME_OVER") {
        ctx.fillStyle = "rgba(200,0,0,0.8)"; ctx.fillRect(0, 55, 400, 345);
        ctx.fillStyle = "white"; ctx.textAlign = "center";
        ctx.font = "bold 30px Courier"; ctx.fillText("FIM DE JOGO", 200, 200);
        ctx.textAlign = "left";
    }
}
update();