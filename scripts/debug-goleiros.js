import mongoose from 'mongoose';
import Goleiros from '../models/Goleiros.js';
import dotenv from 'dotenv';
dotenv.config();

await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

const ligaId = '684d821cf1a7ae16d1f89572';

const participantes = [
    { id: 1926323, nome: 'Daniel Barbosa' },
    { id: 13935277, nome: 'Paulinett Miranda' },
    { id: 14747183, nome: 'Carlos Henrique' },
    { id: 49149009, nome: 'Matheus Coutinho' },
    { id: 49149388, nome: 'Junior Brasilino' },
    { id: 50180257, nome: 'Hivisson' },
];

console.log('=== DADOS POR PARTICIPANTE ===');
for (const p of participantes) {
    const dados = await Goleiros.find({
        ligaId,
        participanteId: p.id,
        rodada: { $gte: 1, $lte: 38 }
    }).sort({ rodada: 1 });

    const pontosTotais = dados.reduce((acc, item) => acc + (item.pontos || 0), 0);
    const comGoleiro = dados.filter(d => d.goleiroNome && d.goleiroNome !== 'Sem goleiro').length;

    console.log(`${p.nome}: ${dados.length} rodadas, ${pontosTotais.toFixed(2)} pts, ${comGoleiro} com goleiro`);
}

await mongoose.disconnect();
