  const express = require('express');
const cors = require('cors');
const fs = require('fs');
const app = express();

app.use(cors());
app.use(express.json());

const FILE_NAME = 'historico_ordens.txt';

// FORÇAR CRIAÇÃO DO ARQUIVO AO LIGAR
if (!fs.existsSync(FILE_NAME)) {
    fs.writeFileSync(FILE_NAME, '', 'utf8');
    console.log(`✨ Arquivo ${FILE_NAME} criado com sucesso!`);
}

app.post('/executar-ordem', (req, res) => {
    const { ativo, quantidade, tipo, preco } = req.body;
    
    // Verificação de segurança no console do Node
    console.log(`Recebido: Ativo=${ativo}, Qtd=${quantidade}, Preço=${preco}`);

    const logOrdem = `${new Date().toLocaleString()}|${tipo}|${ativo}|${quantidade}|${preco}\n`;

    fs.appendFile(FILE_NAME, logOrdem, (err) => {
        if (err) {
            console.error("❌ Erro ao gravar no arquivo:", err);
            return res.status(500).send("Erro no servidor");
        }
        console.log(`✅ Ordem gravada no TXT: ${logOrdem}`);
        res.json({ status: 'Sucesso' });
    });
});

app.get('/obter-ordens', (req, res) => {
    const data = fs.readFileSync(FILE_NAME, 'utf8');
    const linhas = data.trim().split('\n').filter(l => l !== "");
    res.json({ ordens: linhas.reverse() });
});

app.listen(3000, () => {
    console.log('🚀 SERVIDOR RODANDO NA PORTA 3000');
});