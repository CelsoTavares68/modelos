 const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// --- VARIÁVEIS DO SEU PROJETO ---
let playerX = 0, speed = 0, gameTick = 0, playerDist = 0;
let dayNumber = 1, baseGoal = 200, carsRemaining = baseGoal; 
let gameState = "PLAYING", isPaused = false, currentTime = 0;
const maxSpeed = 12; 
const STAGE_DURATION = 12600; 
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
    gameTick++; playerDist += speed; currentTime++;
    if (gameTick % 4 === 0) playEngineSound();

    let currentStage = Math.floor(currentTime / STAGE_DURATION);
    let colors = { sky: "#87CEEB", grass: "#1a7a1a", mt: "#555", nightMode: false };
    if (currentStage >= 4 && currentStage <= 6) colors.nightMode = true;

    speed = Math.min(speed + (speed < 5 ? 0.02 : 0.06), maxSpeed);

    if (keys.ArrowLeft) playerX -= 12;
    if (keys.ArrowRight) playerX += 12;
    playerX -= (roadCurve / 35) * (speed / maxSpeed);

    // INIMIGOS: Agora eles nascem restritos à largura da pista
    if (gameTick % 100 === 0 && enemies.length < 5) {
        enemies.push({ 
            lane: (Math.random() - 0.5) * 1.3, // 1.3 garante que fiquem dentro das zebras
            z: 4000, v: 7, 
            color: ["#F0F", "#0FF", "#0F0", "#FF0"][Math.floor(Math.random() * 4)],
            over: false 
        });
    }

    enemies.forEach((e) => {
        e.z -= (speed - e.v);
        let p = 1 - (e.z / 4000); 
        
        // PISTA: Ajustei o p * p para p * 1.8 para não afunilar tanto
        let roadW = 40 + (p * canvas.width * 2.2); 
        
        e.x = (canvas.width/2) + (roadCurve * p * p) - (playerX * p) + (e.lane * roadW * 0.4);
        e.y = (canvas.height/2) + (p * (canvas.height/2.1));

        // --- COLISÃO CORRIGIDA ---
        // Agora medimos a distância real entre o centro do player e o centro do inimigo
        let playerW = (canvas.width * 0.15); // Largura visual do seu carro
        let hitRange = playerW * 0.7; // Margem de segurança para ultrapassagem
        
        if (p > 0.88 && p < 1.02) { // Se o carro estiver na mesma linha "Z" que você
            let distanceX = Math.abs(e.x - canvas.width/2);
            if (distanceX < hitRange) {
                speed = 2; // Bateu
                e.z += 500; 
            }
        }

        if (e.z <= 0 && !e.over) { carsRemaining--; e.over = true; }
    });

    if (--curveTimer <= 0) { 
        targetCurve = (Math.random() - 0.5) * (canvas.width * 0.3); 
        curveTimer = 180; 
    }
    roadCurve += (targetCurve - roadCurve) * 0.02;

    enemies = enemies.filter(e => e.z > -500);
    draw(colors);
    requestAnimationFrame(update);
}

function draw(colors) {
    ctx.fillStyle = colors.sky; ctx.fillRect(0, 0, canvas.width, canvas.height/2);
    
    // MONTANHAS DISTANTES
    ctx.fillStyle = "#4B5320";
    for (let i = -2; i < 5; i++) {
        let bx = (canvas.width/2) + (i * canvas.width * 0.8) - (playerX * 0.1) + (roadCurve * 0.5);
        ctx.beginPath();
        ctx.moveTo(bx - 300, canvas.height/2); ctx.lineTo(bx, canvas.height/2 - 100); ctx.lineTo(bx + 300, canvas.height/2);
        ctx.fill();
    }

    ctx.fillStyle = colors.grass; ctx.fillRect(0, canvas.height/2, canvas.width, canvas.height/2);

    // ESTRADA: Menos afunilada no topo
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
        if (p > 0) drawF1Car(e.x, e.y, p, e.color);
    });

    drawF1Car(canvas.width/2, canvas.height * 0.9, 1.3, "#E00");

    // HUD
    ctx.fillStyle = "black"; ctx.fillRect(0, 0, canvas.width, 50);
    ctx.fillStyle = "yellow"; ctx.font = "bold 20px Courier";
    ctx.fillText(`CARS: ${Math.max(0, carsRemaining)}`, 20, 35);
}

function drawF1Car(x, y, scale, color) {
    let s = scale * (canvas.width / 400); 
    let w = 45 * s; let h = 22 * s;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color; ctx.fillRect(-w/2, -h, w, h*0.5); 
    ctx.fillStyle = "#111"; ctx.fillRect(-w/1.8, -h, w/4, h); 
    ctx.fillRect(w/3, -h, w/4, h);
    ctx.restore();
}

function togglePause() { isPaused = !isPaused; if(!isPaused) update(); }
function resetGame() { location.reload(); }

update();