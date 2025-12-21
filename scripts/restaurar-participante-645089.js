/**
 * Script para restaurar o participante Antonio Luis / FloriMengo FC
 * Time ID: 645089
 * Liga: Super Cartola 2025 (684cb1c8af923da7c7df51de)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGO_URI_DEV;

async function restaurarParticipante() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🔧 RESTAURAR PARTICIPANTE - Antonio Luis / FloriMengo FC');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const isDryRun = process.argv.includes('--dry-run');
    const isForce = process.argv.includes('--force');

    if (isDryRun) {
        console.log('🔍 MODO DRY-RUN - Nenhuma alteração será feita\n');
    }

    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Conectado ao MongoDB\n');

        const db = mongoose.connection.db;
        const ligaId = '684cb1c8af923da7c7df51de';
        const timeId = 645089;

        // Dados do participante
        const participanteData = {
            time_id: timeId,
            nome_cartola: 'Antonio Luis',
            nome_time: 'FloriMengo FC',
            clube_id: 262, // Flamengo (assumindo pelo nome)
            foto_perfil: '',
            foto_time: '',
            assinante: false,
            rodada_time_id: null,
            senha_acesso: 'acessocartola'
        };

        const timeData = {
            id: timeId,
            nome_time: 'FloriMengo FC',
            nome_cartoleiro: 'Antonio Luis',
            ativo: true,
            temporada: 2025
        };

        // 1. Verificar se já existe na collection times
        const timeExistente = await db.collection('times').findOne({ id: timeId });
        console.log(`1️⃣ Time na collection 'times': ${timeExistente ? '✅ Existe' : '❌ Não existe'}`);

        // 2. Verificar se está na liga.times
        const liga = await db.collection('ligas').findOne({
            _id: new mongoose.Types.ObjectId(ligaId)
        });
        const naListaTimes = liga?.times?.includes(timeId);
        console.log(`2️⃣ Time na lista liga.times: ${naListaTimes ? '✅ Existe' : '❌ Não existe'}`);

        // 3. Verificar se está em liga.participantes
        const naListaParticipantes = liga?.participantes?.some(p => p.time_id === timeId);
        console.log(`3️⃣ Time na lista liga.participantes: ${naListaParticipantes ? '✅ Existe' : '❌ Não existe'}`);

        // 4. Verificar cache financeiro
        const cache = await db.collection('extratofinanceirocaches').findOne({
            liga_id: ligaId,
            time_id: timeId
        });
        console.log(`4️⃣ Cache financeiro: ${cache ? `✅ Existe (${cache.historico_transacoes?.length} rodadas, saldo: ${cache.saldo_consolidado})` : '❌ Não existe'}`);

        console.log('\n--- AÇÕES NECESSÁRIAS ---\n');

        if (!isDryRun && !isForce) {
            console.log('⚠️  Use --dry-run para simular ou --force para executar\n');
            await mongoose.disconnect();
            return;
        }

        // Executar restauração
        if (!timeExistente) {
            console.log(`📝 Criando time na collection 'times'...`);
            if (!isDryRun) {
                await db.collection('times').insertOne(timeData);
                console.log('   ✅ Time criado');
            } else {
                console.log('   [DRY-RUN] Seria criado:', timeData);
            }
        }

        if (!naListaTimes) {
            console.log(`📝 Adicionando time_id à lista liga.times...`);
            if (!isDryRun) {
                await db.collection('ligas').updateOne(
                    { _id: new mongoose.Types.ObjectId(ligaId) },
                    { $push: { times: timeId } }
                );
                console.log('   ✅ Adicionado à lista times');
            } else {
                console.log(`   [DRY-RUN] Seria adicionado: ${timeId}`);
            }
        }

        if (!naListaParticipantes) {
            console.log(`📝 Adicionando participante à lista liga.participantes...`);
            if (!isDryRun) {
                await db.collection('ligas').updateOne(
                    { _id: new mongoose.Types.ObjectId(ligaId) },
                    { $push: { participantes: participanteData } }
                );
                console.log('   ✅ Adicionado à lista participantes');
            } else {
                console.log('   [DRY-RUN] Seria adicionado:', participanteData);
            }
        }

        // Verificação final
        if (!isDryRun) {
            console.log('\n--- VERIFICAÇÃO FINAL ---\n');

            const ligaAtualizada = await db.collection('ligas').findOne({
                _id: new mongoose.Types.ObjectId(ligaId)
            });

            const timeRestaurado = ligaAtualizada?.participantes?.find(p => p.time_id === timeId);
            if (timeRestaurado) {
                console.log('✅ PARTICIPANTE RESTAURADO COM SUCESSO!');
                console.log(`   Nome: ${timeRestaurado.nome_cartola}`);
                console.log(`   Time: ${timeRestaurado.nome_time}`);
                console.log(`   ID: ${timeRestaurado.time_id}`);
                console.log(`   Total participantes na liga: ${ligaAtualizada.participantes.length}`);
            } else {
                console.log('❌ Erro na restauração - participante não encontrado');
            }
        }

        console.log('\n═══════════════════════════════════════════════════════════════');

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await mongoose.disconnect();
    }
}

restaurarParticipante();
