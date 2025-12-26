/**
 * Diagnóstico completo de Timeline (bonusOnus) zerado em TODAS as ligas
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
        console.log('='.repeat(100));
        console.log('DIAGNÓSTICO DE TIMELINE (bonusOnus) - TODAS AS LIGAS');
        console.log('='.repeat(100));

        for (const liga of ligas) {
            const ligaId = liga._id;
            const ligaNome = liga.nome || 'Sem nome';

            // Buscar extratos desta liga
            const extratos = await db.collection('extratofinanceirocaches')
                .find({ liga_id: ligaId })
                .toArray();

            if (extratos.length === 0) continue;

            console.log(`\n📊 LIGA: ${ligaNome}`);
            console.log(`   ID: ${ligaId}`);
            console.log('-'.repeat(100));

            const problematicos = [];
            const normais = [];

            for (const ext of extratos) {
                const hist = ext.historico_transacoes || [];

                // Calcular totais
                let totalBonusOnus = 0;
                let totalPC = 0;
                let totalMM = 0;
                let temFormatoLegado = false;
                let somaTipoValorBonus = 0;
                let somaTipoValorPC = 0;
                let somaTipoValorMM = 0;

                hist.forEach(h => {
                    totalBonusOnus += h.bonusOnus || 0;
                    totalPC += h.pontosCorridos || 0;
                    totalMM += h.mataMata || 0;

                    if (h.tipo && h.valor !== undefined) {
                        temFormatoLegado = true;
                        if (h.tipo === 'BONUS' || h.tipo === 'ONUS' || h.tipo === 'G' || h.tipo === 'Z') {
                            somaTipoValorBonus += h.valor;
                        } else if (h.tipo === 'PONTOS_CORRIDOS') {
                            somaTipoValorPC += h.valor;
                        } else if (h.tipo === 'MATA_MATA') {
                            somaTipoValorMM += h.valor;
                        }
                    }
                });

                // Buscar nome do time
                const time = await db.collection('times').findOne({ id: ext.time_id });
                const nomeTime = time?.nome_time || ext.nome_time || 'Sem nome';

                const info = {
                    timeId: ext.time_id,
                    nome: nomeTime,
                    rodadas: hist.length,
                    primeiraRodada: hist[0]?.rodada || 'N/A',
                    ultimaRodada: hist[hist.length - 1]?.rodada || 'N/A',
                    totalBonusOnus,
                    totalPC,
                    totalMM,
                    temFormatoLegado,
                    somaTipoValorBonus,
                    somaTipoValorPC,
                    somaTipoValorMM,
                    criadoEm: ext.createdAt || ext.criado_em || 'N/A'
                };

                // É problemático se: bonusOnus zerado MAS outros participantes da liga têm
                // OU se tem formato legado mas bonusOnus não reflete
                if (totalBonusOnus === 0 && hist.length > 5) {
                    problematicos.push(info);
                } else {
                    normais.push(info);
                }
            }

            // Se há participantes com bonusOnus e outros sem, é anomalia
            const temNormaisComBonusOnus = normais.some(n => n.totalBonusOnus !== 0);

            if (problematicos.length > 0 && temNormaisComBonusOnus) {
                console.log(`   ⚠️ ANOMALIA DETECTADA: ${problematicos.length} participantes SEM Timeline, ${normais.filter(n => n.totalBonusOnus !== 0).length} COM Timeline`);
                console.log('');
                console.log('   PARTICIPANTES SEM TIMELINE:');
                problematicos.forEach(p => {
                    console.log(`   ❌ ${p.nome.substring(0, 25).padEnd(26)} | ID: ${p.timeId} | Rodadas: ${p.primeiraRodada}-${p.ultimaRodada} | Criado: ${String(p.criadoEm).substring(0, 10)}`);
                    if (p.temFormatoLegado) {
                        console.log(`      → Formato legado! PC: ${p.somaTipoValorPC} | MM: ${p.somaTipoValorMM} | Banco: ${p.somaTipoValorBonus}`);
                    }
                });
            } else if (problematicos.length > 0) {
                console.log(`   ℹ️ ${problematicos.length} participantes sem Timeline (pode ser normal se liga não usa G/Z)`);
            } else {
                console.log(`   ✅ Todos os ${normais.length} participantes têm Timeline OK`);
            }
        }

        // Resumo final
        console.log('\n' + '='.repeat(100));
        console.log('RESUMO');
        console.log('='.repeat(100));

        // Contar total de problemas
        const todosExtratos = await db.collection('extratofinanceirocaches').find({}).toArray();
        let totalProblematicos = 0;

        for (const ext of todosExtratos) {
            const hist = ext.historico_transacoes || [];
            let totalBonusOnus = 0;
            hist.forEach(h => totalBonusOnus += h.bonusOnus || 0);
            if (totalBonusOnus === 0 && hist.length > 5) {
                totalProblematicos++;
            }
        }

        console.log(`Total de extratos: ${todosExtratos.length}`);
        console.log(`Participantes com Timeline zerado (>5 rodadas): ${totalProblematicos}`);

        await mongoose.disconnect();
        console.log('\nDesconectado.');

    } catch (error) {
        console.error('Erro:', error);
        process.exit(1);
    }
}

diagnosticar();
