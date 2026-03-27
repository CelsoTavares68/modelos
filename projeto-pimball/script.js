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

// 2. Variáveis de Controlo e UI
let bolasRestantes = 5;
let bolaAtual = null;
let pontuacao = 0;
const scoreElement = document.getElementById('score');
const ballsElement = document.getElementById('balls-count');

function atualizarPlacar(pontosGanhos) {
    pontuacao += pontosGanhos;
    if(scoreElement) scoreElement.innerText = pontuacao.toString().padStart(4, '0');
}

// 3. Estrutura do Campo
const paredeEsq = Bodies.rectangle(5, 300, 10, 600, { isStatic: true });
const paredeDir = Bodies.rectangle(395, 300, 10, 600, { isStatic: true });
const teto = Bodies.rectangle(200, 5, 400, 10, { isStatic: true });
const calhaInterior = Bodies.rectangle(345, 380, 10, 440, { isStatic: true, render: { fillStyle: '#333' } });

// --- NOVA GUIA SUPERIOR CURVA (Substitui a barra diagonal) ---
// Criamos uma série de pontos para fazer a curva que "cospe" a bola para a esquerda
const pontosCurva = [
    { x: 345, y: 120 }, { x: 345, y: 80 }, 
    { x: 350, y: 50 }, { x: 370, y: 30 }, 
    { x: 395, y: 20 }, { x: 395, y: 120 }
];
const guiaCurva = Bodies.fromVertices(370, 70, [pontosCurva], { 
    isStatic: true, 
    render: { fillStyle: '#444' } 
});

// Abertura Inferior (Onde a bola cai)
const baseEsq = Bodies.rectangle(70, 590, 160, 20, { isStatic: true, angle: 0.4, render: { fillStyle: '#222' } });
const baseDir = Bodies.rectangle(260, 590, 140, 20, { isStatic: true, angle: -0.4, render: { fillStyle: '#222' } });

// 4. Lançador (Pistão e Mola)
const lancadorBase = Bodies.rectangle(372, 595, 40, 10, { isStatic: true });
const pistao = Bodies.rectangle(372, 575, 30, 30, { label: 'pistao', render: { fillStyle: '#ff4444' } });
const molaPistao = Constraint.create({
    bodyA: lancadorBase, bodyB: pistao, pointB: { x: 0, y: 15 }, stiffness: 0.5, length: 5
});

// 5. Sensores (Bumpers)
function criarBumper(x, y, pontos, cor = '#00d2ff') {
    return Bodies.circle(x, y, 20, { isStatic: true, label: 'bumper', plugin: { pontos }, render: { fillStyle: cor } });
}
const bumpers = [
    criarBumper(100, 150, 100), criarBumper(200, 100, 250, '#ff0055'), criarBumper(300, 150, 100),
    criarBumper(80, 420, 50, '#ffcc00'), criarBumper(260, 420, 50, '#ffcc00') // Sensores de baixo
];

// 6. Paletas (Flippers) com Travas
function criarFlipper(x, y, lado) {
    const flipper = Bodies.rectangle(x, y, 75, 15, { chamfer: { radius: 7 }, render: { fillStyle: '#e74c3c' } });
    const pivot = Constraint.create({
        pointA: { x: x + (lado === 'esq' ? -35 : 35), y: y },
        bodyB: flipper, pointB: { x: (lado === 'esq' ? -35 : 35), y: 0 },
        stiffness: 1, length: 0
    });
    return { body: flipper, pivot: pivot };
}
const fEsq = criarFlipper(135, 540, 'esq');
const fDir = criarFlipper(225, 540, 'dir');

// 7. Lógica de Travas e Retorno Automático
Events.on(engine, 'beforeUpdate', () => {
    // Retorno Esquerdo
    if (fEsq.body.angle < 0.25) Body.setAngle(fEsq.body, fEsq.body.angle + 0.1);
    if (fEsq.body.angle > 0.25) Body.setAngle(fEsq.body, 0.25);
    // Retorno Direito
    if (fDir.body.angle > -0.25) Body.setAngle(fDir.body, fDir.body.angle - 0.1);
    if (fDir.body.angle < -0.25) Body.setAngle(fDir.body, -0.25);
});

// 8. Funções de Jogo
function novaBola() {
    if (bolasRestantes > 0 && (!bolaAtual || bolaAtual.position.y > 600)) {
        if (bolaAtual) Composite.remove(world, bolaAtual);
        bolaAtual = Bodies.circle(372, 530, 11, { restitution: 0.5, label: 'bola', render: { fillStyle: '#eee' } });
        Composite.add(world, bolaAtual);
        bolasRestantes--;
        if(ballsElement) ballsElement.innerText = bolasRestantes;
    }
}

function disparar() {
    if (bolaAtual && bolaAtual.position.x > 340) {
        Body.setVelocity(bolaAtual, { x: 0, y: -32 });
    }
}

// 9. Controlos (Touch e Mouse)
const acoes = {
    esq: () => Body.setAngle(fEsq.body, -0.6),
    dir: () => Body.setAngle(fDir.body, 0.6),
    lancar: () => (!bolaAtual || bolaAtual.position.y > 600) ? novaBola() : disparar()
};

document.getElementById('btn-left').ontouchstart = (e) => { e.preventDefault(); acoes.esq(); };
document.getElementById('btn-right').ontouchstart = (e) => { e.preventDefault(); acoes.dir(); };
document.getElementById('btn-launch').ontouchstart = (e) => { e.preventDefault(); acoes.lancar(); };
// Mouse para testes
document.getElementById('btn-left').onmousedown = acoes.esq;
document.getElementById('btn-right').onmousedown = acoes.dir;
document.getElementById('btn-launch').onmousedown = acoes.lancar;

// 10. Colisões
Events.on(engine, 'collisionStart', (event) => {
    event.pairs.forEach(pair => {
        if (pair.bodyA.label === 'bumper' || pair.bodyB.label === 'bumper') {
            const b = pair.bodyA.label === 'bumper' ? pair.bodyA : pair.bodyB;
            atualizarPlacar(b.plugin.pontos);
            b.render.fillStyle = '#fff';
            setTimeout(() => b.render.fillStyle = (b.plugin.pontos > 100 ? '#ff0055' : '#00d2ff'), 100);
        }
    });
});

// 11. Inicialização
Composite.add(world, [
    paredeEsq, paredeDir, teto, calhaInterior, guiaCurva, baseEsq, baseDir,
    lancadorBase, pistao, molaPistao, ...bumpers,
    fEsq.body, fEsq.pivot, fDir.body, fDir.pivot
]);

Render.run(render);
Runner.run(Runner.create(), engine);