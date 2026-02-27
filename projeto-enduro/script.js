 // --- CONFIGURAÇÃO INICIAL DO CANVAS ---
// Seleciona o elemento de desenho e define o contexto 2D e o tamanho da tela
const canvas = document.getElementById ('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 400; canvas.height = 400;

// --- VARIÁVEIS DE CONTROLE DE ESTADO ---
// Gerenciam posição, velocidade, tempo, metas e se o jogo está pausado ou rodando
let playerX = 0, speed = 0, gameTick = 0, playerDist = 0;
let dayNumber = 1, baseGoal = 200, carsRemaining = baseGoal;
let gameState = "PLAYING"; 
let isPaused = false;

// --- SISTEMA DE RECORDES ---
// dayBestRecord e totalBestRecord usam LocalStorage para não serem perdidos ao fechar o navegador
let dayBestRecord = 0;     
let odometerNow = 0;       
let totalBestRecord = 0;   
let hasPlayedGoalMedia = false; 

// --- CONFIGURAÇÕES DE VELOCIDADE E TEMPO ---
// Define a duração de cada estágio (manhã, noite, neve, etc) e a duração total do dia
const maxSpeed = 16; 
const STAGE_DURATION = 9000; 
const DAY_DURATION = STAGE_DURATION * 9; 
let currentTime = 0; 

let enemies = []; // Armazena os carros adversários

// --- SISTEMA DE CURVAS ---
// Controla a inclinação da estrada para criar o efeito de direção
let roadCurve = 0;      
let targetCurve = 0;    
let curveTimer = 0;     
let curveSpeed = 0.015; 

// --- CLIMA E PARTÍCULAS ---
// Gerencia a chuva (raindrops) e o efeito visual de relâmpagos
let raindrops = []; 
let lightningAlpha = 0; 

// --- CONFIGURAÇÃO DE ÁUDIO ---
// Carrega os arquivos de som e define volumes e loops
const sfxChuva = new Audio('chuva.mp3');
sfxChuva.loop = true;
sfxChuva.volume = 0.5; 
const sfxTrovao = new Audio('trovao.mp3');
sfxTrovao.volume = 0.7;
const sfxDerrota = new Audio('game_over.mp3');
const sfxVitoriaAudio = new Audio('vitoria.mp3');

// --- CRIAÇÃO DINÂMICA DE VÍDEOS ---
// Cria elementos de vídeo para exibir nas telas de vitória ou derrota
const videoVitoria = document.createElement('video');
videoVitoria.src = 'bandeira_vitoria.mp4';
videoVitoria.style.position = 'absolute';
videoVitoria.style.top = '55px'; videoVitoria.style.left = '0';
videoVitoria.style.width = '400px'; videoVitoria.style.height = '345px';
videoVitoria.style.display = 'none'; videoVitoria.style.zIndex = '10';
videoVitoria.muted = true; videoVitoria.load();
document.body.appendChild(videoVitoria);

const videoDerrota = document.createElement('video');
videoDerrota.src = 'game_over.mp4';
videoDerrota.style.position = 'absolute';
videoDerrota.style.top = '55px'; videoDerrota.style.left = '0';
videoDerrota.style.width = '400px'; videoDerrota.style.height = '345px';
videoDerrota.style.display = 'none'; videoDerrota.style.zIndex = '10';
videoDerrota.muted = true; videoDerrota.load();
document.body.appendChild(videoDerrota);

// --- FUNÇÃO: SALVAR PROGRESSO ---
// Converte os dados atuais em JSON e salva no navegador (LocalStorage)
function saveProgress() {
    const gameData = {
        dayNumber: dayNumber,
        carsRemaining: carsRemaining,
        playerDist: playerDist,
        currentTime: currentTime,
        odometerNow: odometerNow,
        dayBestRecord: dayBestRecord,
        totalBestRecord: totalBestRecord,
        hasPlayedGoalMedia: hasPlayedGoalMedia
    };
    localStorage.setItem('enduro_pro_data', JSON.stringify(gameData));
}

// --- FUNÇÃO: CARREGAR PROGRESSO ---
// Recupera os dados salvos anteriormente ao iniciar o jogo
function loadProgress() {
    const savedData = localStorage.getItem('enduro_pro_data');
    if (savedData) {
        const data = JSON.parse(savedData);
        dayNumber = data.dayNumber;
        carsRemaining = data.carsRemaining;
        playerDist = data.playerDist;
        currentTime = data.currentTime;
        odometerNow = data.odometerNow || 0;
        dayBestRecord = data.dayBestRecord || 0;
        totalBestRecord = data.totalBestRecord || 0;
        hasPlayedGoalMedia = data.hasPlayedGoalMedia || false;
    }
}
loadProgress();

// --- CONTROLES DE TECLADO ---
// Monitora quais teclas estão pressionadas para mover o carro
const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

window.addEventListener('keydown', e => { 
    if (keys.hasOwnProperty(e.code)) keys[e.code] = true; 
    if (audioCtx.state === 'suspended') audioCtx.resume();
});
window.addEventListener('keyup', e => { if (keys.hasOwnProperty(e.code)) keys[e.code] = false; });

// --- FUNÇÃO: SOM DO MOTOR ---
// Gera um som sintetizado via código que muda de frequência conforme a velocidade
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

// --- FUNÇÃO: SOM DE COLISÃO ---
// Gera um ruído curto quando o jogador bate em outro carro
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

// --- FUNÇÃO: PAUSAR ---
// Interrompe o loop do jogo e salva o progresso atual
function togglePause() {
    if (gameState === "PLAYING") {
        isPaused = !isPaused;
        const btn = document.getElementById('pauseBtn');
        if (btn) btn.innerText = isPaused ? "Retomar" : "Pausar";
        if (isPaused) { sfxChuva.pause(); saveProgress(); }
        if (!isPaused) { audioCtx.resume(); update(); }
    }
}

// --- FUNÇÃO: REINICIAR JOGO ---
// Volta ao Dia 1 e reseta todas as métricas de progresso da partida
function resetGame() {
    dayNumber = 1; 
    baseGoal = 200; 
    odometerNow = 0; 
    resetDay();
    if (gameState !== "PLAYING") { gameState = "PLAYING"; update(); }
}

// --- FUNÇÃO: REINICIAR DIA ---
// Reseta o cronômetro e a posição, preparando para o próximo nível (próximo dia)
function resetDay() {
    currentTime = 0; 
    playerDist = 0; 
    speed = 0; 
    enemies = [];
    carsRemaining = 200 + ((dayNumber - 1) * 10);
    gameState = "PLAYING"; 
    isPaused = false;
    hasPlayedGoalMedia = false;
    if (sfxChuva) { sfxChuva.pause(); sfxChuva.currentTime = 0; }
    saveProgress();
}

// --- FUNÇÃO: DESENHAR CARRO F1 ---
// Função complexa que desenha tanto o jogador quanto os inimigos, tratando luzes e cores
 function drawF1Car(x, y, scale, color, isPlayer = false, nightMode = false, hasFog = false, isRainy = false) {
    let s = scale * 1.2;
    if (s < 0.02 || s > 30) return;
    let w = 45 * s; let h = 22 * s;
    
    ctx.save();
    ctx.translate(x, y);
    if(isPlayer) ctx.rotate((roadCurve / 80) * Math.PI / 180);
    
    // --- LÓGICA DE ILUMINAÇÃO (Original) ---
    if (nightMode || hasFog || isRainy) {
        ctx.fillStyle = "#FF0000"; 
        ctx.fillRect(-w * 0.35, h * 0.2, w * 0.15, h * 0.25); 
        ctx.fillRect(w * 0.20, h * 0.2, w * 0.15, h * 0.25); 
        let lightLength = h * 3; 
        let gradient = ctx.createLinearGradient(0, 0, 0, -lightLength);
        gradient.addColorStop(0, "rgba(255, 255, 200, 0.25)"); 
        gradient.addColorStop(1, "rgba(255, 255, 200, 0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(-w * 0.15, 0); ctx.lineTo(-w * 0.8, -lightLength); 
        ctx.lineTo(w * 0.8, -lightLength); ctx.lineTo(w * 0.15, 0);
        ctx.fill();
    }

    // --- DESENHO ORIGINAL COM "EXTENSÃO DE BATIDA" ---
    if (!(nightMode || (hasFog && !isRainy))) {
        // 1. Rodas (Originais)
        ctx.fillStyle = "#111"; 
        ctx.fillRect(-w * 0.5, -h * 0.1, w * 0.25, h * 0.8);
        ctx.fillRect(w * 0.25, -h * 0.1, w * 0.25, h * 0.8);

        // 2. EXTENSÃO PARA BATIDA (O seu "1mm" extra para frente e trás)
        // Desenhamos um retângulo extra da mesma cor que une as rodas
        ctx.fillStyle = color;
        let extra = 4 * s; // Representa o "1mm" proporcional à escala
        ctx.fillRect(-w * 0.25, h * 0.1 - extra, w * 0.5, h * 0.4 + (extra * 2));

        // 3. Corpo e Aerofólio (Originais)
        ctx.fillStyle = color; 
        ctx.fillRect(-w * 0.25, h * 0.1, w * 0.5, h * 0.4); // Cockpit
        ctx.fillRect(-w * 0.5, -h * 0.3, w, h * 0.2);       // Aerofólio traseiro
    }
    ctx.restore();
}

// --- FUNÇÃO: LÓGICA PRINCIPAL (UPDATE) ---
// Onde tudo acontece: física, colisão, clima, tempo e mudança de cores
function update() {
    if (isPaused) return; 

    // Define qual o estágio do dia baseado no tempo decorrido
    let currentStage = Math.min(Math.floor(currentTime / STAGE_DURATION), 8);
    let isRaining = (currentStage === 3 || currentStage === 7);
    let warningLightning = (currentStage === 2); 

    // Configura as cores do cenário para cada fase (manhã, pôr do sol, noite, etc)
    let colors = { sky: "#87CEEB", grass: "#1a7a1a", fog: 0, mt: "#555", nightMode: false, snowCaps: false };
    switch(currentStage) {
        case 0: colors.snowCaps = true; break; 
        case 1: colors.sky = "#DDD"; colors.grass = "#FFF"; colors.mt = "#999"; colors.snowCaps = true; break; 
        case 2: colors.sky = "#ff8c00"; colors.grass = "#145c14"; colors.mt = "#442200"; break; 
        case 3: colors.sky = "#2c3e50"; colors.grass = "#0a2a0a"; colors.mt = "#1a1a1a"; colors.fog = 0.6; break; 
        case 4: colors.sky = "#0d0d0e"; colors.grass = "#080808"; colors.mt = "#111"; colors.nightMode = true; break; 
        case 5: colors.sky = "#000011"; colors.grass = "#000800"; colors.mt = "#000"; colors.fog = 0.8; colors.nightMode = true; break; 
        case 6: colors.sky = "#000011"; colors.grass = "#000800"; colors.mt = "#000"; colors.nightMode = true; break; 
        case 7: colors.sky = "#2c3e50"; colors.grass = "#0a2a0a"; colors.mt = "#1a1a1a"; colors.fog = 0.6; break; 
        case 8: colors.sky = "#ade1f2"; colors.grass = "#1a7a1a"; colors.mt = "#555"; colors.snowCaps = true; break; 
    }

    // Para o processamento se o jogador ganhou ou perdeu
    if (gameState === "WIN_DAY" || gameState === "GAME_OVER") { 
        sfxChuva.pause();
        draw(colors, isRaining); 
        requestAnimationFrame(update); 
        return; 
    }

    // Incrementa distância e odômetro conforme a velocidade
    gameTick++; 
    if (speed > 0) {
        let delta = (speed / 10);
        playerDist += delta;
        odometerNow += delta; 
    }
    currentTime++; 
    if (gameTick % 4 === 0) playEngineSound();
    
    // Atualiza recordes históricos
    if (playerDist > dayBestRecord) dayBestRecord = playerDist;
    if (odometerNow > totalBestRecord) totalBestRecord = odometerNow;

    // Atualiza os textos da interface na tela (DOM)
    const uiDist = document.getElementById('ui-dist');
    const uiDayBest = document.getElementById('ui-day-best');
    const uiTotalNow = document.getElementById('ui-total-now');
    const uiTotalBest = document.getElementById('ui-total-best');
    
    if(uiDist) uiDist.innerText = (playerDist / 100).toFixed(1) + " KM";
    if(uiDayBest) uiDayBest.innerText = (dayBestRecord / 100).toFixed(1) + " KM";
    if(uiTotalNow) uiTotalNow.innerText = (odometerNow / 100).toFixed(1) + " KM";
    if(uiTotalBest) uiTotalBest.innerText = (totalBestRecord / 100).toFixed(1) + " KM";

    // Auto-save a cada 5 segundos aproximadamente
    if (gameTick % 300 === 0) saveProgress();

    // Gerencia efeitos de clima e raios
    if (isRaining || warningLightning) {
        if (isRaining && sfxChuva.paused && audioCtx.state === 'running') sfxChuva.play().catch(e => {}); 
        if (Math.random() > 0.996) { 
            lightningAlpha = 0.7; 
            if (audioCtx.state === 'running') {
                sfxTrovao.volume = warningLightning ? 0.15 : 0.7;
                sfxTrovao.play().catch(e => {});
            }
        }
    } else { sfxChuva.pause(); }

    // Criação e movimentação das gotas de chuva
    if (isRaining) {
        for (let i = 0; i < 12; i++) raindrops.push({ x: Math.random() * 400, y: -20, s: Math.random() * 10 + 22 });
    }
    raindrops.forEach((r, i) => { r.y += r.s; if (r.y > 400) raindrops.splice(i, 1); });
    if (lightningAlpha > 0) lightningAlpha -= 0.05;

    // Verifica se a meta de ultrapassagens foi batida e exibe vídeo de vitória
    if (carsRemaining <= 0 && !hasPlayedGoalMedia) {
        hasPlayedGoalMedia = true;
        carsRemaining = 0; 
        sfxVitoriaAudio.play().catch(e => {});
        videoVitoria.style.display = 'block';
        videoVitoria.play().catch(e => {});
        setTimeout(() => { videoVitoria.style.display = 'none'; }, 4000);
    }

     // Lógica de final de dia (se o tempo acabou, verifica se venceu ou perdeu)
     if (currentTime >= DAY_DURATION) {
        if (carsRemaining <= 0) {
            if (gameState !== "WIN_DAY") { 
                gameState = "WIN_DAY"; 
                dayNumber++; 
                baseGoal = 200 + ((dayNumber - 1) * 10);
                saveProgress();
                setTimeout(() => { resetDay(); }, 4000); 
            }
        } else { 
            if (gameState !== "GAME_OVER") { 
                gameState = "GAME_OVER"; sfxDerrota.play();
                videoDerrota.style.display = 'block'; videoDerrota.play().catch(e => {});
                saveProgress(); 
            }
        }
        currentTime = DAY_DURATION - 1; 
    }

    // Aceleração, Frenagem e física de Off-Road (grama reduz velocidade)
    let offRoad = Math.abs(playerX) > 380;
    if (keys.ArrowUp) {
        let accel = (speed < 5) ? 0.03 : 0.08;
        speed = Math.min(speed + accel, offRoad ? 2 : maxSpeed);
    } else if (keys.ArrowDown) {
        speed = Math.max(speed - 0.2, 0); 
    } else {
        speed = Math.max(speed - 0.05, 0); 
    }

    // Movimentação lateral do jogador e influência da curva da estrada
    playerX -= (roadCurve * 0.06) * (speed / maxSpeed); 
    if (keys.ArrowLeft) playerX -= 5;
    if (keys.ArrowRight) playerX += 5;
    playerX = Math.max(-480, Math.min(480, playerX));

    // Lógica que decide quando a estrada vai fazer uma curva
    if (--curveTimer <= 0) { 
        if (Math.random() > 0.6) { targetCurve = 0; curveTimer = 100 + Math.random() * 200; }
        else { targetCurve = (Math.random() - 0.5) * 160; curveTimer = 80 + Math.random() * 150; }
    }
    roadCurve += (targetCurve - roadCurve) * curveSpeed;

    // Lógica dos Carros Inimigos: Movimento, Ultrapassagem e Colisão
    enemies.forEach((enemy) => {
        let effectiveEnemySpeed = (speed < 16) ? 16 : enemy.v; 
        enemy.z -= (speed - effectiveEnemySpeed);
        let p = 1 - (enemy.z / 4000); 
        let roadWidth = 20 + p * 800;
        let screenX = (200 - playerX * 0.05) + (roadCurve * p * p) - (playerX * p) + (enemy.lane * roadWidth * 0.5);
        
        // Verifica batida (p > 0.92 é quando o carro está perto do jogador)
        if (p > 0.92 && p < 1.05 && Math.abs(screenX - 200) < 50) { 
            speed = -4; enemy.z += 800; playCrashSound(); 
        }
        
        // Contabiliza se o carro foi ultrapassado
        if (!hasPlayedGoalMedia) {
            if (enemy.z <= 0 && !enemy.isOvertaken) { carsRemaining--; enemy.isOvertaken = true; }
            if (enemy.z > 0 && enemy.isOvertaken) { carsRemaining++; enemy.isOvertaken = false; }
        }

        enemy.lastY = 200 + (p * 140); enemy.lastX = screenX; enemy.lastP = p;
    });

    // Cria novos carros inimigos periodicamente
    if (gameTick % 218 === 0 && enemies.length < 100) {
        enemies.push({ 
            lane: (Math.random() - 0.5) * 1.8, z: 4000, v: 8.5, 
            color: ["#F0F", "#0FF", "#0F0", "#FF0"][Math.floor(Math.random() * 4)],
            isOvertaken: false 
        });
    }

    // Remove carros que já ficaram muito para trás
    enemies = enemies.filter(e => e.z > -21800 && e.z < 6000);
    draw(colors, isRaining);
    requestAnimationFrame(update);
}

// --- FUNÇÃO: DESENHAR (RENDERIZAÇÃO) ---
// Desenha tudo no Canvas: céu, grama, montanhas, estrada e interface
function draw(colors, isRaining) {
    ctx.fillStyle = colors.sky; ctx.fillRect(0, 0, 400, 200);
    ctx.fillStyle = colors.grass; ctx.fillRect(0, 200, 400, 200);
    
    // Desenha as montanhas de fundo com parallax (elas movem com a curva)
    let mtShift = (roadCurve * 0.6);
    for (let i = -3; i < 9; i++) {
        let bx = (i * 100) + mtShift;
        ctx.fillStyle = colors.mt;
        ctx.beginPath(); ctx.moveTo(bx - 70, 200); ctx.lineTo(bx, 130); ctx.lineTo(bx + 70, 200); ctx.fill();
        if (colors.snowCaps) { ctx.fillStyle = "white"; ctx.beginPath(); ctx.moveTo(bx, 130); ctx.lineTo(bx - 25, 155); ctx.lineTo(bx + 25, 155); ctx.fill(); }
    }

    // Desenha a estrada linha por linha para criar o efeito de profundidade (Perspectiva)
    for (let i = 200; i < 400; i += 4) {
        let p = (i - 200) / 140; 
        let x = (200 - playerX * 0.05) + (roadCurve * p * p) - (playerX * p);
        let w = 20 + p * 800;
        let asphaltColor1 = colors.nightMode ? "#050505" : "#333"; 
        let asphaltColor2 = colors.nightMode ? "#0a0a0a" : "#3d3d3d";
        ctx.fillStyle = Math.sin(i * 0.5 + playerDist * 0.2) > 0 ? asphaltColor1 : asphaltColor2;
        ctx.fillRect(x - w/2, i, w, 4);
        
        // Zebras laterais da estrada
        let curbColor1 = colors.nightMode ? "#600" : "red";
        let curbColor2 = colors.nightMode ? "#888" : "white";
        ctx.fillStyle = Math.sin(i * 0.5 + playerDist * 0.2) > 0 ? curbColor1 : curbColor2;
        ctx.fillRect(x - w/2 - 12*p, i, 12*p, 4);
        ctx.fillRect(x + w/2, i, 12*p, 4); 
    }

    // Desenha carros distantes, o jogador e carros próximos (ordem de sobreposição)
    let hasFog = colors.fog > 0;
    enemies.sort((a,b) => b.z - a.z).forEach(e => {
        if (e.lastP > 0 && e.lastP < 0.92) drawF1Car(e.lastX, e.lastY, e.lastP * 0.85, e.color, false, colors.nightMode, hasFog, isRaining);
    });
    
    drawF1Car(200, 350, 0.85, "#E00", true, colors.nightMode, hasFog, isRaining); 
    
    enemies.forEach(e => {
        if (e.lastP >= 0.92) drawF1Car(e.lastX, e.lastY, e.lastP * 0.85, e.color, false, colors.nightMode, hasFog, isRaining);
    });

    // Filtros visuais de Neblina, Chuva e Relâmpago
    if (colors.fog > 0) { ctx.fillStyle = `rgba(140,145,160,${colors.fog})`; ctx.fillRect(0, 55, 400, 345); }
    if (isRaining) {
        ctx.strokeStyle = "rgba(200, 210, 255, 0.49)"; ctx.lineWidth = 1.2;
        raindrops.forEach(r => { ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x + 1.5, r.y + 12); ctx.stroke(); });
    }
    if (lightningAlpha > 0) { ctx.fillStyle = `rgba(255, 255, 255, ${lightningAlpha})`; ctx.fillRect(0, 55, 400, 345); }

    // UI Superior (Painel de instrumentos dentro do Canvas)
    ctx.fillStyle = "black"; ctx.fillRect(0, 0, 400, 55);
    ctx.fillStyle = (hasPlayedGoalMedia) ? "lime" : "yellow";
    ctx.font = "bold 18px Courier";
    let carText = (hasPlayedGoalMedia) ? "CARS: 000" : `CARS: ${carsRemaining}`;
    ctx.fillText(carText, 15, 35);
    ctx.fillStyle = "yellow"; ctx.fillText(`DAY: ${dayNumber}`, 180, 35);
    
    // Barra de tempo decorrido
    ctx.fillStyle = "#444"; ctx.fillRect(280, 20, 100, 15);
    ctx.fillStyle = "lime"; ctx.fillRect(280, 20, (currentTime/DAY_DURATION) * 100, 15);

    // Mensagem de Dia Completo
    if (gameState === "WIN_DAY") {
        ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(0, 55, 400, 345);
        ctx.fillStyle = "lime"; ctx.textAlign = "center";
        ctx.font = "bold 25px Courier"; ctx.fillText(`DIA ${dayNumber-1} COMPLETO!`, 200, 180);
        ctx.textAlign = "left";
    }
}

// Inicia o ciclo do jogo
update();