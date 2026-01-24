/**
 * APOSENTAR LIGA CARTOLEIROS DO SOBRAL
 *
 * Este script transforma a liga em registro histórico (Liga Arquivada)
 * - Marca como aposentada/inativa
 * - Preserva dados históricos para consulta no admin
 * - Não aparece mais para participantes (apenas admin)
 *
 * Uso: node scripts/aposentar-liga-sobral.js [--dry-run]
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const LIGA_ID = '684d821cf1a7ae16d1f89572';
const LIGA_NOME = 'Cartoleiros do Sobral';

// Dados do campeão 2025 (extraído de final_standings.json)
const CAMPEAO_2025 = {
    timeId: 1926323,
    nome_cartola: 'Daniel Barbosa',
    nome_time: 'specter United',
    pontos: 3309.05,
    rodadas_jogadas: 38
};

const VICE_2025 = {
    timeId: 13935277,
    nome_cartola: 'Paulinett Miranda',
    nome_time: 'Urubu Play F.C.',
    pontos: 2990.43
};

const TERCEIRO_2025 = {
    timeId: 49149009,
    nome_cartola: 'Matheus Coutinho',
    nome_time: 'RB Teteux SC',
    pontos: 2415.39
};

async function aposentarLiga(isDryRun = false) {
    try {
        console.log('==========================================');
        console.log('  APOSENTAR LIGA - CARTOLEIROS DO SOBRAL  ');
        console.log('==========================================\n');

        if (isDryRun) {
            console.log('🔍 MODO DRY-RUN: Nenhuma alteração será feita\n');
        }

        // Conectar ao MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Conectado ao MongoDB\n');

        const db = mongoose.connection.db;
        const ligasCollection = db.collection('ligas');

        // Buscar liga atual
        const liga = await ligasCollection.findOne({
            _id: new mongoose.Types.ObjectId(LIGA_ID)
        });

        if (!liga) {
            console.error('❌ Liga não encontrada:', LIGA_ID);
            process.exit(1);
        }

        console.log('📋 Liga encontrada:', liga.nome);
        console.log('   Participantes:', liga.participantes?.length || 0);
        console.log('   Temporada atual:', liga.temporada);
        console.log('   Status 2025:', liga.configuracoes?.temporada_2025?.status);
        console.log();

        // Preparar update
        const updateData = {
            // Marcar como aposentada
            ativa: false,
            status: 'aposentada',

            // Manter temporada como 2025 (última ativa)
            temporada: 2025,

            // Registrar aposentadoria
            aposentada_em: new Date(),
            aposentada_motivo: 'Liga encerrada oficialmente. Dados preservados para consulta histórica.',

            // Registrar campeões (dados históricos para admin)
            historico: {
                temporada_2025: {
                    campeao: CAMPEAO_2025,
                    vice: VICE_2025,
                    terceiro: TERCEIRO_2025,
                    total_participantes: 6,
                    total_rodadas: 38,
                    data_inicio: '2025-06-14',
                    data_fim: '2025-12-08'
                }
            },

            // Atualizar timestamp
            atualizadaEm: new Date()
        };

        console.log('📝 Alterações a serem aplicadas:');
        console.log('   - ativa: false');
        console.log('   - status: "aposentada"');
        console.log('   - temporada: 2025 (mantido)');
        console.log('   - historico.temporada_2025:');
        console.log(`     - Campeão: ${CAMPEAO_2025.nome_time} (${CAMPEAO_2025.nome_cartola})`);
        console.log(`     - Vice: ${VICE_2025.nome_time}`);
        console.log(`     - Terceiro: ${TERCEIRO_2025.nome_time}`);
        console.log();

        if (!isDryRun) {
            // Executar update
            const result = await ligasCollection.updateOne(
                { _id: new mongoose.Types.ObjectId(LIGA_ID) },
                { $set: updateData }
            );

            if (result.modifiedCount === 1) {
                console.log('✅ Liga aposentada com sucesso!');
                console.log();
                console.log('📊 Resumo:');
                console.log(`   Liga: ${LIGA_NOME}`);
                console.log(`   Campeão 2025: ${CAMPEAO_2025.nome_time} (${CAMPEAO_2025.pontos} pts)`);
                console.log(`   Status: APOSENTADA (Liga Histórica)`);
                console.log(`   Visibilidade: Apenas Admin (consulta histórica)`);
            } else {
                console.log('⚠️ Nenhuma alteração realizada (liga já atualizada?)');
            }
        } else {
            console.log('🔍 DRY-RUN: Nenhuma alteração feita');
        }

        console.log();
        console.log('==========================================');
        console.log('  PROCESSO CONCLUÍDO');
        console.log('==========================================');

    } catch (error) {
        console.error('❌ Erro:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

// Verificar argumentos
const isDryRun = process.argv.includes('--dry-run');
aposentarLiga(isDryRun);
