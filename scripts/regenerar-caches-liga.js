/**
 * Script para regenerar caches de uma liga a partir dos rodadasnapshots
 *
 * Uso: node scripts/regenerar-caches-liga.js <liga_id> [--dry-run]
 *
 * Exemplo:
 *   node scripts/regenerar-caches-liga.js 684d821cf1a7ae16d1f89572 --dry-run
 *   node scripts/regenerar-caches-liga.js 684d821cf1a7ae16d1f89572
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const LIGA_ID = process.argv[2];
const DRY_RUN = process.argv.includes('--dry-run');

if (!LIGA_ID) {
    console.error('❌ Uso: node scripts/regenerar-caches-liga.js <liga_id> [--dry-run]');
    process.exit(1);
}

async function regenerarCaches() {
    console.log('='.repeat(60));
    console.log('REGENERAR CACHES - LIGA:', LIGA_ID);
    console.log('Modo:', DRY_RUN ? '🔍 DRY-RUN (apenas verificação)' : '⚡ EXECUÇÃO REAL');
    console.log('='.repeat(60));
    console.log('');

    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;

    // 1. Buscar último snapshot consolidado
    const snapshot = await db.collection('rodadasnapshots')
        .findOne({ liga_id: LIGA_ID, status: 'consolidada' }, { sort: { rodada: -1 } });

    if (!snapshot) {
        console.error('❌ Nenhum snapshot consolidado encontrado para esta liga!');
        await mongoose.disconnect();
        process.exit(1);
    }

    console.log(`✅ Snapshot encontrado: Rodada ${snapshot.rodada}`);
    console.log(`   Data: ${snapshot.data_consolidacao || snapshot.atualizado_em}`);
    console.log('');

    const dc = snapshot.dados_consolidados;
    if (!dc) {
        console.error('❌ Snapshot não tem dados_consolidados!');
        await mongoose.disconnect();
        process.exit(1);
    }

    // 2. Buscar dados da liga (nomes dos times)
    const liga = await db.collection('ligas').findOne({ _id: new mongoose.Types.ObjectId(LIGA_ID) });
    console.log(`📋 Liga: ${liga?.nome || 'Desconhecida'}`);
    console.log(`   Participantes: ${liga?.times?.length || 0}`);
    console.log('');

    // Buscar nomes dos times da collection RODADAS (que tem os dados corretos)
    const ligaObjId = new mongoose.Types.ObjectId(LIGA_ID);
    const rodadasComNomes = await db.collection('rodadas')
        .find({ ligaId: ligaObjId })
        .project({ timeId: 1, nome_time: 1, nome_cartola: 1, escudo: 1 })
        .toArray();

    const timesMap = new Map();
    rodadasComNomes.forEach(r => {
        if (!timesMap.has(r.timeId)) {
            timesMap.set(r.timeId, {
                nome_time: r.nome_time || '',
                nome_cartola: r.nome_cartola || '',
                escudo: r.escudo || ''
            });
        }
    });
    console.log(`   Times com dados (da collection rodadas): ${timesMap.size}`);
    console.log('');

    // 3. Preparar caches
    const agora = new Date();
    const resultados = {
        top10: null,
        ranking: null,
        extratos: [],
        artilheiro: null,
        luvaOuro: null
    };

    // TOP10 Cache
    if (dc.top10) {
        // Enriquecer com nomes
        const mitos = (dc.top10.mitos || []).map(m => {
            const timeInfo = timesMap.get(m.time_id) || {};
            return {
                ...m,
                timeId: m.time_id,
                nome_time: timeInfo.nome_time || m.nome_time || 'Time ' + m.time_id,
                nome_cartola: timeInfo.nome_cartola || m.nome_cartola || '',
                escudo_url: timeInfo.escudo || m.escudo_url || ''
            };
        });

        const micos = (dc.top10.micos || []).map(m => {
            const timeInfo = timesMap.get(m.time_id) || {};
            return {
                ...m,
                timeId: m.time_id,
                nome_time: timeInfo.nome_time || m.nome_time || 'Time ' + m.time_id,
                nome_cartola: timeInfo.nome_cartola || m.nome_cartola || '',
                escudo_url: timeInfo.escudo || m.escudo_url || ''
            };
        });

        resultados.top10 = {
            liga_id: LIGA_ID,
            mitos,
            micos,
            rodada_atual: snapshot.rodada,
            atualizado_em: agora,
            fonte: 'regeneracao_snapshot'
        };
        console.log(`📊 TOP10: ${mitos.length} mitos, ${micos.length} micos`);
    }

    // Ranking Turno Cache (Geral)
    if (dc.ranking_geral) {
        const ranking = dc.ranking_geral.map((r, i) => {
            const timeInfo = timesMap.get(r.time_id) || {};
            return {
                posicao: r.posicao || i + 1,
                timeId: r.time_id,
                nome_time: timeInfo.nome_time || r.nome_time || 'Time ' + r.time_id,
                nome_cartola: timeInfo.nome_cartola || r.nome_cartola || '',
                escudo: timeInfo.escudo || r.escudo || '',
                pontos: r.pontos_total || r.pontos || 0,
                rodadas_jogadas: r.rodadas_jogadas || snapshot.rodada
            };
        });

        resultados.ranking = {
            liga_id: LIGA_ID,
            turno: 'geral',
            ranking,
            rodada_atual: snapshot.rodada,
            status: 'consolidado',
            atualizado_em: agora,
            fonte: 'regeneracao_snapshot'
        };
        console.log(`📈 Ranking Geral: ${ranking.length} participantes`);
    }

    // Extratos Financeiros
    if (dc.extratos_financeiros) {
        for (const [timeId, extrato] of Object.entries(dc.extratos_financeiros)) {
            const timeInfo = timesMap.get(parseInt(timeId)) || {};
            resultados.extratos.push({
                liga_id: LIGA_ID,
                time_id: parseInt(timeId),
                nome_time: timeInfo.nome_time || 'Time ' + timeId,
                rodadas: extrato.rodadas || [],
                resumo: extrato.resumo || {},
                saldo_consolidado: extrato.resumo?.saldo || extrato.resumo?.saldo_final || 0,
                atualizado_em: agora,
                fonte: 'regeneracao_snapshot'
            });
        }
        console.log(`💰 Extratos: ${resultados.extratos.length} participantes`);
    }

    // Artilheiro
    if (dc.artilheiro_campeao?.ranking) {
        const ranking = dc.artilheiro_campeao.ranking.map((a, i) => {
            const timeInfo = timesMap.get(a.timeId || a.time_id) || {};
            return {
                timeId: a.timeId || a.time_id,
                nome: timeInfo.nome_cartola || a.nome || a.nomeTime || '',
                nomeTime: timeInfo.nome_time || a.nomeTime || '',
                escudo: timeInfo.escudo || a.escudo || '',
                golsPro: a.golsPro || a.gols || 0,
                rodadasProcessadas: a.rodadasProcessadas || snapshot.rodada
            };
        });

        resultados.artilheiro = {
            ligaId: LIGA_ID,
            ranking,
            rodadasProcessadas: snapshot.rodada,
            atualizadoEm: agora,
            fonte: 'regeneracao_snapshot'
        };
        console.log(`⚽ Artilheiro: ${ranking.length} participantes`);
    }

    // Luva de Ouro
    if (dc.luva_de_ouro?.ranking) {
        const ranking = dc.luva_de_ouro.ranking.map((g, i) => {
            const timeInfo = timesMap.get(g.participanteId || g.time_id) || {};
            return {
                participanteId: g.participanteId || g.time_id,
                participanteNome: timeInfo.nome_cartola || g.participanteNome || '',
                pontosTotais: g.pontosTotais || g.pontos || 0,
                rodadasJogadas: g.rodadasJogadas || snapshot.rodada
            };
        });

        resultados.luvaOuro = {
            ligaId: LIGA_ID,
            ranking,
            rodadasProcessadas: snapshot.rodada,
            atualizadoEm: agora,
            fonte: 'regeneracao_snapshot'
        };
        console.log(`🧤 Luva de Ouro: ${ranking.length} participantes`);
    }

    console.log('');

    // 4. Salvar ou exibir
    if (DRY_RUN) {
        console.log('🔍 DRY-RUN: Dados que seriam salvos:');
        console.log('');
        if (resultados.top10) {
            console.log('TOP10:', JSON.stringify(resultados.top10, null, 2).substring(0, 500) + '...');
        }
        console.log('');
        console.log('✅ Verificação concluída! Use sem --dry-run para salvar.');
    } else {
        console.log('💾 Salvando caches...');

        // TOP10
        if (resultados.top10) {
            await db.collection('top10caches').updateOne(
                { liga_id: LIGA_ID },
                { $set: resultados.top10 },
                { upsert: true }
            );
            console.log('   ✅ TOP10 salvo');
        }

        // Ranking Turno
        if (resultados.ranking) {
            await db.collection('ranking_turno_caches').updateOne(
                { liga_id: LIGA_ID, turno: 'geral' },
                { $set: resultados.ranking },
                { upsert: true }
            );
            console.log('   ✅ Ranking Geral salvo');
        }

        // Extratos
        for (const extrato of resultados.extratos) {
            await db.collection('extrato_financeiro_caches').updateOne(
                { liga_id: LIGA_ID, time_id: extrato.time_id },
                { $set: extrato },
                { upsert: true }
            );
        }
        if (resultados.extratos.length > 0) {
            console.log(`   ✅ ${resultados.extratos.length} extratos salvos`);
        }

        // Artilheiro
        if (resultados.artilheiro) {
            await db.collection('artilheirocampeaos').updateOne(
                { ligaId: LIGA_ID },
                { $set: resultados.artilheiro },
                { upsert: true }
            );
            console.log('   ✅ Artilheiro salvo');
        }

        // Luva de Ouro
        if (resultados.luvaOuro) {
            await db.collection('luvaouros').updateOne(
                { ligaId: LIGA_ID },
                { $set: resultados.luvaOuro },
                { upsert: true }
            );
            console.log('   ✅ Luva de Ouro salvo');
        }

        console.log('');
        console.log('✅ Regeneração concluída com sucesso!');
    }

    await mongoose.disconnect();
}

regenerarCaches().catch(err => {
    console.error('❌ Erro:', err);
    process.exit(1);
});
