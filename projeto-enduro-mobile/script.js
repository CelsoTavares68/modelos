   const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

let playerX = 0, speed = 0, gameTick = 0, playerDist = 0;
let carsRemaining = 200;
let enemies = [];
let roadCurve = 0, targetCurve = 0, curveTimer = 0;
const maxSpeed = 12;
const keys = { ArrowLeft: false, ArrowRight: false };

// --- LIGAR BOTÕES MOBILE ---
const setupBtn = (id, key) => {
    const el = document.getElementById(id);
    el.addEventListener('touchstart', (e) => { e.preventDefault(); keys[key] = true; });
    el.addEventListener('touchend', (e) => { e.preventDefault(); keys[key] = false; });
};
setupBtn('btnLeft', 'ArrowLeft');
setupBtn('btnRight', 'ArrowRight');

// --- O TEU DESENHO ORIGINAL DE F1 ---
function drawF1Car(x, y, scale, color) {
    let s = scale * (canvas.width / 400); 
    let w = 45 * s; let h = 22 * s;
    ctx.save();
    ctx.translate(x, y);
    // Aerofólio Traseiro
    ctx.fillStyle = color; ctx.fillRect(-w * 0.5, -h * 0.3, w, h * 0.2);
    // Rodas
    ctx.fillStyle = "#111"; 
    ctx.fillRect(-w * 0.5, -h * 0.1, w * 0.25, h * 0.8);
    ctx.fillRect(w * 0.25, -h * 0.1, w * 0.25, h * 0.8);
    // Corpo
    ctx.fillStyle = color; ctx.fillRect(-w * 0.25, h * 0.1, w * 0.5, h * 0.4);
    // Aerofólio Dianteiro
    ctx.fillStyle = "#400";
    ctx.fillRect(-w * 0.4, -h * 0.2, w * 0.12, h * 0.15);
    ctx.fillRect(w * 0.28, -h * 0.2, w * 0.12, h * 0.15);
    ctx.restore();
}

function update() {
    gameTick++;
    // Aceleração automática
    speed = Math.min(speed + (speed < 4 ? 0.05 : 0.03), maxSpeed);

    if (keys.ArrowLeft) playerX -= 8;
    if (keys.ArrowRight) playerX += 8;
    
    playerX -= (roadCurve / 50) * (speed / maxSpeed);
    playerDist += speed;

    // --- GERADOR EM SEQUÊNCIA (SEM BLOCOS) ---
    // Verifica se o horizonte está livre (z > 3000)
    let horizonClear = enemies.every(e => e.z < 3000);
    if (gameTick % 120 === 0 && enemies.length < 5 && horizonClear) {
        enemies.push({ 
            lane: (Math.random() - 0.5) * 1.3, // Garante que fiquem no asfalto
            z: 4000, 
            v: 7, 
            color: ["#F0F","#0FF","#0F0","#FF0"][Math.floor(Math.random()*4)],
            over: false 
        });
    }

    enemies.forEach(e => {
        e.z -= (speed - e.v);
        let p = 1 - (e.z / 4000);
        let roadW = p * (canvas.width * 0.8) + 40;
        
        // Mantém os inimigos dentro do asfalto mobile
        e.x = (canvas.width/2) + (roadCurve * p * p) - (playerX * p) + (e.lane * roadW * 0.48);
        e.y = (canvas.height/2) + (p * p * (canvas.height/2.2));

        // Colisão com recuperação lenta
        if (p > 0.85 && p < 1.05 && Math.abs(e.x - canvas.width/2) < (canvas.width * 0.12)) {
            speed = 0.2; e.z += 1000;
        }
        if (e.z <= 0 && !e.over) { carsRemaining--; e.over = true; }
    });

    // Lógica da Curva
    if (--curveTimer <= 0) { 
        targetCurve = (Math.random() - 0.5) * (canvas.width * 0.2); 
        curveTimer = 150; 
    }
    roadCurve += (targetCurve - roadCurve) * 0.02;

    enemies = enemies.filter(e => e.z > -500);
    draw();
    requestAnimationFrame(update);
}

function draw() {
    // Céu e Grama
    ctx.fillStyle = "#87CEEB"; ctx.fillRect(0, 0, canvas.width, canvas.height/2);
    ctx.fillStyle = "#1a7a1a"; ctx.fillRect(0, canvas.height/2, canvas.width, canvas.height/2);

    // Estrada
    for (let i = canvas.height/2; i < canvas.height; i += 6) {
        let p = (i - canvas.height/2) / (canvas.height/2);
        let x = (canvas.width/2) + (roadCurve * p * p) - (playerX * p);
        let w = p * (canvas.width * 0.8) + 40;
        ctx.fillStyle = Math.sin(i * 0.5 + playerDist * 0.2) > 0 ? "#333" : "#444";
        ctx.fillRect(x - w/2, i, w, 6);
    }

    // Inimigos e Jogador
    enemies.forEach(e => { if(e.z > 0) drawF1Car(e.x, e.y, 1 - e.z/4000, e.color); });
    drawF1Car(canvas.width/2, canvas.height * 0.88, 1.1, "#E00");

    // HUD
    ctx.fillStyle = "black"; ctx.fillRect(0,0, canvas.width, 50);
    ctx.fillStyle = "yellow"; ctx.font = "bold 16px Courier";
    ctx.fillText(`CARS: ${carsRemaining}`, 20, 30);
}

update();