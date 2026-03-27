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

// 3. Estrutura do Campo (Paredes e Guias)
const paredeEsq = Bodies.rectangle(5, 300, 10, 600, { isStatic: true });
const paredeDir = Bodies.rectangle(395, 300, 10, 600, { isStatic: true });
const teto = Bodies.rectangle(200, 5, 400, 10, { isStatic: true });
const calhaInterior = Bodies.rectangle(345, 350, 10, 500, { isStatic: true });

// Guia Superior CORRIGIDA: Agora inclina para a esquerda para a bola entrar no campo
const guiaSuperior = Bodies.rectangle(350, 45, 120, 20, { 
    isStatic: true, 
    angle: Math.PI * 0.15, 
    render: { fillStyle: '#444' } 
});

// Base Inferior (Buraco)
const baseEsq = Bodies.rectangle(80, 580, 180, 20, { isStatic: true, angle: 0.3, render: { fillStyle: '#333' } });
const baseDir = Bodies.rectangle(270, 580, 150, 20, { isStatic: true, angle: -0.3, render: { fillStyle: '#333' } });

// 4. Lançador CORRIGIDO (Base abaixo do pistão)
const lancadorBase = Bodies.rectangle(372, 595, 40, 10, { isStatic: true, render: { fillStyle: '#222' } });
const pistao = Bodies.rectangle(372, 570, 34, 30, { restitution: 0, friction: 0, label: 'pistao', render: { fillStyle: '#ff4444' } });

const molaPistao = Constraint.create({
    bodyA: lancadorBase,
    pointA: { x: 0, y: 0 },
    bodyB: pistao,
    pointB: { x: 0, y: 15 }, 
    stiffness: 0.5,
    length: 5,
    render: { visible: true, strokeStyle: '#ff4444' }
});

// 5. Seletores de UI e Placar
const scoreElement = document.getElementById('score');
const ballsElement = document.getElementById('balls-count');

function atualizarPlacar(pontosGanhos) {
    pontuacao += pontosGanhos;
    scoreElement.innerText = pontuacao.toString().padStart(4, '0');
    scoreElement.classList.add('bump');
    setTimeout(() => scoreElement.classList.remove('bump'), 100);
}

// 6. Sensores e Paletas
function criarBumper(x, y, pontos, cor = '#00d2ff') {
    return Bodies.circle(x, y, 20, {
        isStatic: true,
        label: 'bumper',
        plugin: { pontos: pontos },
        render: { fillStyle: cor }
    });
}

const bumpers = [
    criarBumper(100, 150, 100),
    criarBumper(200, 100, 250, '#ff0055'),
    criarBumper(300, 150, 100),
    criarBumper(100, 400, 50),
    criarBumper(240, 400, 50)
];

function criarFlipper(x, y, lado) {
    const flipper = Bodies.rectangle(x, y, 70, 15, {
        chamfer: { radius: 7 },
        render: { fillStyle: '#e74c3c' },
        label: 'flipper'
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

// 7. Funções de Jogo
function novaBola() {
    if (bolasRestantes > 0 && (!bolaAtual || bolaAtual.position.y > 600)) {
        if (bolaAtual) Composite.remove(world, bolaAtual);
        bolaAtual = Bodies.circle(372, 530, 10, {
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
        Body.applyForce(pistao, pistao.position, { x: 0, y: -0.5 });
        setTimeout(() => {
            if (bolaAtual) Body.setVelocity(bolaAtual, { x: 0, y: -25 });
        }, 30);
    }
}

// 8. Eventos e Colisões
Events.on(engine, 'collisionStart', (event) => {
    event.pairs.forEach((pair) => {
        const labels = [pair.bodyA.label, pair.bodyB.label];
        if (labels.includes('bumper')) {
            const b = pair.bodyA.label === 'bumper' ? pair.bodyA : pair.bodyB;
            atualizarPlacar(b.plugin.pontos);
            b.render.fillStyle = '#fff';
            setTimeout(() => b.render.fillStyle = '#00d2ff', 100);
        }
    });
});

// Detectar se a bola caiu para remover do mundo
Events.on(engine, 'afterUpdate', () => {
    if (bolaAtual && bolaAtual.position.y > 650) {
        Composite.remove(world, bolaAtual);
        bolaAtual = null;
        if (bolasRestantes === 0) alert("Fim de Jogo! Pontos: " + pontuacao);
    }
});

// 9. Controles Mobile
document.getElementById('btn-launch').addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!bolaAtual || bolaAtual.position.y > 600) novaBola();
    else disparar();
});

document.getElementById('btn-left').addEventListener('touchstart', (e) => {
    e.preventDefault();
    Body.setAngularVelocity(fEsq.body, -0.45);
});

document.getElementById('btn-right').addEventListener('touchstart', (e) => {
    e.preventDefault();
    Body.setAngularVelocity(fDir.body, 0.45);
});

// 10. Inicialização
Composite.add(world, [
    paredeEsq, paredeDir, teto, calhaInterior, guiaSuperior, 
    baseEsq, baseDir, lancadorBase, pistao, molaPistao,
    ...bumpers, fEsq.body, fEsq.pivot, fDir.body, fDir.pivot
]);

Render.run(render);
Runner.run(Runner.create(), engine);