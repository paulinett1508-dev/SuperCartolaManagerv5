/**
 * SCRIPT TEMPORÁRIO - Inicializar Mata-Mata 2026
 * Liga Super Cartola (684cb1c8af923da7c7df51de)
 *
 * Cria a edição 1 do Mata-Mata com base no ranking da Rodada 2 (classificatória)
 *
 * USO: node scripts/init-mata-mata-2026.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGO_URI_DEV;
const LIGA_ID = '684cb1c8af923da7c7df51de';
const TEMPORADA = 2026;
const EDICAO = 1;
const RODADA_CLASSIFICATORIA = 2;
const TAMANHO_TORNEIO = 32;

async function inicializarMataMata() {
    try {
        console.log('═══════════════════════════════════════════════════════════════════');
        console.log('🏆 INICIALIZADOR MATA-MATA 2026');
        console.log('═══════════════════════════════════════════════════════════════════\n');

        await mongoose.connect(MONGO_URI);
        console.log('✅ Conectado ao MongoDB\n');

        const db = mongoose.connection.db;

        // 1. Buscar ranking da rodada classificatória
        console.log(`📊 Buscando ranking da Rodada ${RODADA_CLASSIFICATORIA}...`);

        const rankingRodada = await db.collection('rodadarankings').findOne({
            liga_id: LIGA_ID,
            rodada: RODADA_CLASSIFICATORIA,
            temporada: TEMPORADA
        });

        if (!rankingRodada || !rankingRodada.ranking || rankingRodada.ranking.length === 0) {
            console.error('❌ Ranking da rodada 2 não encontrado!');
            console.log('   Verifique se a rodada 2 foi consolidada.');

            // Tentar buscar de outra forma - via pontuações
            console.log('\n🔍 Tentando buscar via pontuações...');
            const pontuacoes = await db.collection('pontuacoes').find({
                liga_id: LIGA_ID,
                rodada: RODADA_CLASSIFICATORIA,
                temporada: TEMPORADA
            }).sort({ pontos: -1 }).limit(TAMANHO_TORNEIO).toArray();

            if (pontuacoes.length === 0) {
                console.error('❌ Nenhuma pontuação encontrada para R2!');
                await mongoose.disconnect();
                return;
            }

            console.log(`✅ Encontradas ${pontuacoes.length} pontuações`);

            // Montar ranking a partir das pontuações
            const ranking = pontuacoes.map((p, idx) => ({
                posicao: idx + 1,
                timeId: p.time_id,
                nome_time: p.nome_time,
                nome_cartola: p.nome_cartola || p.nome_cartoleiro,
                pontos: p.pontos,
                clube_id: p.clube_id
            }));

            await gerarConfrontos(db, ranking);
        } else {
            console.log(`✅ Ranking encontrado: ${rankingRodada.ranking.length} participantes`);

            // Pegar os top N
            const ranking = rankingRodada.ranking.slice(0, TAMANHO_TORNEIO).map((p, idx) => ({
                posicao: idx + 1,
                timeId: p.timeId || p.time_id,
                nome_time: p.nome_time || p.nomeTime,
                nome_cartola: p.nome_cartola || p.nome_cartoleiro || p.nomeCartola,
                pontos: p.pontos,
                clube_id: p.clube_id || p.clubeId
            }));

            await gerarConfrontos(db, ranking);
        }

        await mongoose.disconnect();
        console.log('\n✅ Desconectado do MongoDB');
        console.log('═══════════════════════════════════════════════════════════════════');

    } catch (error) {
        console.error('❌ Erro:', error.message);
        console.error(error.stack);
        await mongoose.disconnect();
        process.exit(1);
    }
}

async function gerarConfrontos(db, ranking) {
    if (ranking.length < TAMANHO_TORNEIO) {
        console.error(`❌ Ranking tem apenas ${ranking.length} participantes, precisamos de ${TAMANHO_TORNEIO}`);
        return;
    }

    console.log(`\n🎯 Gerando confrontos da 1ª Fase (${TAMANHO_TORNEIO / 2} jogos)...`);

    // Montar confrontos: 1º vs 32º, 2º vs 31º, etc.
    const confrontos = [];
    const numJogos = TAMANHO_TORNEIO / 2;

    for (let i = 0; i < numJogos; i++) {
        const timeA = ranking[i];
        const timeB = ranking[TAMANHO_TORNEIO - 1 - i];

        confrontos.push({
            jogo: i + 1,
            timeA: {
                timeId: timeA.timeId,
                time_id: timeA.timeId,
                nome_time: timeA.nome_time,
                nome_cartola: timeA.nome_cartola,
                nome_cartoleiro: timeA.nome_cartola,
                clube_id: timeA.clube_id,
                url_escudo_png: `/escudos/${timeA.clube_id}.png`,
                pontos: 0, // Será preenchido quando R3 for consolidada
                rankR2: i + 1
            },
            timeB: {
                timeId: timeB.timeId,
                time_id: timeB.timeId,
                nome_time: timeB.nome_time,
                nome_cartola: timeB.nome_cartola,
                nome_cartoleiro: timeB.nome_cartola,
                clube_id: timeB.clube_id,
                url_escudo_png: `/escudos/${timeB.clube_id}.png`,
                pontos: 0,
                rankR2: TAMANHO_TORNEIO - i
            }
        });

        console.log(`   Jogo ${i + 1}: ${timeA.nome_time} (${i + 1}º) vs ${timeB.nome_time} (${TAMANHO_TORNEIO - i}º)`);
    }

    // Estrutura do documento
    const dadosTorneio = {
        primeira: confrontos,
        oitavas: [],
        quartas: [],
        semis: [],
        final: [],
        metadata: {
            tamanhoTorneio: TAMANHO_TORNEIO,
            participantesAtivos: ranking.length,
            rodadaClassificatoria: RODADA_CLASSIFICATORIA
        }
    };

    // Salvar no MongoDB
    console.log('\n💾 Salvando no MongoDB...');

    const resultado = await db.collection('matamatacaches').findOneAndUpdate(
        {
            liga_id: LIGA_ID,
            edicao: EDICAO,
            temporada: TEMPORADA
        },
        {
            $set: {
                rodada_atual: RODADA_CLASSIFICATORIA,
                dados_torneio: dadosTorneio,
                tamanhoTorneio: TAMANHO_TORNEIO,
                participantesAtivos: ranking.length,
                ultima_atualizacao: new Date()
            }
        },
        { upsert: true, returnDocument: 'after' }
    );

    if (resultado) {
        console.log('✅ Mata-Mata 2026 - Edição 1 criada com sucesso!');
        console.log(`   ID: ${resultado._id}`);
        console.log(`   Liga: ${LIGA_ID}`);
        console.log(`   Edição: ${EDICAO}`);
        console.log(`   Temporada: ${TEMPORADA}`);
        console.log(`   Confrontos: ${confrontos.length}`);
    } else {
        console.log('✅ Documento criado (upsert)');
    }

    // Listar os classificados
    console.log('\n📋 CLASSIFICADOS - Top 32 da Rodada 2:');
    console.log('─────────────────────────────────────────────────────────────────');
    ranking.forEach((p, idx) => {
        const adversarioIdx = TAMANHO_TORNEIO - 1 - idx;
        const adversario = ranking[adversarioIdx];
        console.log(`   ${String(idx + 1).padStart(2)}º  ${p.nome_time.padEnd(25)} vs ${String(adversarioIdx + 1).padStart(2)}º ${adversario.nome_time}`);
    });
}

inicializarMataMata();
