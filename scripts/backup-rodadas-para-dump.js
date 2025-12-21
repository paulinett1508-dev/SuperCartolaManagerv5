/**
 * Script para salvar dados de rodadas na collection cartola_oficial_dumps
 * Preserva dados permanentes antes da Globo resetar para temporada 2026
 *
 * Uso:
 *   node scripts/backup-rodadas-para-dump.js <time_id> [--dry-run] [--force]
 *   node scripts/backup-rodadas-para-dump.js 645089 --force
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import CartolaOficialDump from '../models/CartolaOficialDump.js';
import Rodada from '../models/Rodada.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGO_URI_DEV;
const LIGA_ID = '684cb1c8af923da7c7df51de'; // Super Cartola 2025

async function backupRodadasParaDump() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('💾 BACKUP RODADAS → DUMPS PERMANENTES');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
    const timeId = parseInt(args[0]) || 645089;
    const isDryRun = process.argv.includes('--dry-run');
    const isForce = process.argv.includes('--force');

    console.log(`📋 Time ID: ${timeId}`);
    console.log(`📋 Liga: ${LIGA_ID}`);

    if (isDryRun) {
        console.log('🔍 MODO DRY-RUN - Nenhuma alteração será feita\n');
    }

    if (!isDryRun && !isForce) {
        console.log('\n⚠️  Use --dry-run para simular ou --force para executar');
        return;
    }

    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Conectado ao MongoDB\n');

        const ligaObjectId = new mongoose.Types.ObjectId(LIGA_ID);

        // Buscar todas as rodadas do time
        const rodadas = await Rodada.find({
            timeId: timeId,
            ligaId: ligaObjectId
        }).sort({ rodada: 1 }).lean();

        console.log(`📊 Rodadas encontradas: ${rodadas.length}`);

        if (rodadas.length === 0) {
            console.log('❌ Nenhuma rodada encontrada para este time');
            await mongoose.disconnect();
            return;
        }

        // Verificar dumps já existentes
        const dumpsExistentes = await CartolaOficialDump.find({
            time_id: timeId,
            tipo_coleta: 'time_rodada',
            temporada: 2025
        }).select('rodada').lean();

        const rodadasJaSalvas = new Set(dumpsExistentes.map(d => d.rodada));
        console.log(`📊 Dumps já existentes: ${dumpsExistentes.length}`);

        // Filtrar rodadas que ainda não foram salvas
        const rodadasParaSalvar = rodadas.filter(r => !rodadasJaSalvas.has(r.rodada));
        console.log(`📊 Rodadas para salvar: ${rodadasParaSalvar.length}`);

        if (rodadasParaSalvar.length === 0) {
            console.log('\n✅ Todas as rodadas já estão salvas como dumps!');
            await mongoose.disconnect();
            return;
        }

        console.log('\n💾 Salvando rodadas como dumps permanentes...\n');

        let salvos = 0;
        for (const rodadaData of rodadasParaSalvar) {
            // Criar estrutura de dump baseada nos dados da rodada
            const dumpData = {
                time_id: timeId,
                temporada: 2025,
                rodada: rodadaData.rodada,
                tipo_coleta: 'time_rodada',
                raw_json: {
                    // Dados do time
                    time: {
                        time_id: timeId,
                        nome: rodadaData.nome_time,
                        nome_cartola: rodadaData.nome_cartola,
                        url_escudo_png: rodadaData.escudo,
                        clube_id: rodadaData.clube_id
                    },
                    // Pontuação
                    pontos: rodadaData.pontos,
                    rodada_atual: rodadaData.rodada,
                    // Metadados
                    rodada_nao_jogada: rodadaData.rodadaNaoJogada || false,
                    // Fonte dos dados
                    _source: 'backup_from_rodadas_collection',
                    _backup_date: new Date().toISOString()
                },
                meta: {
                    url_origem: `backup://rodadas/${LIGA_ID}/${timeId}/${rodadaData.rodada}`,
                    http_status: 200,
                    origem_trigger: 'manual',
                    liga_id: ligaObjectId
                }
            };

            if (!isDryRun) {
                await CartolaOficialDump.salvarDump(dumpData);
            }

            console.log(`   Rodada ${rodadaData.rodada.toString().padStart(2)}: ${rodadaData.pontos?.toFixed(2) || 0} pts - ${isDryRun ? '[DRY-RUN]' : '✅'}`);
            salvos++;
        }

        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log(`📊 RESULTADO:`);
        console.log(`   💾 Rodadas salvas: ${salvos}`);
        console.log(`   📁 Total dumps do time: ${dumpsExistentes.length + (isDryRun ? 0 : salvos)}`);
        console.log('═══════════════════════════════════════════════════════════════');

        if (!isDryRun) {
            // Verificação final
            const totalFinal = await CartolaOficialDump.countDocuments({
                time_id: timeId,
                tipo_coleta: 'time_rodada',
                temporada: 2025
            });
            console.log(`\n✅ VERIFICAÇÃO: ${totalFinal} dumps salvos para time ${timeId}`);
        }

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await mongoose.disconnect();
    }
}

backupRodadasParaDump();
