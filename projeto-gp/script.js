  /**
 * GP 1 RETRO - ENGINE COMPLETA (VERSÃO INTERLAGOS REALISTA)
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const mapCanvas = document.getElementById('trackMap');
const mapCtx = mapCanvas.getContext('2d');

const speedElement = document.getElementById('speed');
const timerElement = document.getElementById('timer');
const bestElement = document.getElementById('best');
const trackDisplay = document.getElementById('track-display');
const wheel = document.getElementById('steering-wheel');

canvas.width = 640;
canvas.height = 480;

// Configurações de Projeção e Escala
const segmentLength = 200;
const cameraHeight = 1200; 
const drawDistance = 300;
const trackWidth = 5000; // Alargada para preencher o cockpit

// Variáveis de Controle
let playerPos = 0;
let playerX = 0; 
let speed = 0;
let startTime = Date.now();
let bestTime = Infinity;
let currentTrackIndex = 0;
let segments = [];
let visualWheelAngle = 0;

const TRACKS = [
    { 
        name: "INTERLAGOS", 
        // Sequência: Reta, S do Senna, Reta Oposta, Curvas de Baixa, Subida dos Boxes
        curves: [0, 0, 0, -4, -6, 0, 2, 0, 0, 0, 4, 6, 2, 0, 0], 
        hills:  [0, 0, -2, -4, 0, 2, 4, 4, 2, 0, 0, 5, 8, 5, 0] 
    },
    { name: "MONACO", curves: [0, 5, -5, 2, 8, 2, 0, 5, 0], hills: [0,0,0,0,0,0,0,0,0] },
    { name: "IMOLA", curves: [0, -3, 0, -4, 2, 0, -3, 0, 0], hills: [0,0,0,0,0,0,0,0,0] }
];

function buildTrack() {
    segments = [];
    const track = TRACKS[currentTrackIndex];
    trackDisplay.innerText = "PISTA: " + track.name;

    const sectionSize = 600; // Torna as retas e curvas muito mais longas
    for (let i = 0; i < track.curves.length * sectionSize; i++) {
        let curveValue = track.curves[Math.floor(i / sectionSize)];
        let hillValue = track.hills[Math.floor(i / sectionSize)] || 0;

        segments.push({
            index: i,
            p1: { world: { x: 0, y: 0, z: i * segmentLength }, screen: {} },
            p2: { world: { x: 0, y: 0, z: (i + 1) * segmentLength }, screen: {} },
            curve: curveValue,
            hill: hillValue,
            color: Math.floor(i / 10) % 2 ? '#444' : '#3d3d3d'
        });
    }

    // Aplica a elevação (Hills) suavemente entre os segmentos
    for (let i = 1; i < segments.length; i++) {
        segments[i].p1.world.y = segments[i-1].p2.world.y;
        segments[i].p2.world.y = segments[i].p1.world.y + (segments[i].hill * 20);
    }
}

function project(p, cameraX, cameraY, cameraZ) {
    const pz = p.world.z - cameraZ;
    const scale = cameraHeight / (pz <= 0 ? 1 : pz);
    
    p.screen.x = (canvas.width / 2) + (scale * (p.world.x - cameraX));
    p.screen.y = (canvas.height / 2) - (scale * (p.world.y - cameraY)); 
    p.screen.w = scale * trackWidth;
}

const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };
window.addEventListener('keydown', e => { if (keys.hasOwnProperty(e.key)) keys[e.key] = true; });
window.addEventListener('keyup', e => { if (keys.hasOwnProperty(e.key)) keys[e.key] = false; });

function update() {
    // Aceleração e Travagem
    if (keys.ArrowUp) speed += 1.5;
    else if (keys.ArrowDown) speed -= 5;
    else speed *= 0.99; // Atrito natural

    speed = Math.max(0, Math.min(speed, 340));

    // Direção Suave (Reduzido para não ser agressivo)
    const steerLimit = 25;
    const steerSpeed = 2; 
    
    if (keys.ArrowLeft) {
        playerX -= 0.04 * (speed / 400);
        visualWheelAngle = Math.max(visualWheelAngle - steerSpeed, -steerLimit);
    } else if (keys.ArrowRight) {
        playerX += 0.04 * (speed / 400);
        visualWheelAngle = Math.min(visualWheelAngle + steerSpeed, steerLimit);
    } else {
        if (visualWheelAngle > 0) visualWheelAngle -= steerSpeed;
        if (visualWheelAngle < 0) visualWheelAngle += steerSpeed;
    }
    wheel.style.transform = `rotate(${visualWheelAngle}deg)`;

    // Avanço na Pista
    playerPos += speed;

    const trackLength = segments.length * segmentLength;
    if (playerPos >= trackLength) {
        let finishTime = (Date.now() - startTime) / 1000;
        if (finishTime < bestTime) {
            bestTime = finishTime;
            bestElement.innerText = bestTime.toFixed(2) + "s";
        }
        playerPos = 0;
        startTime = Date.now();
    }

    speedElement.innerText = Math.floor(speed);
    timerElement.innerText = ((Date.now() - startTime) / 1000).toFixed(2);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Desenho do Céu e Grama
    ctx.fillStyle = '#87CEEB'; ctx.fillRect(0, 0, canvas.width, canvas.height / 2);
    ctx.fillStyle = '#107c10'; ctx.fillRect(0, canvas.height / 2, canvas.width, canvas.height / 2);

    const startSegment = Math.floor(playerPos / segmentLength);
    const cameraZ = playerPos;
    
    // Altura da câmera acompanha o relevo da pista
    const currentHeight = segments[startSegment % segments.length].p1.world.y;
    const camY = currentHeight + cameraHeight;

    let x = 0, dx = 0;

    for (let n = 0; n < drawDistance; n++) {
        const segment = segments[(startSegment + n) % segments.length];
        
        dx += segment.curve;
        x += dx;

        // Projetar pontos com suporte a altura (Hill)
        project(segment.p1, (playerX * trackWidth) - x, camY, cameraZ);
        project(segment.p2, (playerX * trackWidth) - (x + dx), camY, cameraZ);

        if (segment.p1.screen.y <= segment.p2.screen.y) continue;

        // Asfalto
        ctx.fillStyle = (segment.index < 20) ? '#fff' : segment.color; 
        ctx.beginPath();
        ctx.moveTo(segment.p1.screen.x - segment.p1.screen.w, segment.p1.screen.y);
        ctx.lineTo(segment.p1.screen.x + segment.p1.screen.w, segment.p1.screen.y);
        ctx.lineTo(segment.p2.screen.x + segment.p2.screen.w, segment.p2.screen.y);
        ctx.lineTo(segment.p2.screen.x - segment.p2.screen.w, segment.p2.screen.y);
        ctx.fill();

        // Zebras
        const zW = segment.p1.screen.w * 0.15;
        ctx.fillStyle = (Math.floor(segment.index / 5) % 2) ? '#fff' : '#c80000';
        ctx.fillRect(segment.p1.screen.x - segment.p1.screen.w - zW, segment.p1.screen.y, zW, 5);
        ctx.fillRect(segment.p1.screen.x + segment.p1.screen.w, segment.p1.screen.y, zW, 5);

        // Sinalização de Curva (Placas <<< ou >>>)
        const futureCurve = segments[(segment.index + 50) % segments.length].curve;
        if (Math.abs(futureCurve) > 2 && n % 40 === 0) {
            ctx.fillStyle = "white";
            const side = futureCurve > 0 ? 1.2 : -1.8;
            ctx.fillRect(segment.p1.screen.x + (side * segment.p1.screen.w), segment.p1.screen.y - 100, 80, 50);
            ctx.fillStyle = "black";
            ctx.font = "bold 20px Arial";
            ctx.fillText(side > 0 ? ">>>" : "<<<", segment.p1.screen.x + (side * segment.p1.screen.w) + 10, segment.p1.screen.y - 65);
        }
    }

    drawRealMap();
    update();
    requestAnimationFrame(draw);
}

function drawRealMap() {
    mapCtx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);
    mapCtx.strokeStyle = "yellow";
    mapCtx.lineWidth = 3;
    mapCtx.lineJoin = "round";
    mapCtx.beginPath();
    
    let mx = 60, my = 90; 
    let currentAngle = -Math.PI / 2;
    mapCtx.moveTo(mx, my);

    TRACKS[currentTrackIndex].curves.forEach(curve => {
        currentAngle += (curve * 0.2);
        mx += Math.cos(currentAngle) * 15;
        my += Math.sin(currentAngle) * 15;
        mapCtx.lineTo(mx, my);
    });

    mapCtx.closePath();
    mapCtx.stroke();
    
    // Ponto de Partida
    mapCtx.fillStyle = "white";
    mapCtx.beginPath();
    mapCtx.arc(60, 90, 4, 0, Math.PI * 2);
    mapCtx.fill();
}

function changeTrack(direction) {
    currentTrackIndex = (currentTrackIndex + direction + TRACKS.length) % TRACKS.length;
    bestTime = Infinity;
    bestElement.innerText = "--:--";
    playerPos = 0; speed = 0; startTime = Date.now();
    buildTrack();
}

buildTrack();
draw();