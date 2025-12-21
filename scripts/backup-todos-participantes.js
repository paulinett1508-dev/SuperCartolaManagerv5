/**
 * Script para fazer backup de TODOS os participantes de uma liga
 * Salva os dados da collection 'rodadas' como dumps permanentes
 *
 * Uso:
 *   node scripts/backup-todos-participantes.js [ligaId] [--dry-run] [--force]
 *   node scripts/backup-todos-participantes.js --force
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import CartolaOficialDump from '../models/CartolaOficialDump.js';
import Rodada from '../models/Rodada.js';
import Liga from '../models/Liga.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGO_URI_DEV;

async function backupTodosParticipantes() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('💾 BACKUP COMPLETO - TODOS OS PARTICIPANTES');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
    const ligaId = args[0] || '684cb1c8af923da7c7df51de';
    const isDryRun = process.argv.includes('--dry-run');
    const isForce = process.argv.includes('--force');

    console.log(`📋 Liga ID: ${ligaId}`);

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

        const ligaObjectId = new mongoose.Types.ObjectId(ligaId);

        // Buscar liga
        const liga = await Liga.findById(ligaObjectId).lean();
        if (!liga) {
            console.log('❌ Liga não encontrada');
            await mongoose.disconnect();
            return;
        }

        const participantes = liga.participantes || [];
        console.log(`📊 Liga: ${liga.nome}`);
        console.log(`👥 Total participantes: ${participantes.length}\n`);

        // Verificar dumps existentes
        const dumpsStats = await CartolaOficialDump.aggregate([
            { $match: { tipo_coleta: 'time_rodada', temporada: 2025 } },
            { $group: { _id: '$time_id', rodadas: { $sum: 1 } } }
        ]);

        const dumpsMap = new Map(dumpsStats.map(d => [d._id, d.rodadas]));

        // Separar participantes por status
        const comDumpsCompletos = [];
        const semDumps = [];
        const comDumpsParciais = [];

        for (const p of participantes) {
            const rodadasSalvas = dumpsMap.get(p.time_id) || 0;
            if (rodadasSalvas >= 38) {
                comDumpsCompletos.push({ ...p, rodadasSalvas });
            } else if (rodadasSalvas > 0) {
                comDumpsParciais.push({ ...p, rodadasSalvas });
            } else {
                semDumps.push(p);
            }
        }

        console.log(`📊 Status:`);
        console.log(`   ✅ Com dumps completos: ${comDumpsCompletos.length}`);
        console.log(`   ⚠️  Com dumps parciais: ${comDumpsParciais.length}`);
        console.log(`   ❌ Sem dumps: ${semDumps.length}\n`);

        if (semDumps.length === 0 && comDumpsParciais.length === 0) {
            console.log('✅ Todos os participantes já têm dumps completos!');
            await mongoose.disconnect();
            return;
        }

        // Processar participantes que precisam de backup
        const aProcessar = [...semDumps, ...comDumpsParciais];
        let totalSalvos = 0;
        let totalRodadas = 0;

        for (const p of aProcessar) {
            const timeId = p.time_id;
            const nomeCartola = p.nome_cartola || 'N/D';

            // Buscar rodadas existentes
            const rodadas = await Rodada.find({
                timeId: timeId,
                ligaId: ligaObjectId
            }).sort({ rodada: 1 }).lean();

            if (rodadas.length === 0) {
                console.log(`⚠️  ${nomeCartola} (${timeId}): Sem dados na collection rodadas`);
                continue;
            }

            // Verificar rodadas já salvas como dump
            const dumpsExistentes = await CartolaOficialDump.find({
                time_id: timeId,
                tipo_coleta: 'time_rodada',
                temporada: 2025
            }).select('rodada').lean();

            const rodadasJaSalvas = new Set(dumpsExistentes.map(d => d.rodada));
            const rodadasParaSalvar = rodadas.filter(r => !rodadasJaSalvas.has(r.rodada));

            if (rodadasParaSalvar.length === 0) {
                continue;
            }

            console.log(`💾 ${nomeCartola} (${timeId}): ${rodadasParaSalvar.length} rodadas...`);

            if (!isDryRun) {
                for (const rodadaData of rodadasParaSalvar) {
                    await CartolaOficialDump.salvarDump({
                        time_id: timeId,
                        temporada: 2025,
                        rodada: rodadaData.rodada,
                        tipo_coleta: 'time_rodada',
                        raw_json: {
                            time: {
                                time_id: timeId,
                                nome: rodadaData.nome_time,
                                nome_cartola: rodadaData.nome_cartola,
                                url_escudo_png: rodadaData.escudo,
                                clube_id: rodadaData.clube_id
                            },
                            pontos: rodadaData.pontos,
                            rodada_atual: rodadaData.rodada,
                            rodada_nao_jogada: rodadaData.rodadaNaoJogada || false,
                            _source: 'backup_from_rodadas_collection',
                            _backup_date: new Date().toISOString()
                        },
                        meta: {
                            url_origem: `backup://rodadas/${ligaId}/${timeId}/${rodadaData.rodada}`,
                            http_status: 200,
                            origem_trigger: 'manual',
                            liga_id: ligaObjectId
                        }
                    });
                    totalRodadas++;
                }
            }

            totalSalvos++;
        }

        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log(`📊 RESULTADO:`);
        console.log(`   👥 Participantes processados: ${totalSalvos}`);
        console.log(`   📁 Rodadas salvas: ${totalRodadas}`);
        console.log('═══════════════════════════════════════════════════════════════');

        if (!isDryRun) {
            // Verificação final
            const totalDumps = await CartolaOficialDump.countDocuments({
                tipo_coleta: 'time_rodada',
                temporada: 2025
            });
            console.log(`\n✅ Total de dumps na collection: ${totalDumps}`);
        }

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await mongoose.disconnect();
    }
}

backupTodosParticipantes();
