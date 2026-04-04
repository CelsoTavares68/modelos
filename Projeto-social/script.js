// script.js completo - Controle de Interatividade
document.addEventListener('DOMContentLoaded', () => {
    const links = document.querySelectorAll('#redes-sociais a');
    const iframe = document.getElementById('tela');

    // Função para adicionar um feedback visual de clique
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            // Remove a borda de destaque de todos os ícones
            links.forEach(l => l.querySelector('img').style.boxShadow = '2px 2px 5px rgba(0,0,0,0.4)');
            
            // Adiciona um destaque ao ícone clicado
            const img = link.querySelector('img');
            img.style.boxShadow = '0px 0px 15px white';
            
            console.log("Carregando: " + link.getAttribute('href'));
        });
    });

    // Ajuste para garantir que o iframe carregue corretamente em PWAs
    iframe.addEventListener('load', () => {
        iframe.style.opacity = '1';
    });
});