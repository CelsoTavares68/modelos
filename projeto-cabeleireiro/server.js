  const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Rota para receber agendamentos
app.post('/agendar', (req, res) => {
    const { nome, servico, data, hora } = req.body;

    console.log("\n==============================");
    console.log("📌 NOVO AGENDAMENTO RECEBIDO");
    console.log(`👤 Cliente: ${nome}`);
    console.log(`✂️  Serviço: ${servico}`);
    console.log(`📅 Data: ${data}`);
    console.log(`⏰ Hora: ${hora}`);
    console.log("==============================\n");

    res.status(200).json({ message: "Agendamento registrado no terminal!" });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log("Aguardando agendamentos...");
});