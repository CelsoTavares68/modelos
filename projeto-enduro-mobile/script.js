 const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// --- VARIÁVEIS DE CONTROLE ---
let playerX = 0, speed = 0, gameTick = 0, playerDist = 0;
let dayNumber = 1, baseGoal = 200, carsRemaining = baseGoal; 
let isPaused = false, currentTime = 0;

const maxSpeed = 12; 
// Duração de cada um dos 9 estágios (Ajuste para testar mais rápido se quiser)
const STAGE_DURATION = 2000; 
const DAY_DURATION = STAGE_DURATION * 9; 

let enemies = [];
let roadCurve = 0, targetCurve = 0, curveTimer = 0;
const keys = { ArrowLeft: false, ArrowRight: false };

// --- ÁUDIO ---
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

// --- CONTROLES MOBILE ---
const setupBtn = (id, key) => {
    const el = document.getElementById(id);
    el.addEventListener('touchstart', (e) => { 
        e.preventDefault(); keys[key] = true; 
        if (audioCtx.state === 'suspended') audioCtx.resume(); 
    });
    el.addEventListener('touchend', (e) => { e.preventDefault(); keys[key] = false; });
};
setupBtn('btnLeft', 'ArrowLeft');
setupBtn('btnRight', 'ArrowRight');

function update() {
    if (isPaused) return; 
    
    gameTick++; 
    playerDist += speed; 
    currentTime++;

    // Reinicia o dia se passar dos 9 estágios
    if (currentTime >= DAY_DURATION) {
        currentTime = 0;
        dayNumber++;
        carsRemaining = baseGoal + (dayNumber * 10);
    }

    // --- LÓGICA DOS 9 ESTÁGIOS (CORES) ---
    let stage = Math.floor(currentTime / STAGE_DURATION);
    let colors = { sky: "#87CEEB", grass: "#1a7a1a", mt: "#4B5320", snow: false, night: false };

    switch(stage) {
        case 0: colors.sky = "#87CEEB"; break; // Dia
        case 1: colors.sky = "#4682B4"; colors.snow = true; colors.grass = "#DDD"; break; // Neve 1
        case 2: colors.sky = "#B0C4DE"; colors.snow = true; colors.grass = "#FFF"; break; // Neve 2
        case 3: colors.sky = "#F4A460"; break; // Entardecer
        case 4: colors.sky = "#FF4500"; break; // Pôr do sol
        case 5: colors.sky = "#191970"; colors.night = true; break; // Noite
        case 6: colors.sky = "#000055"; colors.night = true; break; // Noite Profunda
        case 7: colors.sky = "#483D8B"; break; // Madrugada
        case 8: colors.sky = "#B0E0E6"; break; // Amanhecer
    }

    // Aceleração e Retomada
    let accel = (speed < 2) ? 0.015 : 0.05;
    speed = Math.min(speed + accel, maxSpeed);

    if (keys.ArrowLeft) playerX -= 12;
    if (keys.ArrowRight) playerX += 12;
    playerX -= (roadCurve / 35) * (speed / maxSpeed);

    // Sair da pista diminui velocidade
    let currentRoadW = 40 + (1 * canvas.width * 2.2);
    if (Math.abs(playerX) > currentRoadW / 2.1) {
        speed = Math.max(speed - 0.2, 3);
    }

    // Gerador de inimigos
    if (gameTick % 100 === 0 && enemies.length < 5) {
        enemies.push({ 
            lane: (Math.random() - 0.5) * 1.2,
            z: 4000, v: 7.5, 
            color: ["#F0F", "#0FF", "#0F0", "#FF0"][Math.floor(Math.random() * 4)],
            over: false 
        });
    }

    enemies.forEach((e) => {
        e.z -= (speed - e.v);
        let p = 1 - (e.z / 4000); 
        let roadW = 40 + (p * canvas.width * 2.2); 
        
        e.x = (canvas.width/2) + (roadCurve * p * p) - (playerX * p) + (e.lane * roadW * 0.4);
        e.y = (canvas.height/2) + (p * (canvas.height/2.1));

        // Colisão (Traseira/Lateral)
        let playerW = (canvas.width * 0.12); 
        let enemyW = playerW * p;
        if (p > 0.90 && p < 1.02) {
            let dx = Math.abs(e.x - canvas.width/2);
            if (dx < enemyW * 0.8) {
                speed = 0;
                e.z += 600;
            }
        }
        if (e.z <= 0 && !e.over) { carsRemaining--; e.over = true; }
    });

    if (--curveTimer <= 0) { 
        targetCurve = (Math.random() - 0.5) * (canvas.width * 0.3); 
        curveTimer = 180; 
    }
    roadCurve += (targetCurve - roadCurve) * 0.02;

    if (gameTick % 4 === 0) playEngineSound();
    enemies = enemies.filter(e => e.z > -500);
    draw(colors);
    requestAnimationFrame(update);
}

function draw(colors) {
    ctx.fillStyle = colors.sky; ctx.fillRect(0, 0, canvas.width, canvas.height/2);
    
    // Montanhas
    ctx.fillStyle = colors.night ? "#111" : "#4B5320";
    for (let i = -2; i < 5; i++) {
        let bx = (canvas.width/2) + (i * canvas.width * 0.8) - (playerX * 0.1) + (roadCurve * 0.5);
        ctx.beginPath();
        ctx.moveTo(bx - 300, canvas.height/2); ctx.lineTo(bx, canvas.height/2 - 100); ctx.lineTo(bx + 300, canvas.height/2);
        ctx.fill();
    }

    ctx.fillStyle = colors.grass; ctx.fillRect(0, canvas.height/2, canvas.width, canvas.height/2);

    // Estrada
    for (let i = canvas.height/2; i < canvas.height; i += 4) {
        let p = (i - canvas.height/2) / (canvas.height/2);
        let roadW = 40 + (p * canvas.width * 2.2); 
        let x = (canvas.width/2) + (roadCurve * p * p) - (playerX * p);
        
        ctx.fillStyle = Math.sin(i * 0.5 + playerDist * 0.2) > 0 ? "#333" : "#3d3d3d";
        ctx.fillRect(x - roadW/2, i, roadW, 4);
        
        ctx.fillStyle = Math.sin(i * 0.5 + playerDist * 0.2) > 0 ? "red" : "white";
        ctx.fillRect(x - roadW/2 - 15*p, i, 15*p, 4);
        ctx.fillRect(x + roadW/2, i, 15*p, 4);
    }
    
    enemies.sort((a,b) => b.z - a.z).forEach(e => {
        let p = 1 - (e.z/4000);
        if (p > 0) drawF1Car(e.x, e.y, p, e.color, colors.night);
    });

    drawF1Car(canvas.width/2, canvas.height * 0.9, 1.0, "#E00", colors.night);

    // HUD
    ctx.fillStyle = "black"; ctx.fillRect(0, 0, canvas.width, 50);
    ctx.fillStyle = "yellow"; ctx.font = "bold 18px Courier";
    ctx.fillText(`CARS: ${Math.max(0, carsRemaining)}  DAY: ${dayNumber}`, 20, 32);
}

function drawF1Car(x, y, scale, color, night) {
    let s = scale * (canvas.width / 420); 
    let w = 45 * s; let h = 22 * s;
    ctx.save();
    ctx.translate(x, y);
    
    if (night) {
        // Na noite, desenha apenas os faróis traseiros vermelhos
        ctx.fillStyle = "red";
        ctx.fillRect(-w/2, -h/2, w/4, h/4);
        ctx.fillRect(w/4, -h/2, w/4, h/4);
    } else {
        ctx.fillStyle = color; ctx.fillRect(-w/2, -h, w, h*0.5); 
        ctx.fillStyle = "#111"; ctx.fillRect(-w/1.8, -h, w/4, h); 
        ctx.fillRect(w/3, -h, w/4, h);
    }
    ctx.restore();
}

function togglePause() { isPaused = !isPaused; if(!isPaused) update(); }
function resetGame() { location.reload(); }

update();