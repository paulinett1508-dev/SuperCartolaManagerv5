/**
 * Auditar Caches 2025 - Liga Sobral
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function auditarSobral() {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    const LIGA_SOBRAL = '684d821cf1a7ae16d1f89572';
    const LIGA_SOBRAL_OID = new mongoose.Types.ObjectId(LIGA_SOBRAL);

    // Buscar config da liga
    const liga = await db.collection('ligas').findOne({ _id: LIGA_SOBRAL_OID });

    if (!liga) {
        console.log('❌ Liga Sobral não encontrada!');
        process.exit(1);
    }

    console.log('='.repeat(80));
    console.log('AUDITORIA CACHES 2025 - ' + liga.nome.toUpperCase());
    console.log('='.repeat(80));

    const valoresMito = liga.configuracoes?.top10?.valores_mito || {};
    const valoresMico = liga.configuracoes?.top10?.valores_mico || {};
    const valorMito1 = valoresMito['1'] || 30;
    const valorMico1 = valoresMico['1'] || -30;
    const valoresBanco = liga.configuracoes?.ranking_rodada?.valores || {};

    console.log('Top10: MITO=' + valorMito1 + ', MICO=' + valorMico1);
    console.log('Posições do banco: ' + Object.keys(valoresBanco).length);

    // Buscar caches
    const caches = await db.collection('extratofinanceirocaches')
        .find({ liga_id: LIGA_SOBRAL, temporada: 2025 })
        .toArray();

    console.log('\nCaches encontrados: ' + caches.length);

    // Buscar participantes com rodadas
    const participantes = await db.collection('rodadas')
        .aggregate([
            { $match: { ligaId: LIGA_SOBRAL_OID, temporada: 2025 } },
            { $group: { _id: '$timeId', count: { $sum: 1 } } }
        ])
        .toArray();

    console.log('Participantes com rodadas: ' + participantes.length);

    if (caches.length === 0 && participantes.length === 0) {
        console.log('\n⚠️ Liga Sobral não tem dados de 2025');
        await mongoose.disconnect();
        process.exit(0);
    }

    const problemas = [];
    const ok = [];

    for (const cache of caches) {
        const timeId = cache.time_id;
        const historico = cache.historico_transacoes || [];
        const numRodadas = historico.length;

        const time = await db.collection('times').findOne({ id: timeId });
        const nomeTime = time?.nome_time || time?.nome_cartola || 'Time ' + timeId;

        // Contar rodadas reais
        const rodadasReais = await db.collection('rodadas')
            .countDocuments({ timeId: timeId, temporada: 2025, ligaId: LIGA_SOBRAL_OID });

        // Contar MITOs e MICOs
        const mitos = historico.filter(r => r.isMito);
        const micos = historico.filter(r => r.isMico);

        // Verificar Top10
        const top10Esperado = (mitos.length * valorMito1) + (micos.length * valorMico1);
        const top10Atual = historico.reduce((s, r) => s + (r.top10 || 0), 0);

        const problemasList = [];

        if (numRodadas < rodadasReais) {
            problemasList.push('Rodadas: ' + numRodadas + '/' + rodadasReais);
        }

        if (top10Atual !== top10Esperado && (mitos.length > 0 || micos.length > 0)) {
            problemasList.push('Top10: R$' + top10Atual + ' vs esperado R$' + top10Esperado);
        }

        if (problemasList.length > 0) {
            problemas.push({
                timeId,
                nomeTime,
                numRodadas,
                rodadasReais,
                mitos: mitos.length,
                micos: micos.length,
                top10Atual,
                top10Esperado,
                saldo: cache.saldo_consolidado,
                problemas: problemasList
            });
        } else {
            ok.push({ timeId, nomeTime, numRodadas, saldo: cache.saldo_consolidado });
        }
    }

    // Verificar participantes sem cache
    for (const p of participantes) {
        const temCache = caches.some(c => c.time_id === p._id);
        if (!temCache) {
            const time = await db.collection('times').findOne({ id: p._id });
            problemas.push({
                timeId: p._id,
                nomeTime: time?.nome_time || 'Time ' + p._id,
                numRodadas: 0,
                rodadasReais: p.count,
                mitos: 0,
                micos: 0,
                top10Atual: 0,
                top10Esperado: 0,
                saldo: 0,
                problemas: ['SEM CACHE (' + p.count + ' rodadas)']
            });
        }
    }

    console.log('\n' + '='.repeat(80));
    console.log('RESULTADO');
    console.log('='.repeat(80));

    console.log('\n✅ Caches OK: ' + ok.length);
    for (const c of ok) {
        console.log('   ' + c.nomeTime + ' | R' + c.numRodadas + ' | Saldo: R$' + c.saldo);
    }

    if (problemas.length > 0) {
        console.log('\n❌ Caches com problemas: ' + problemas.length);
        for (const p of problemas) {
            console.log('   ' + p.nomeTime.substring(0, 25).padEnd(25) + ' | ' + p.problemas.join('; '));
        }
    }

    await mongoose.disconnect();
}

auditarSobral();
