 // 1. Configurações Iniciais
const { Engine, Render, Runner, Bodies, Composite, Body, Events, Constraint } = Matter;
const engine = Engine.create();
const world = engine.world;

const render = Render.create({
    element: document.getElementById('game-container'),
    engine: engine,
    options: { width: 400, height: 600, wireframes: false, background: '#111' }
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

// Calha do Lançador (Espaço para a bola subir)
const calhaInterior = Bodies.rectangle(345, 380, 10, 440, { isStatic: true, render: { fillStyle: '#333' } });

// GUIA SUPERIOR CORRIGIDA (Liberando a saída)
// Posicionada bem no topo, inclinada para a esquerda para guiar a bola para o campo
const guiaSuperior = Bodies.rectangle(320, 50, 100, 15, { 
    isStatic: true, 
    angle: -Math.PI * 0.15, 
    render: { fillStyle: '#444' } 
});

// Abertura Inferior (V de escoamento)
const baseEsq = Bodies.rectangle(70, 590, 160, 20, { isStatic: true, angle: 0.4, render: { fillStyle: '#222' } });
const baseDir = Bodies.rectangle(260, 590, 140, 20, { isStatic: true, angle: -0.4, render: { fillStyle: '#222' } });

// 4. LANÇADOR (Base e Pistão)
const lancadorBase = Bodies.rectangle(372, 595, 40, 10, { isStatic: true });
const pistao = Bodies.rectangle(372, 575, 30, 30, { label: 'pistao', render: { fillStyle: '#ff4444' } });
const molaPistao = Constraint.create({
    bodyA: lancadorBase, bodyB: pistao, pointB: { x: 0, y: 15 }, stiffness: 0.5, length: 5
});

// 5. SENSORES (Topo e Inferiores)
function criarBumper(x, y, pontos, cor = '#00d2ff') {
    return Bodies.circle(x, y, 20, { isStatic: true, label: 'bumper', plugin: { pontos }, render: { fillStyle: cor } });
}

const bumpers = [
    criarBumper(100, 150, 100), // Topo Esq
    criarBumper(200, 100, 250, '#ff0055'), // Centro
    criarBumper(300, 150, 100), // Topo Dir
    criarBumper(80, 420, 50, '#ffcc00'), // Sensor Baixo Esq (Recolocado)
    criarBumper(260, 420, 50, '#ffcc00')  // Sensor Baixo Dir (Recolocado)
];

// 6. PALETAS (FLIPPERS) COM TRAVA
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

    return { body: flipper, pivot: pivot };
}

const fEsq = criarFlipper(135, 540, 'esq');
const fDir = criarFlipper(225, 540, 'dir');

// 7. LÓGICA DE MOVIMENTO E TRAVAS
Events.on(engine, 'beforeUpdate', () => {
    // Trava e Retorno paleta Esquerda
    if (fEsq.body.angle < 0.25) Body.setAngle(fEsq.body, fEsq.body.angle + 0.1);
    if (fEsq.body.angle > 0.25) Body.setAngle(fEsq.body, 0.25);

    // Trava e Retorno paleta Direita
    if (fDir.body.angle > -0.25) Body.setAngle(fDir.body, fDir.body.angle - 0.1);
    if (fDir.body.angle < -0.25) Body.setAngle(fDir.body, -0.25);
});

// 8. FUNÇÕES DE JOGO
function novaBola() {
    if (bolasRestantes > 0 && (!bolaAtual || bolaAtual.position.y > 600)) {
        if (bolaAtual) Composite.remove(world, bolaAtual);
        bolaAtual = Bodies.circle(372, 530, 11, { restitution: 0.5, label: 'bola', render: { fillStyle: '#eee' } });
        Composite.add(world, bolaAtual);
        bolasRestantes--;
        ballsElement.innerText = bolasRestantes;
    }
}

function disparar() {
    if (bolaAtual && bolaAtual.position.x > 340) {
        Body.setVelocity(bolaAtual, { x: 0, y: -32 });
        Body.applyForce(pistao, pistao.position, { x: 0, y: -0.05 });
    }
}

// 9. EVENTOS DE TOQUE/CLIQUE
const controls = {
    left: () => Body.setAngle(fEsq.body, -0.6),
    right: () => Body.setAngle(fDir.body, 0.6),
    launch: () => {
        if (!bolaAtual || bolaAtual.position.y > 600) novaBola();
        else disparar();
    }
};

document.getElementById('btn-left').ontouchstart = (e) => { e.preventDefault(); controls.left(); };
document.getElementById('btn-right').ontouchstart = (e) => { e.preventDefault(); controls.right(); };
document.getElementById('btn-launch').ontouchstart = (e) => { e.preventDefault(); controls.launch(); };

// Suporte para Mouse
document.getElementById('btn-left').onmousedown = controls.left;
document.getElementById('btn-right').onmousedown = controls.right;
document.getElementById('btn-launch').onmousedown = controls.launch;

// Colisões
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

// 10. INICIALIZAÇÃO
Composite.add(world, [
    paredeEsq, paredeDir, teto, calhaInterior, guiaSuperior, baseEsq, baseDir,
    lancadorBase, pistao, molaPistao, ...bumpers,
    fEsq.body, fEsq.pivot, fDir.body, fDir.pivot
]);

Render.run(render);
Runner.run(Runner.create(), engine);