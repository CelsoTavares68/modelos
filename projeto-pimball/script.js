 // 1. Configurações Iniciais do Matter.js
const { Engine, Render, Runner, Bodies, Composite, Body, Events, Constraint } = Matter;

const engine = Engine.create();
const world = engine.world;

// Ajustamos a altura para 600px para caber os botões no PWA
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
const calhaInterior = Bodies.rectangle(345, 350, 10, 500, { isStatic: true }); // Separa o lançador

// Guia Diagonal Superior (Para jogar a bola no campo)
const guiaSuperior = Bodies.rectangle(370, 60, 100, 20, { 
    isStatic: true, 
    angle: -Math.PI * 0.25, 
    render: { fillStyle: '#444' } 
});

// Base Inferior Inclinada (Direciona a bola para o buraco/paletas)
const baseEsq = Bodies.rectangle(80, 580, 180, 20, { isStatic: true, angle: 0.3, render: { fillStyle: '#333' } });
const baseDir = Bodies.rectangle(270, 580, 150, 20, { isStatic: true, angle: -0.3, render: { fillStyle: '#333' } });

// 4. Lançador (Pistão e Mola)
const lancadorBase = Bodies.rectangle(372, 590, 40, 20, { isStatic: true });
const pistao = Bodies.rectangle(372, 560, 34, 20, { restitution: 0, friction: 0, label: 'pistao' });
const molaPistao = Constraint.create({
    bodyA: lancadorBase, bodyB: pistao, stiffness: 0.1, length: 15, render: { visible: true }
});

// Seletores de UI
const scoreElement = document.getElementById('score');
const ballsElement = document.getElementById('balls-count');

// Função para atualizar o placar com animação
function atualizarPlacar(pontosGanhos) {
    pontuacao += pontosGanhos;
    
    // Formata para ter sempre 4 dígitos (ex: 0050)
    scoreElement.innerText = pontuacao.toString().padStart(4, '0');
    
    // Efeito de "pulo" no texto
    scoreElement.classList.add('bump');
    setTimeout(() => scoreElement.classList.remove('bump'), 100);
}

// Atualize a sua função de colisão (item 8 do script anterior):
Events.on(engine, 'collisionStart', (event) => {
    event.pairs.forEach((pair) => {
        if (pair.bodyA.label === 'bumper' || pair.bodyB.label === 'bumper') {
            const b = pair.bodyA.label === 'bumper' ? pair.bodyA : pair.bodyB;
            
            // Chama a nova função de placar
            atualizarPlacar(b.plugin.pontos);
            
            // Efeito visual no bumper físico
            b.render.fillStyle = '#fff';
            setTimeout(() => b.render.fillStyle = '#00d2ff', 100);
            
            // Dica: Chame seu som de "pontos.mp3" aqui
        }
    });
});

// Atualize a sua função de nova bola para mostrar na tela:
function novaBola() {
    if (bolasRestantes > 0 && (!bolaAtual || bolaAtual.position.y > 600)) {
        // ... (resto do código da função anterior)
        
        ballsElement.innerText = bolasRestantes; // Atualiza UI
    }
}

// 5. Sensores de Pontos (Bumpers)
function criarBumper(x, y, pontos, cor = '#00d2ff') {
    const bumper = Bodies.circle(x, y, 20, {
        isStatic: true,
        label: 'bumper',
        plugin: { pontos: pontos },
        render: { fillStyle: cor }
    });
    return bumper;
}

const bumpers = [
    criarBumper(100, 150, 100),
    criarBumper(200, 100, 250, '#ff0055'),
    criarBumper(300, 150, 100),
    criarBumper(100, 400, 50),
    criarBumper(240, 400, 50)
];

// 6. Paletas (Flippers)
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
    }
}

function disparar() {
    if (bolaAtual && bolaAtual.position.x > 350) {
        Body.applyForce(pistao, pistao.position, { x: 0, y: -0.1 });
        setTimeout(() => {
            Body.setVelocity(bolaAtual, { x: 0, y: -22 });
        }, 40);
    }
}

// 8. Eventos e Colisões
Events.on(engine, 'collisionStart', (event) => {
    event.pairs.forEach((pair) => {
        if (pair.bodyA.label === 'bumper' || pair.bodyB.label === 'bumper') {
            const b = pair.bodyA.label === 'bumper' ? pair.bodyA : pair.bodyB;
            pontuacao += b.plugin.pontos;
            b.render.fillStyle = '#fff';
            setTimeout(() => b.render.fillStyle = '#00d2ff', 100);
            // Insira seu áudio de bumper aqui!
        }
    });
});

// 9. Controles Mobile (Touch)
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