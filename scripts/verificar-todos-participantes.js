/**
 * Verificar todos os participantes com Timeline zerado
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function verificar() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Conectado ao MongoDB\n');

        const db = mongoose.connection.db;

        // Buscar todas as ligas
        const ligas = await db.collection('ligas').find({}).toArray();

        for (const liga of ligas) {
            const ligaId = liga._id;
            const ligaNome = liga.nome || 'Sem nome';

            // Buscar extratos da liga
            const extratos = await db.collection('extratofinanceirocaches')
                .find({ liga_id: ligaId })
                .toArray();

            if (extratos.length === 0) continue;

            console.log(`\n📊 LIGA: ${ligaNome} (${extratos.length} participantes com cache)`);
            console.log('-'.repeat(80));

            let problematicos = 0;
            for (const ext of extratos) {
                const hist = ext.historico_transacoes || [];
                const totalBonusOnus = hist.reduce((sum, h) => sum + (h.bonusOnus || 0), 0);
                const temPosicoes = hist.some(h => h.posicao !== null && h.posicao !== undefined);

                const time = await db.collection('times').findOne({ id: ext.time_id });
                const nome = time?.nome_time || ext.nome_time || 'Sem nome';

                if (totalBonusOnus === 0 && hist.length > 5) {
                    console.log(`   ⚠️ ${nome.substring(0, 25).padEnd(26)} | bonusOnus: 0 | posições: ${temPosicoes ? 'SIM' : 'NÃO'} | rodadas: ${hist.length}`);
                    problematicos++;
                }
            }

            if (problematicos === 0) {
                console.log('   ✅ Nenhum participante com problema!');
            } else {
                console.log(`   ⚠️ ${problematicos} participante(s) com Timeline zerado`);
            }
        }

        // Verificar participantes que NÃO têm cache (mencionados pelo usuário)
        console.log('\n' + '='.repeat(80));
        console.log('PARTICIPANTES SEM CACHE (podem estar faltando)');
        console.log('='.repeat(80));

        for (const liga of ligas) {
            const ligaId = liga._id;
            const participantes = liga.participantes || [];

            // Buscar extratos existentes
            const extratos = await db.collection('extratofinanceirocaches')
                .find({ liga_id: ligaId })
                .toArray();

            const timeIdsComCache = new Set(extratos.map(e => e.time_id));

            const semCache = participantes.filter(p => !timeIdsComCache.has(p.time_id));

            if (semCache.length > 0) {
                console.log(`\n📊 LIGA: ${liga.nome}`);
                semCache.forEach(p => {
                    console.log(`   ❌ ${(p.nome_time || 'Sem nome').substring(0, 30)} (ID: ${p.time_id}) - SEM CACHE`);
                });
            }
        }

        await mongoose.disconnect();
        console.log('\n\nDesconectado.');

    } catch (error) {
        console.error('Erro:', error);
        process.exit(1);
    }
}

verificar();
