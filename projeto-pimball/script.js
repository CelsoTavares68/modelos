 const { Engine, Render, Runner, Bodies, Composite, Body, Events, Constraint } = Matter;

const engine = Engine.create();
const world = engine.world;

const render = Render.create({
    element: document.getElementById('game-container'),
    engine: engine,
    options: { width: 400, height: 600, wireframes: false, background: '#111' }
});

// Variáveis de Jogo
let bolasRestantes = 5;
let bolaAtual = null;
let pontuacao = 0;
const scoreElement = document.getElementById('score');
const ballsElement = document.getElementById('balls-count');

// 1. CENÁRIO E CALHA
const paredeEsq = Bodies.rectangle(5, 300, 10, 600, { isStatic: true });
const paredeDir = Bodies.rectangle(395, 300, 10, 600, { isStatic: true });
const teto = Bodies.rectangle(200, 5, 400, 10, { isStatic: true });
const calhaInterior = Bodies.rectangle(340, 370, 10, 460, { isStatic: true, render: { fillStyle: '#333' } });

// Guia Superior (Rampa de entrada no campo)
const guiaSuperior = Bodies.rectangle(310, 60, 150, 20, { 
    isStatic: true, angle: -Math.PI * 0.1, render: { fillStyle: '#444' } 
});

// 2. LANÇADOR (Ajustado)
const lancadorBase = Bodies.rectangle(370, 590, 40, 20, { isStatic: true });
const pistao = Bodies.rectangle(370, 560, 30, 40, { label: 'pistao', render: { fillStyle: '#ff4444' } });
const molaPistao = Constraint.create({
    bodyA: lancadorBase, bodyB: pistao, pointB: { x: 0, y: 15 }, stiffness: 0.5, length: 5
});

// 3. PALETAS COM TRAVA LÓGICA
function criarFlipper(x, y, lado) {
    const flipper = Bodies.rectangle(x, y, 75, 15, {
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

    return { body: flipper, pivot: pivot, lado: lado };
}

const fEsq = criarFlipper(130, 530, 'esq');
const fDir = criarFlipper(230, 530, 'dir');

// 4. BUMPERS
const bumpers = [
    Bodies.circle(100, 150, 20, { isStatic: true, label: 'bumper', plugin: { pontos: 100 }, render: { fillStyle: '#00d2ff' } }),
    Bodies.circle(200, 100, 20, { isStatic: true, label: 'bumper', plugin: { pontos: 250 }, render: { fillStyle: '#ff0055' } }),
    Bodies.circle(300, 150, 20, { isStatic: true, label: 'bumper', plugin: { pontos: 100 }, render: { fillStyle: '#00d2ff' } })
];

// 5. LÓGICA DE MOVIMENTO (TRAVAS E RETORNO)
Events.on(engine, 'beforeUpdate', () => {
    const forcaRetorno = 0.1;
    // Retorno automático da paleta esquerda
    if (fEsq.body.angle < 0.2) Body.setAngle(fEsq.body, fEsq.body.angle + forcaRetorno);
    if (fEsq.body.angle > 0.2) Body.setAngle(fEsq.body, 0.2);

    // Retorno automático da paleta direita
    if (fDir.body.angle > -0.2) Body.setAngle(fDir.body, fDir.body.angle - forcaRetorno);
    if (fDir.body.angle < -0.2) Body.setAngle(fDir.body, -0.2);
});

// 6. FUNÇÕES DE DISPARO E BOLA
function novaBola() {
    if (bolasRestantes > 0 && (!bolaAtual || bolaAtual.position.y > 600)) {
        if (bolaAtual) Composite.remove(world, bolaAtual);
        bolaAtual = Bodies.circle(370, 520, 11, { restitution: 0.5, label: 'bola', render: { fillStyle: '#fff' } });
        Composite.add(world, bolaAtual);
        bolasRestantes--;
        ballsElement.innerText = bolasRestantes;
    }
}

function disparar() {
    if (bolaAtual && bolaAtual.position.x > 340) {
        Body.setVelocity(bolaAtual, { x: 0, y: -30 });
    }
}

// 7. CONTROLES (Eventos de Clique/Touch)
document.getElementById('btn-left').addEventListener('touchstart', (e) => {
    e.preventDefault();
    Body.setAngle(fEsq.body, -0.6); // Força a paleta para cima instantaneamente
});

document.getElementById('btn-right').addEventListener('touchstart', (e) => {
    e.preventDefault();
    Body.setAngle(fDir.body, 0.6); // Força a paleta para cima instantaneamente
});

document.getElementById('btn-launch').addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!bolaAtual || bolaAtual.position.y > 600) novaBola();
    else disparar();
});

// Suporte para Mouse (Testar no PC)
document.getElementById('btn-left').onmousedown = () => Body.setAngle(fEsq.body, -0.6);
document.getElementById('btn-right').onmousedown = () => Body.setAngle(fDir.body, 0.6);
document.getElementById('btn-launch').onclick = () => {
    if (!bolaAtual || bolaAtual.position.y > 600) novaBola();
    else disparar();
};

// 8. COLISÕES E PLACAR
Events.on(engine, 'collisionStart', (event) => {
    event.pairs.forEach(pair => {
        if (pair.bodyA.label === 'bumper' || pair.bodyB.label === 'bumper') {
            const b = pair.bodyA.label === 'bumper' ? pair.bodyA : pair.bodyB;
            pontuacao += b.plugin.pontos;
            scoreElement.innerText = pontuacao.toString().padStart(4, '0');
            b.render.fillStyle = '#fff';
            setTimeout(() => b.render.fillStyle = '#00d2ff', 100);
        }
    });
});

// 9. INICIALIZAÇÃO
Composite.add(world, [
    paredeEsq, paredeDir, teto, calhaInterior, guiaSuperior,
    lancadorBase, pistao, molaPistao, ...bumpers,
    fEsq.body, fEsq.pivot, fDir.body, fDir.pivot
]);

Render.run(render);
Runner.run(Runner.create(), engine);