 const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 400; canvas.height = 400;

let playerX = 0, speed = 0, gameTick = 0, playerDist = 0;
let dayNumber = 1, baseGoal = 200, carsRemaining = baseGoal; 
let gameState = "PLAYING"; 
let isPaused = false;

const maxSpeed = 12; 
const STAGE_DURATION = 12800; // 3,5 minutos
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
        // Silhueta do carro (Preto/Cinza escuro)
        ctx.fillStyle = "#111"; 
        ctx.fillRect(-w * 0.5, -h * 0.1, w * 0.25, h * 0.8);
        ctx.fillRect(w * 0.25, -h * 0.1, w * 0.25, h * 0.8);
        ctx.fillRect(-w * 0.25, h * 0.1, w * 0.5, h * 0.4); 
        ctx.fillRect(-w * 0.5, -h * 0.3, w, h * 0.2);

        // Faróis (Luz fraca na frente)
        ctx.fillStyle = "rgba(255, 255, 200, 0.2)";
        ctx.beginPath();
        ctx.arc(-w * 0.3, h * 0.5, w * 0.2, 0, Math.PI * 2);
        ctx.arc(w * 0.3, h * 0.5, w * 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Lanternas Traseiras Vermelhas
        ctx.fillStyle = "#ff0000";
        ctx.fillRect(-w * 0.45, -h * 0.2, w * 0.2, h * 0.2); 
        ctx.fillRect(w * 0.25, -h * 0.2, w * 0.2, h * 0.2);
    } else {
        // Desenho normal para o dia
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
    
    if (gameState === "WIN_DAY" || gameState === "GAME_OVER") { 
        draw(); 
        requestAnimationFrame(update); 
        return; 
    }

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
            gameState = "WIN_DAY"; 
            dayNumber++; 
            setTimeout(resetDay, 3500);
        } else { 
            gameState = "GAME_OVER"; 
        }
    }

    let offRoad = Math.abs(playerX) > 380;
    speed = Math.min(speed + (offRoad ? 0.025 : 0.06), offRoad ? 2 : maxSpeed); 
    if (keys.ArrowDown) speed = Math.max(speed - 0.2, 0);

    // Movimento lateral suave e estabilidade na curva
    playerX -= (roadCurve / 35) * (speed / maxSpeed); 
    if (keys.ArrowLeft) playerX -= 4.5;
    if (keys.ArrowRight) playerX += 4.5;
    playerX = Math.max(-450, Math.min(450, playerX));

    if (--curveTimer <= 0) { targetCurve = (Math.random() - 0.5) * 160; curveTimer = 120; }
    roadCurve += (targetCurve - roadCurve) * 0.02;

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
        
        let p = 1 - (enemy.z / 4000); 
        let roadWidth = 20 + p * 800;
        let screenX = (200 - playerX * 0.05) + (roadCurve * p * p) - (playerX * p) + (enemy.lane * roadWidth * 0.5);
        
        // --- NOVA LÓGICA DE COLISÃO REFORÇADA ---
        // Aumentamos a largura (hitBoxWidth) para 50 para garantir o choque lateral.
        // Mas mantemos a profundidade curta (p entre 0.92 e 1.05) para não bater no ar.
        let hitBoxWidth = 50; 
        if (p > 0.92 && p < 1.05) { 
            if (Math.abs(screenX - 200) < hitBoxWidth) { 
                speed = -1; 
                enemy.z += 800; 
                playCrashSound(); 
            }
        }

        if (gameState === "PLAYING" || gameState === "GOAL_REACHED") {
            if (enemy.z <= 0 && !enemy.isOvertaken) { carsRemaining--; enemy.isOvertaken = true; }
            if (enemy.z > 0 && enemy.isOvertaken) { carsRemaining++; enemy.isOvertaken = false; }
            if (carsRemaining <= 0) { carsRemaining = 0; gameState = "GOAL_REACHED"; }
        }
        
        enemy.lastY = 200 + (p * 140); enemy.lastX = screenX; enemy.lastP = p;
    });

    enemies = enemies.filter(e => e.z > -15000 && e.z < 6000);
    draw(colors);
    requestAnimationFrame(update);
}

 function draw(colors) {
    // Caso colors não esteja definido por algum erro, define um padrão seguro
    if (!colors) colors = { sky: "#87CEEB", grass: "#1a7a1a", mt: "#555", fog: 0, nightMode: false, snowCaps: false };

    // 1. Desenha o Céu e o Chão base
    ctx.fillStyle = colors.sky; 
    ctx.fillRect(0, 0, 400, 200);
    ctx.fillStyle = colors.grass; 
    ctx.fillRect(0, 200, 400, 200);
    
    // 2. Desenha as Montanhas com Picos Nevados
    let mtShift = (roadCurve * 0.8);
    for (let i = -2; i < 8; i++) {
        let bx = (i * 100) + mtShift;
        
        // Corpo da montanha
        ctx.fillStyle = colors.mt;
        ctx.beginPath(); 
        ctx.moveTo(bx - 60, 200); 
        ctx.lineTo(bx, 140); 
        ctx.lineTo(bx + 60, 200); 
        ctx.fill();

        // Picos Nevados (Chapéu branco no topo)
        if (colors.snowCaps) {
            ctx.fillStyle = "white";
            ctx.beginPath();
            ctx.moveTo(bx, 140); // Ponta do topo
            ctx.lineTo(bx - 20, 160); // Lado esquerdo do pico
            ctx.lineTo(bx + 20, 160); // Lado direito do pico
            ctx.fill();
        }
    }

    // 3. Desenha a Estrada (Perspectiva e faixas laterais)
    for (let i = 200; i < 400; i += 4) {
        let p = (i - 200) / 140;
        let x = (200 - playerX * 0.05) + (roadCurve * p * p) - (playerX * p);
        let w = 20 + p * 800;
        
        // Asfalto
        ctx.fillStyle = Math.sin(i * 0.5 + playerDist * 0.2) > 0 ? "#333" : "#3d3d3d";
        ctx.fillRect(x - w/2, i, w, 4);
        
        // Zebras/Faixas laterais
        ctx.fillStyle = Math.sin(i * 0.5 + playerDist * 0.2) > 0 ? "red" : "white";
        ctx.fillRect(x - w/2 - 10*p, i, 10*p, 4);
        ctx.fillRect(x + w/2, i, 10*p, 4);
    }
    
    // 4. Desenha os Inimigos (Ordenados por profundidade Z para sobreposição correta)
    enemies.sort((a,b) => b.z - a.z).forEach(e => {
        if (e.lastP > 0 && e.lastP < 0.92) {
            drawF1Car(e.lastX, e.lastY, e.lastP * 0.85, e.color, false, colors.nightMode);
        }
    });
    
    // 5. Desenha o Carro do Jogador (Sempre à frente)
    drawF1Car(200, 350, 0.85, "#E00", true, colors.nightMode); 

    enemies.forEach(e => {
    if (e.lastP >= 0.92 && e.lastP < 2) {
        drawF1Car(e.lastX, e.lastY, e.lastP * 0.85, e.color, false, colors.nightMode);
    }
});

    // 6. Efeito de Neblina (se houver)
    if (colors.fog > 0) {
        ctx.fillStyle = `rgba(200,200,200,${colors.fog})`;
        ctx.fillRect(0, 200, 400, 200);
    }
    
    // 7. Painel Superior (UI - Placar e Progresso)
    ctx.fillStyle = "black"; 
    ctx.fillRect(0, 0, 400, 55);
    
    // Texto de Carros Restantes / Meta batida
    ctx.fillStyle = (gameState === "GOAL_REACHED" || gameState === "WIN_DAY") ? "lime" : "yellow";
    ctx.font = "bold 18px Courier";
    ctx.fillText(gameState === "GOAL_REACHED" || gameState === "WIN_DAY" ? "GOAL OK!" : `CARS: ${carsRemaining}`, 15, 35);
    
    // Dia Atual
    ctx.fillStyle = "yellow"; 
    ctx.fillText(`DAY: ${dayNumber}`, 160, 35);
    
    // Barra de Progresso do Tempo
    ctx.fillStyle = "#444"; 
    ctx.fillRect(260, 20, 120, 15);
    ctx.fillStyle = "lime"; 
    ctx.fillRect(260, 20, (currentTime/DAY_DURATION) * 120, 15);

    // 8. Mensagens de Tela (Vitória, Game Over, Pausa)
    if (gameState === "WIN_DAY") {
        ctx.fillStyle = "rgba(0,0,0,0.7)"; 
        ctx.fillRect(0, 55, 400, 345);
        ctx.fillStyle = "lime"; 
        ctx.textAlign = "center";
        ctx.font = "bold 25px Courier"; 
        ctx.fillText(`DIA ${dayNumber-1} COMPLETO!`, 200, 180);
        ctx.fillStyle = "white"; 
        ctx.font = "18px Courier"; 
        ctx.fillText(`PREPARANDO DIA ${dayNumber}...`, 200, 220);
        ctx.textAlign = "left";
    }

    if (gameState === "GAME_OVER") {
        ctx.fillStyle = "rgba(200,0,0,0.8)"; 
        ctx.fillRect(0, 55, 400, 345);
        ctx.fillStyle = "white"; 
        ctx.textAlign = "center";
        ctx.font = "bold 30px Courier"; 
        ctx.fillText("FIM DE JOGO", 200, 200);
        ctx.font = "15px Courier"; 
        ctx.fillText("META NÃO ALCANÇADA", 200, 240);
        ctx.textAlign = "left";
    }

    if (isPaused) {
        ctx.fillStyle = "rgba(0,0,0,0.5)"; 
        ctx.fillRect(0, 55, 400, 345);
        ctx.fillStyle = "white"; 
        ctx.textAlign = "center";
        ctx.font = "30px Courier"; 
        ctx.fillText("PAUSADO", 200, 200);
        ctx.textAlign = "left";
    }
}
update();