 const { Engine, Render, Runner, Bodies, Composite, Body, Events, Constraint } = Matter;

const engine = Engine.create();
const world = engine.world;

const render = Render.create({
    element: document.getElementById('game-container'),
    engine: engine,
    options: {
        width: 400,
        height: 700,
        wireframes: false,
        background: '#111'
    }
});

// --- VARIÁVEIS DE CONTROLO ---
let bolasRestantes = 5;
let bolaAtual = null;
let pontuacao = 0;

// --- ESTRUTURA DO CAMPO ---
const chao = Bodies.rectangle(200, 710, 410, 60, { isStatic: true });
const paredeEsq = Bodies.rectangle(10, 350, 20, 700, { isStatic: true });
const paredeDir = Bodies.rectangle(390, 350, 20, 700, { isStatic: true });
const calhaLancador = Bodies.rectangle(340, 400, 10, 600, { isStatic: true }); // Separa o lançador do campo

// --- SENSORES DE PONTOS (BUMPERS) ---
function criarBumper(x, y, pontos) {
    const bumper = Bodies.circle(x, y, 25, {
        isStatic: true,
        label: 'bumper',
        plugin: { pontos: pontos },
        render: { fillStyle: '#00d2ff' }
    });
    return bumper;
}

const bumpers = [
    criarBumper(100, 150, 100),
    criarBumper(200, 100, 200),
    criarBumper(300, 150, 100)
];

// --- LANÇADOR (MOLA) ---
const lancadorBase = Bodies.rectangle(365, 680, 40, 20, { 
    isStatic: true, 
    render: { fillStyle: '#555' } 
});

const pistao = Bodies.rectangle(365, 650, 35, 20, { 
    render: { fillStyle: '#e74c3c' } 
});

// Mola que segura o pistão
const mola = Constraint.create({
    bodyA: lancadorBase,
    bodyB: pistao,
    stiffness: 0.1,
    length: 20,
    render: { visible: true, strokeStyle: '#fff' }
});

// --- LÓGICA DE JOGO ---

function lancarNovaBola() {
    if (bolasRestantes > 0 && (!bolaAtual || bolaAtual.position.y > 700)) {
        if (bolaAtual) Composite.remove(world, bolaAtual);
        
        bolaAtual = Bodies.circle(365, 600, 12, {
            restitution: 0.6,
            density: 0.001,
            label: 'bola',
            render: { fillStyle: '#fff' }
        });
        
        Composite.add(world, bolaAtual);
        bolasRestantes--;
        console.log(`Bolas restantes: ${bolasRestantes}`);
    }
}

// Detetar Colisões nos Bumpers
Events.on(engine, 'collisionStart', (event) => {
    event.pairs.forEach((pair) => {
        if (pair.bodyA.label === 'bumper' || pair.bodyB.label === 'bumper') {
            const bumper = pair.bodyA.label === 'bumper' ? pair.bodyA : pair.bodyB;
            pontuacao += bumper.plugin.pontos;
            
            // Efeito visual (brilho rápido)
            bumper.render.fillStyle = '#fff';
            setTimeout(() => bumper.render.fillStyle = '#00d2ff', 100);
            
            console.log("Pontuação:", pontuacao);
            // Aqui podes disparar os teus áudios de colisão!
        }
    });
});

// Controlos
document.body.onkeydown = (e) => {
    if (e.code === "Space") { // Barra de espaço para carregar a mola
        Body.applyForce(pistao, pistao.position, { x: 0, y: -0.05 });
    }
    if (e.code === "KeyN") { // Tecla N para nova bola
        lancarNovaBola();
    }
};

Composite.add(world, [chao, paredeEsq, paredeDir, calhaLancador, ...bumpers, lancadorBase, pistao, mola]);

Render.run(render);
Runner.run(Runner.create(), engine);