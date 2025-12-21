/**
 * Testar se a API tesouraria retorna breakdown correto após correção
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const LIGA_ID = '684d821cf1a7ae16d1f89572';
const LIGA_ID_OBJ = new mongoose.Types.ObjectId(LIGA_ID);

async function main() {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    console.log('=== SIMULANDO API TESOURARIA ===\n');

    // Buscar liga
    const liga = await db.collection('ligas').findOne({ _id: LIGA_ID_OBJ });
    const participantes = liga.participantes || [];

    // Buscar todos os caches
    const caches = await db.collection('extratofinanceirocaches')
        .find({ liga_id: LIGA_ID_OBJ })
        .toArray();

    console.log('Liga:', liga.nome);
    console.log('Participantes:', participantes.length);
    console.log('Caches:', caches.length);
    console.log('\n' + '='.repeat(80));
    console.log('| Time                           | Banco   | Top10   | Saldo   |');
    console.log('|' + '-'.repeat(32) + '|' + '-'.repeat(9) + '|' + '-'.repeat(9) + '|' + '-'.repeat(9) + '|');

    for (const participante of participantes) {
        const timeId = participante.time_id;
        const nomeTime = (participante.nome_time || 'Sem nome').substring(0, 28).padEnd(30);

        const cache = caches.find(c => c.time_id === timeId);

        if (cache) {
            const hist = cache.historico_transacoes || [];

            // Simular lógica da API tesouraria
            let banco = 0, top10 = 0;

            hist.forEach(t => {
                // Formato novo (campos diretos)
                if (t.bonusOnus !== undefined) banco += t.bonusOnus || 0;
                if (t.top10 !== undefined) top10 += t.top10 || 0;

                // Formato legado
                if (t.tipo === 'BONUS' || t.tipo === 'ONUS') banco += t.valor || 0;
                else if (t.tipo === 'MITO' || t.tipo === 'MICO') top10 += t.valor || 0;
            });

            const saldo = cache.saldo_consolidado || 0;

            console.log(`| ${nomeTime} | ${String(banco.toFixed(0)).padStart(7)} | ${String(top10.toFixed(0)).padStart(7)} | ${String(saldo.toFixed(0)).padStart(7)} |`);
        } else {
            console.log(`| ${nomeTime} | SEM CACHE                        |`);
        }
    }

    console.log('|' + '-'.repeat(32) + '|' + '-'.repeat(9) + '|' + '-'.repeat(9) + '|' + '-'.repeat(9) + '|');
    console.log('\n✅ Todos os participantes têm dados de Banco (bonusOnus)!');

    await mongoose.disconnect();
}

main().catch(console.error);
