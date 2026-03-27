 // 1. Configurações Iniciais do Matter.js
const { Engine, Render, Runner, Bodies, Composite, Body, Events, Constraint } = Matter;

const engine = Engine.create();
const world = engine.world;

const render = Render.create({
    element: document.getElementById('game-container'),
    engine: engine,
    options: {
        width: 400,
        height: 600,
        wireframes: false,
        background: '#111'
    }
});

// 2. Variáveis de Controle
let bolasRestantes = 5;
let bolaAtual = null;
let pontuacao = 0;
const scoreElement = document.getElementById('score');
const ballsElement = document.getElementById('balls-count');

// 3. ESTRUTURA DO CAMPO (CORRIGIDA)
const paredeEsq = Bodies.rectangle(5, 300, 10, 600, { isStatic: true });
const paredeDir = Bodies.rectangle(395, 300, 10, 600, { isStatic: true });
const teto = Bodies.rectangle(200, 5, 400, 10, { isStatic: true });

// Calha do Lançador (Afastada da parede para a bola subir livre)
const calhaInterior = Bodies.rectangle(345, 380, 10, 440, { isStatic: true, render: { fillStyle: '#333' } });

// GUIA SUPERIOR CORRIGIDA: Ângulo positivo para criar rampa para a ESQUERDA
// Posicionada para fechar o topo do canhão e guiar a bola para o campo
const guiaSuperior = Bodies.rectangle(320, 50, 120, 20, { 
    isStatic: true, 
    angle: Math.PI * 0.15, // Inclinação horária (Rampa para a esquerda)
    render: { fillStyle: '#444' } 
});

// Abertura Inferior (Onde a bola cai)
const baseEsq = Bodies.rectangle(80, 580, 180, 20, { isStatic: true, angle: 0.3, render: { fillStyle: '#333' } });
const baseDir = Bodies.rectangle(270, 580, 150, 20, { isStatic: true, angle: -0.3, render: { fillStyle: '#333' } });

// 4. LANÇADOR (Base e Pistão)
const lancadorBase = Bodies.rectangle(372, 595, 40, 10, { isStatic: true, render: { fillStyle: '#222' } });
const pistao = Bodies.rectangle(372, 570, 34, 30, { restitution: 0, friction: 0, label: 'pistao', render: { fillStyle: '#ff4444' } });

const molaPistao = Constraint.create({
    bodyA: lancadorBase,
    bodyB: pistao,
    pointB: { x: 0, y: 15 }, 
    stiffness: 0.5,
    length: 5,
    render: { visible: true, strokeStyle: '#ff4444' }
});

// 5. SENSORES (Topo e Inferiores)
function criarBumper(x, y, pontos, cor = '#00d2ff') {
    return Bodies.circle(x, y, 20, {
        isStatic: true,
        label: 'bumper',
        plugin: { pontos: pontos },
        render: { fillStyle: cor }
    });
}

const bumpers = [
    criarBumper(100, 150, 100), // Topo Esq
    criarBumper(200, 100, 250, '#ff0055'), // Centro
    criarBumper(300, 150, 100), // Topo Dir
    criarBumper(80, 420, 50, '#ffcc00'), // Sensor Baixo Esq
    criarBumper(260, 420, 50, '#ffcc00')  // Sensor Baixo Dir
];

// 6. PALETAS (FLIPPERS) COM TRAVA
function criarFlipper(x, y, lado) {
    const flipper = Bodies.rectangle(x, y, 70, 15, {
        chamfer: { radius: 7 },
        render: { fillStyle: '#e74c3c' },
        label: 'flipper_' + lado
    });

    const pivot = Constraint.create({
        pointA: { x: x + (lado === 'esq' ? -35 : 35), y: y },
        bodyB: flipper,
        pointB: { x: (lado === 'esq' ? -35 : 35), y: 0 },
        stiffness: 1, length: 0
    });

    return { body: flipper, pivot: pivot };
}

const fEsq = criarFlipper(130, 530, 'esq');
const fDir = criarFlipper(230, 530, 'dir');

// 7. LÓGICA DE MOVIMENTO E TRAVAS (beforeUpdate)
Events.on(engine, 'beforeUpdate', () => {
    const forcaRetorno = 0.08;
    // Trava e Retorno paleta Esquerda
    if (fEsq.body.angle < 0.25) Body.setAngle(fEsq.body, fEsq.body.angle + forcaRetorno);
    if (fEsq.body.angle > 0.25) Body.setAngle(fEsq.body, 0.25);

    // Trava e Retorno paleta Direita
    if (fDir.body.angle > -0.25) Body.setAngle(fDir.body, fDir.body.angle - forcaRetorno);
    if (fDir.body.angle < -0.25) Body.setAngle(fDir.body, -0.25);
});

// 8. FUNÇÕES DE JOGO (BOLA E DISPARO)
function novaBola() {
    if (bolasRestantes > 0 && (!bolaAtual || bolaAtual.position.y > 600)) {
        if (bolaAtual) Composite.remove(world, bolaAtual);
        bolaAtual = Bodies.circle(372, 530, 11, {
            restitution: 0.5,
            density: 0.002,
            label: 'bola',
            render: { fillStyle: '#eee' }
        });
        Composite.add(world, bolaAtual);
        bolasRestantes--;
        ballsElement.innerText = bolasRestantes;
    }
}

function disparar() {
    if (bolaAtual && bolaAtual.position.x > 350) {
        Body.setVelocity(bolaAtual, { x: 0, y: -32 });
        Body.applyForce(pistao, pistao.position, { x: 0, y: -0.05 });
    }
}

// 9. CONTROLES MOBILE (Touch) E MOUSE
const controls = {
    left: () => Body.setAngle(fEsq.body, -0.6),
    right: () => Body.setAngle(fDir.body, 0.6),
    launch: () => {
        if (!bolaAtual || bolaAtual.position.y > 600) novaBola();
        else disparar();
    }
};

document.getElementById('btn-left').addEventListener('touchstart', (e) => { e.preventDefault(); controls.left(); });
document.getElementById('btn-right').addEventListener('touchstart', (e) => { e.preventDefault(); controls.right(); });
document.getElementById('btn-launch').addEventListener('touchstart', (e) => { e.preventDefault(); controls.launch(); });

// Suporte para Mouse
document.getElementById('btn-left').onmousedown = controls.left;
document.getElementById('btn-right').onmousedown = controls.right;
document.getElementById('btn-launch').onmousedown = controls.launch;

// COLISÕES E PLACAR
Events.on(engine, 'collisionStart', (event) => {
    event.pairs.forEach(pair => {
        if (pair.bodyA.label === 'bumper' || pair.bodyB.label === 'bumper') {
            const b = pair.bodyA.label === 'bumper' ? pair.bodyA : pair.bodyB;
            pontuacao += b.plugin.pontos;
            scoreElement.innerText = pontuacao.toString().padStart(4, '0');
            b.render.fillStyle = '#fff';
            setTimeout(() => b.render.fillStyle = (b.plugin.pontos > 100 ? '#ff0055' : '#00d2ff'), 100);
        }
    });
});

// Remover bola se cair
Events.on(engine, 'afterUpdate', () => {
    if (bolaAtual && bolaAtual.position.y > 650) {
        Composite.remove(world, bolaAtual);
        bolaAtual = null;
        if (bolasRestantes === 0) alert("Fim de Jogo! Pontos: " + pontuacao);
    }
});

// 10. INICIALIZAÇÃO
Composite.add(world, [
    paredeEsq, paredeDir, teto, calhaInterior, guiaSuperior, baseEsq, baseDir,
    lancadorBase, pistao, molaPistao, ...bumpers,
    fEsq.body, fEsq.pivot, fDir.body, fDir.pivot
]);

Render.run(render);
Runner.run(Runner.create(), engine);