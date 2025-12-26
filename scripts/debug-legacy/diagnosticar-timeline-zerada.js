/**
 * Diagnóstico: Comparar caches de participantes COM vs SEM Timeline
 *
 * Objetivo: Entender por que alguns participantes têm bonusOnus zerado
 * enquanto outros têm valores corretos.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function diagnosticar() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Conectado ao MongoDB\n');

        const db = mongoose.connection.db;

        // Buscar todas as ligas
        const ligas = await db.collection('ligas').find({}).toArray();

        console.log('='.repeat(120));
        console.log('DIAGNÓSTICO: CACHE DE EXTRATOS - bonusOnus (Timeline)');
        console.log('='.repeat(120));

        for (const liga of ligas) {
            const ligaId = liga._id;
            const ligaNome = liga.nome || 'Sem nome';

            // Buscar extratos desta liga - tentar ambos os formatos de liga_id
            let extratos = await db.collection('extratofinanceirocaches')
                .find({ liga_id: ligaId })
                .toArray();

            // Se não encontrou, tentar com string
            if (extratos.length === 0) {
                extratos = await db.collection('extratofinanceirocaches')
                    .find({ liga_id: ligaId.toString() })
                    .toArray();
            }

            if (extratos.length === 0) continue;

            console.log(`\n📊 LIGA: ${ligaNome} (${extratos.length} participantes com cache)`);
            console.log(`   ID: ${ligaId}`);
            console.log('-'.repeat(120));

            // Separar participantes com e sem Timeline
            const comTimeline = [];
            const semTimeline = [];

            for (const ext of extratos) {
                const hist = ext.historico_transacoes || [];

                // Somar bonusOnus
                let totalBonusOnus = 0;
                let temFormatoNovo = false;
                let temFormatoLegado = false;
                let primeiroRegistro = hist[0] || null;

                hist.forEach(h => {
                    if (h.bonusOnus !== undefined) {
                        totalBonusOnus += h.bonusOnus || 0;
                        temFormatoNovo = true;
                    }
                    if (h.tipo && h.valor !== undefined) {
                        temFormatoLegado = true;
                    }
                });

                // Buscar nome do time
                const time = await db.collection('times').findOne({ id: ext.time_id });
                const nomeTime = time?.nome_time || ext.nome_time || 'Sem nome';

                const info = {
                    timeId: ext.time_id,
                    nome: nomeTime,
                    rodadas: hist.length,
                    totalBonusOnus,
                    temFormatoNovo,
                    temFormatoLegado,
                    camposPrimeiraRodada: primeiroRegistro ? Object.keys(primeiroRegistro).join(', ') : 'N/A',
                    createdAt: ext.createdAt || ext.criado_em || 'N/A'
                };

                if (totalBonusOnus !== 0) {
                    comTimeline.push(info);
                } else {
                    semTimeline.push(info);
                }
            }

            // Exibir comparação
            if (semTimeline.length > 0 && comTimeline.length > 0) {
                console.log(`   ⚠️ ANOMALIA: ${semTimeline.length} sem Timeline, ${comTimeline.length} com Timeline\n`);

                console.log('   📈 PARTICIPANTES COM TIMELINE (exemplo):');
                comTimeline.slice(0, 2).forEach(p => {
                    console.log(`      ✅ ${p.nome.substring(0, 25).padEnd(26)} | Total: ${p.totalBonusOnus.toFixed(2)} | Rodadas: ${p.rodadas}`);
                    console.log(`         Formato: ${p.temFormatoNovo ? 'Novo' : ''} ${p.temFormatoLegado ? 'Legado' : ''}`);
                    console.log(`         Campos: ${p.camposPrimeiraRodada}`);
                });

                console.log('\n   📉 PARTICIPANTES SEM TIMELINE:');
                semTimeline.forEach(p => {
                    console.log(`      ❌ ${p.nome.substring(0, 25).padEnd(26)} | Total: ${p.totalBonusOnus.toFixed(2)} | Rodadas: ${p.rodadas}`);
                    console.log(`         Formato: ${p.temFormatoNovo ? 'Novo' : ''} ${p.temFormatoLegado ? 'Legado' : ''}`);
                    console.log(`         Campos: ${p.camposPrimeiraRodada}`);
                    console.log(`         Criado em: ${p.createdAt}`);
                });
            } else if (semTimeline.length > 0) {
                console.log(`   ℹ️ Todos ${semTimeline.length} participantes sem Timeline (pode ser normal se liga não tem G/Z)`);
            } else {
                console.log(`   ✅ Todos ${comTimeline.length} participantes têm Timeline OK`);
            }
        }

        // ANÁLISE DETALHADA: Pegar 1 COM e 1 SEM e comparar estrutura
        console.log('\n' + '='.repeat(120));
        console.log('ANÁLISE DETALHADA - ESTRUTURA DO CACHE');
        console.log('='.repeat(120));

        // Buscar um extrato COM bonusOnus e um SEM
        const todosExtratos = await db.collection('extratofinanceirocaches').find({}).toArray();

        let exemploComBonusOnus = null;
        let exemploSemBonusOnus = null;

        for (const ext of todosExtratos) {
            const hist = ext.historico_transacoes || [];
            let totalBO = 0;
            hist.forEach(h => totalBO += h.bonusOnus || 0);

            if (totalBO !== 0 && !exemploComBonusOnus && hist.length > 5) {
                exemploComBonusOnus = ext;
            }
            if (totalBO === 0 && !exemploSemBonusOnus && hist.length > 5) {
                exemploSemBonusOnus = ext;
            }

            if (exemploComBonusOnus && exemploSemBonusOnus) break;
        }

        if (exemploComBonusOnus) {
            const time = await db.collection('times').findOne({ id: exemploComBonusOnus.time_id });
            console.log('\n📗 EXEMPLO COM bonusOnus (Timeline OK):');
            console.log(`   Time: ${time?.nome_time || exemploComBonusOnus.time_id}`);
            console.log(`   Rodadas: ${exemploComBonusOnus.historico_transacoes.length}`);

            // Mostrar estrutura da primeira rodada
            const primeiraRod = exemploComBonusOnus.historico_transacoes[0];
            console.log('   Estrutura da primeira rodada:');
            Object.keys(primeiraRod).forEach(key => {
                const val = primeiraRod[key];
                console.log(`      ${key}: ${typeof val === 'object' ? JSON.stringify(val) : val}`);
            });
        }

        if (exemploSemBonusOnus) {
            const time = await db.collection('times').findOne({ id: exemploSemBonusOnus.time_id });
            console.log('\n📕 EXEMPLO SEM bonusOnus (Timeline ZERADO):');
            console.log(`   Time: ${time?.nome_time || exemploSemBonusOnus.time_id}`);
            console.log(`   Rodadas: ${exemploSemBonusOnus.historico_transacoes.length}`);

            // Mostrar estrutura da primeira rodada
            const primeiraRod = exemploSemBonusOnus.historico_transacoes[0];
            console.log('   Estrutura da primeira rodada:');
            Object.keys(primeiraRod).forEach(key => {
                const val = primeiraRod[key];
                console.log(`      ${key}: ${typeof val === 'object' ? JSON.stringify(val) : val}`);
            });

            // Ver se tem dados em formato legado que deveriam ser convertidos
            let totalLegadoBonus = 0;
            exemploSemBonusOnus.historico_transacoes.forEach(h => {
                if (h.tipo && h.valor !== undefined) {
                    if (['BONUS', 'ONUS', 'G', 'Z'].includes(h.tipo)) {
                        totalLegadoBonus += h.valor;
                    }
                }
            });
            if (totalLegadoBonus !== 0) {
                console.log(`   ⚠️ TEM DADOS LEGADOS! Total que deveria ir para bonusOnus: ${totalLegadoBonus}`);
            }
        }

        await mongoose.disconnect();
        console.log('\n\nDesconectado.');

    } catch (error) {
        console.error('Erro:', error);
        process.exit(1);
    }
}

diagnosticar();
