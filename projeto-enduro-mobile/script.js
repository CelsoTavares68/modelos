 const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
// Mantendo o tamanho fixo da sua lógica original para não quebrar as coordenadas
canvas.width = 400; canvas.height = 400;

let playerX = 0, speed = 0, gameTick = 0, playerDist = 0;
let dayNumber = 1, baseGoal = 200, carsRemaining = baseGoal; 
let isPaused = false;

// --- CONFIGURAÇÃO DE TEMPO (3.5 MINUTOS) ---
const STAGE_DURATION = 12600; 
const DAY_DURATION = STAGE_DURATION * 9; 
let currentTime = 0; 

const maxSpeed = 12; 
let enemies = [];
let roadCurve = 0, targetCurve = 0, curveTimer = 0;

const keys = { ArrowLeft: false, ArrowRight: false };

// --- ÁUDIO (Mantido do seu original) ---
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

// Controles
window.addEventListener('keydown', e => { if (keys.hasOwnProperty(e.code)) keys[e.code] = true; if (audioCtx.state === 'suspended') audioCtx.resume(); });
window.addEventListener('keyup', e => { if (keys.hasOwnProperty(e.code)) keys[e.code] = false; });

function update() {
    if (isPaused) return;

    gameTick++;
    playerDist += speed;
    currentTime++;

    if (currentTime >= DAY_DURATION) {
        currentTime = 0;
        dayNumber++;
    }

    // --- LÓGICA DE CORES ORIGINAL ---
    let stage = Math.floor(currentTime / STAGE_DURATION);
    let colors = { sky: "#87CEEB", grass: "#1a7a1a", nightMode: false };
    if (stage === 1 || stage === 2) { colors.grass = "#FFF"; colors.sky = "#B0C4DE"; } // Neve
    if (stage >= 5 && stage <= 6) colors.nightMode = true; // Noite

    // Movimentação
    if (keys.ArrowLeft) playerX -= 0.04 * (speed/maxSpeed + 1);
    if (keys.ArrowRight) playerX += 0.04 * (speed/maxSpeed + 1);
    
    // 4ª Alteração: Retomada gradual após batida
    let accel = (speed < 2) ? 0.02 : 0.05;
    speed = Math.min(speed + accel, maxSpeed);

    // 3ª Alteração: Sair da pista (Grama)
    if (Math.abs(playerX) > 0.8) {
        speed = Math.max(speed - 0.2, 3);
    }

    // --- SURGIMENTO DE CARROS (SUA LÓGICA) ---
    if (gameTick % 100 === 0 && enemies.length < 8) {
        enemies.push({ 
            x: (Math.random() - 0.5) * 1.5, 
            z: 100, 
            v: 7, 
            color: ["#F0F", "#0FF", "#0F0", "#FF0"][Math.floor(Math.random() * 4)],
            over: false 
        });
    }

    enemies.forEach(e => {
        e.z -= (speed - e.v) * 0.1;
        
        // --- COLISÃO CORRIGIDA (2ª ALTERAÇÃO) ---
        // Seguindo o seu estilo de colisão: se estiver perto (z baixo) e na mesma faixa
        if (e.z < 2 && e.z > 0) {
            let dx = Math.abs(e.x - playerX);
            if (dx < 0.25) { // 1ª Alteração: Caixa de colisão estreita
                speed = 0; // 4ª Alteração: Cai para zero
                e.z = 20; // Empurra o inimigo para não bater de novo
            }
        }

        if (e.z <= 0 && !e.over) {
            if (speed > 0) carsRemaining--;
            e.over = true;
        }
    });

    enemies = enemies.filter(e => e.z > -10);

    // Curva
    if (--curveTimer <= 0) { targetCurve = (Math.random() - 0.5) * 2; curveTimer = 150; }
    roadCurve += (targetCurve - roadCurve) * 0.02;

    if (gameTick % 4 === 0) playEngineSound();
    draw(colors);
    requestAnimationFrame(update);
}

function draw(colors) {
    ctx.fillStyle = colors.sky; ctx.fillRect(0, 0, 400, 200);
    ctx.fillStyle = colors.grass; ctx.fillRect(0, 200, 400, 200);

    // --- RENDERIZAÇÃO DA ESTRADA ORIGINAL ---
    for (let i = 0; i < 200; i += 4) {
        let p = i / 200;
        let x = 200 + (roadCurve * p * p * 100) - (playerX * p * 200);
        let w = 20 + p * 800;
        
        ctx.fillStyle = Math.sin(i * 0.5 + playerDist * 0.2) > 0 ? "#333" : "#3d3d3d";
        ctx.fillRect(x - w/2, 200 + i, w, 4);
        
        ctx.fillStyle = Math.sin(i * 0.5 + playerDist * 0.2) > 0 ? "red" : "white";
        ctx.fillRect(x - w/2 - 10*p, 200 + i, 10*p, 4);
        ctx.fillRect(x + w/2, 200 + i, 10*p, 4);
    }

    // Desenha Inimigos (2ª Alteração: Tamanho equilibrado)
    enemies.sort((a,b) => b.z - a.z).forEach(e => {
        let p = 1 / (e.z * 0.1 + 1);
        let ex = 200 + (roadCurve * p * p * 100) - (playerX * p * 200) + (e.x * p * 200);
        let ey = 200 + p * 200;
        if (p > 0 && p < 2) drawF1Car(ex, ey, p * 0.8, e.color, colors.nightMode);
    });

    // 2ª Alteração: Seu carro com escala igual ao inimigo (0.8)
    drawF1Car(200, 380, 0.8, "#E00", colors.nightMode);

    // HUD
    ctx.fillStyle = "black"; ctx.fillRect(0, 0, 400, 40);
    ctx.fillStyle = "yellow"; ctx.font = "14px Courier New";
    ctx.fillText(`CARS: ${Math.max(0, carsRemaining)}  DAY: ${dayNumber}`, 10, 25);
}

function drawF1Car(x, y, scale, color, night) {
    let w = 40 * scale; let h = 20 * scale;
    ctx.save();
    ctx.translate(x, y);
    if (night) {
        ctx.fillStyle = "red";
        ctx.fillRect(-w/2, -h/2, w/5, h/5);
        ctx.fillRect(w/3, -h/2, w/5, h/5);
    } else {
        ctx.fillStyle = color; ctx.fillRect(-w/2, -h/2, w, h/2);
        ctx.fillStyle = "#000"; ctx.fillRect(-w/2, -h/2, w/4, h); ctx.fillRect(w/4, -h/2, w/4, h);
    }
    ctx.restore();
}

update();