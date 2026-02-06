  const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

let playerX = 0, speed = 0, playerDist = 0, gameTick = 0;
let enemies = [];
let roadCurve = 0, targetCurve = 0, curveTimer = 0;
let carsRemaining = 200;
const keys = { ArrowLeft: false, ArrowRight: false };

// --- BOTÕES ---
const setupBtn = (id, key) => {
    const el = document.getElementById(id);
    el.ontouchstart = (e) => { e.preventDefault(); keys[key] = true; };
    el.ontouchend = (e) => { e.preventDefault(); keys[key] = false; };
};
setupBtn('btnLeft', 'ArrowLeft');
setupBtn('btnRight', 'ArrowRight');

function drawF1Car(x, y, scale, color) {
    let s = scale * (canvas.width / 350); 
    let w = 45 * s; let h = 22 * s;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color; ctx.fillRect(-w/2, -h, w, h*0.5); // Corpo
    ctx.fillStyle = "#111"; ctx.fillRect(-w/1.8, -h, w/4, h); // Rodas
    ctx.fillRect(w/3, -h, w/4, h);
    ctx.restore();
}

function update() {
    gameTick++;
    speed = Math.min(speed + (speed < 4 ? 0.03 : 0.05), 12);

    if (keys.ArrowLeft) playerX -= 9;
    if (keys.ArrowRight) playerX += 9;
    
    playerX -= (roadCurve / 40) * (speed / 12);
    playerDist += speed;

    // Gerador de inimigos em sequência
    let horizonClear = enemies.every(e => e.z < 3200);
    if (gameTick % 110 === 0 && enemies.length < 6 && horizonClear) {
        enemies.push({ 
            lane: (Math.random() - 0.5) * 1.5, 
            z: 4000, v: 7.2, 
            color: ["#F0F","#0FF","#0F0","#FF0"][Math.floor(Math.random()*4)],
            over: false 
        });
    }

    enemies.forEach(e => {
        e.z -= (speed - e.v);
        let p = 1 - (e.z / 4000);
        
        // ESTRADA LARGA: p*p garante o afunilamento real para o horizonte
        let roadW = 20 + (p * p * canvas.width * 1.8); 
        
        e.x = (canvas.width/2) + (roadCurve * p * p) - (playerX * p) + (e.lane * roadW * 0.45);
        e.y = (canvas.height/2) + (p * p * (canvas.height/2.1));

        // COLISÃO AJUSTADA: Agora você só bate se estiver realmente perto
        let hitWidth = (canvas.width * 0.08) * p; 
        if (p > 0.9 && p < 1.05 && Math.abs(e.x - canvas.width/2) < hitWidth) {
            speed = 0.5; e.z += 1000;
        }
        if (e.z <= 0 && !e.over) { carsRemaining--; e.over = true; }
    });

    if (--curveTimer <= 0) { targetCurve = (Math.random() - 0.5) * (canvas.width * 0.3); curveTimer = 150; }
    roadCurve += (targetCurve - roadCurve) * 0.02;
    enemies = enemies.filter(e => e.z > -500);
    draw();
    requestAnimationFrame(update);
}

function draw() {
    // Céu
    ctx.fillStyle = "#87CEEB"; ctx.fillRect(0, 0, canvas.width, canvas.height/2);
    
    // MONTANHAS (Restauradas)
    ctx.fillStyle = "#555";
    for(let m = -1; m < 2; m++) {
        let mx = (canvas.width/2) + (m * canvas.width) - (playerX * 0.1) + (roadCurve * 0.5);
        ctx.beginPath();
        ctx.moveTo(mx - 200, canvas.height/2);
        ctx.lineTo(mx, canvas.height/2 - 100);
        ctx.lineTo(mx + 200, canvas.height/2);
        ctx.fill();
    }

    // Grama
    ctx.fillStyle = "#1a7a1a"; ctx.fillRect(0, canvas.height/2, canvas.width, canvas.height/2);

    // ESTRADA PERSPECTIVA (Larga na base)
    for (let i = canvas.height/2; i < canvas.height; i += 4) {
        let p = (i - canvas.height/2) / (canvas.height/2);
        let roadW = 20 + (p * p * canvas.width * 1.8); 
        let x = (canvas.width/2) + (roadCurve * p * p) - (playerX * p);
        
        ctx.fillStyle = Math.sin(i * 0.5 + playerDist * 0.2) > 0 ? "#333" : "#444";
        ctx.fillRect(x - roadW/2, i, roadW, 4);
    }

    enemies.sort((a,b) => b.z - a.z).forEach(e => {
        let p = 1 - (e.z/4000);
        if(p > 0) drawF1Car(e.x, e.y, p, e.color);
    });

    drawF1Car(canvas.width/2, canvas.height * 0.9, 1.2, "#E00");
}
update();