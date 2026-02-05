 const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 400; canvas.height = 400;

let playerX = 0, speed = 0, gameTick = 0, playerDist = 0;
let dayNumber = 1, baseGoal = 200, carsRemaining = baseGoal; 
let gameState = "PLAYING"; 
let isPaused = false;

const maxSpeed = 12; 
const STAGE_DURATION = 12600; 
const DAY_DURATION = STAGE_DURATION * 8; 
let currentTime = 0; 

let enemies = [];
let roadCurve = 0, targetCurve = 0, curveTimer = 0;

// Controles
const keys = { ArrowLeft: false, ArrowRight: false };
window.addEventListener('keydown', e => { if (keys.hasOwnProperty(e.code)) keys[e.code] = true; });
window.addEventListener('keyup', e => { if (keys.hasOwnProperty(e.code)) keys[e.code] = false; });

// Áudio
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playEngineSound() {
    if (isPaused || speed <= 0 || audioCtx.state === 'suspended') return;
    let osc = audioCtx.createOscillator();
    let gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(40 + (speed * 15), audioCtx.currentTime);
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
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

function resetGame() {
    playerX = 0; speed = 0; gameTick = 0; playerDist = 0;
    dayNumber = 1; carsRemaining = baseGoal;
    enemies = []; roadCurve = 0; currentTime = 0;
    gameState = "PLAYING";
    isPaused = false;
}

function togglePause() {
    isPaused = !isPaused;
    if (!isPaused) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        update();
    }
}

function getColors(time) {
    let t = time % DAY_DURATION;
    if (t < STAGE_DURATION) return { sky: "#87CEEB", ground: "#228B22", fog: 0, mt: "#1a4a1a" }; 
    if (t < STAGE_DURATION * 2) return { sky: "#4682B4", ground: "#006400", fog: 0, mt: "#143a14" };
    if (t < STAGE_DURATION * 3) return { sky: "#FF4500", ground: "#8B4513", fog: 0.3, mt: "#3d1f00" };
    if (t < STAGE_DURATION * 4) return { sky: "#2F4F4F", ground: "#191970", fog: 0.5, mt: "#111" };
    if (t < STAGE_DURATION * 6) return { sky: "#000000", ground: "#000033", fog: 0.2, mt: "#000", nightMode: true };
    return { sky: "#E0E0E0", ground: "#A0A0A0", fog: 0.8, mt: "#555" };
}

function drawF1Car(x, y, scale, color, isPlayer = false, nightMode = false) {
    let w = 40 * scale, h = 20 * scale;
    if (nightMode && !isPlayer) {
        ctx.fillStyle = "rgba(255,255,0,0.5)";
        ctx.beginPath();
        ctx.moveTo(x-w/4, y); ctx.lineTo(x-w, y+50); ctx.lineTo(x+w, y+50); ctx.lineTo(x+w/4, y);
        ctx.fill();
    }
    ctx.fillStyle = "#111";
    ctx.fillRect(x-w/2-5*scale, y+h/4, 10*scale, 10*scale);
    ctx.fillRect(x+w/2-5*scale, y+h/4, 10*scale, 10*scale);
    ctx.fillStyle = color;
    ctx.fillRect(x-w/2, y, w, h);
    ctx.fillStyle = "black";
    ctx.fillRect(x-w/4, y+h/4, w/2, h/2);
    if (isPlayer && speed > 0 && gameTick % 2 === 0) {
        ctx.fillStyle = "orange"; ctx.fillRect(x-5, y+h, 10, 5);
    }
}

function update() {
    if (isPaused || gameState !== "PLAYING") return;
    gameTick++; currentTime++; playerDist += speed * 0.2;

    // Aceleração Automática
    let offRoad = Math.abs(playerX) > 175;
    if (offRoad) {
        speed = Math.max(speed - 0.2, 3); // Lento na grama, mas não para
    } else {
        if (speed < maxSpeed) speed += 0.05; 
    }

    // Controles Laterais
    if (keys.ArrowLeft) playerX -= 8;
    if (keys.ArrowRight) playerX += 8;

    // Limite da Pista (Permite ir até o limite visual da grama)
    playerX = Math.max(-450, Math.min(450, playerX));

    // Curva
    curveTimer--;
    if (curveTimer <= 0) {
        targetCurve = (Math.random() - 0.5) * 4;
        curveTimer = 50 + Math.random() * 100;
    }
    roadCurve += (targetCurve - roadCurve) * 0.05;
    playerX -= roadCurve * (speed / maxSpeed);

    // Inimigos
    if (gameTick % 40 === 0 && enemies.length < 5) {
        enemies.push({ x: (Math.random()-0.5)*350, z: 400, color: `hsl(${Math.random()*360},70%,50%)`, speed: 2+Math.random()*4 });
    }

    enemies.forEach((e, i) => {
        e.z -= (speed - e.speed);
        let p = 200 / (200 + e.z);
        
        // Perspectiva corrigida
        e.lastX = 200 + (e.x - playerX) * p;
        e.lastY = 200 + 200 * p;
        e.lastP = p * 2;
        
        if (e.z < 0) { 
            enemies.splice(i, 1); 
            if (gameState === "PLAYING") carsRemaining--; 
        }
        
        // Colisão
        if (e.z > 0 && e.z < 30 && Math.abs(e.x - playerX) < 45) { 
            speed = 2; 
            playerX += (playerX > e.x ? 60 : -60); // Joga para o lado na batida
            playCrashSound();
        }
    });

    if (carsRemaining <= 0) { 
        gameState = "WON"; 
        alert("DIA COMPLETADO!"); 
        resetGame(); 
    }

    playEngineSound();
    draw();
    requestAnimationFrame(update);
}

function draw() {
    let colors = getColors(currentTime);
    ctx.fillStyle = colors.sky; ctx.fillRect(0, 0, 400, 200);
    
    // Montanhas
    ctx.fillStyle = colors.mt;
    for(let i=-2; i<8; i++) {
        let mx = (i * 150 - (playerX * 0.1) + (roadCurve * 60)) % 1000;
        if (mx < -100) mx += 1000;
        ctx.beginPath(); ctx.moveTo(mx-70, 200); ctx.lineTo(mx, 110); ctx.lineTo(mx+70, 200); ctx.fill();
    }

    ctx.fillStyle = colors.ground; ctx.fillRect(0, 200, 400, 200);

    // Estrada
    for (let i = 200; i < 400; i += 4) {
        let p = (i - 180) / 220;
        let x = 200 + (roadCurve * (1-p) * 100) - (playerX * p);
        let w = 20 + p * 800;
        ctx.fillStyle = Math.sin(i * 0.5 + playerDist * 0.2) > 0 ? "#333" : "#3d3d3d";
        ctx.fillRect(x - w/2, i, w, 4);
        ctx.fillStyle = Math.sin(i * 0.5 + playerDist * 0.2) > 0 ? "red" : "white";
        ctx.fillRect(x - w/2 - 10*p, i, 10*p, 4);
        ctx.fillRect(x + w/2, i, 10*p, 4);
    }
    
    // Desenha inimigos
    enemies.sort((a,b) => b.z - a.z).forEach(e => {
        if (e.lastP > 0 && e.lastY > 180) drawF1Car(e.lastX, e.lastY, e.lastP, e.color, false, colors.nightMode);
    });
    
    // Jogador
    drawF1Car(200, 340, 1.0, "#E00", true, colors.nightMode);
    
    if (colors.fog) { 
        ctx.fillStyle = `rgba(180,180,180,${colors.fog})`; 
        ctx.fillRect(0, 180, 400, 220); 
    }

    // HUD
    ctx.fillStyle = "black"; ctx.fillRect(0, 0, 400, 40);
    ctx.fillStyle = "white"; ctx.font = "14px Courier New";
    ctx.fillText(`CARS: ${carsRemaining}  DAY: ${dayNumber}  SPEED: ${Math.floor(speed*20)}km/h`, 10, 25);
}

// Mobile Setup
function setupMobileControls() {
    const mobileKeys = { 'btnLeft': 'ArrowLeft', 'btnRight': 'ArrowRight' };
    Object.keys(mobileKeys).forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('touchstart', (e) => { 
                e.preventDefault(); 
                keys[mobileKeys[id]] = true; 
                if (audioCtx.state === 'suspended') audioCtx.resume(); 
            });
            btn.addEventListener('touchend', (e) => { 
                e.preventDefault(); 
                keys[mobileKeys[id]] = false; 
            });
        }
    });
}

setupMobileControls();
update();