/**
 * Script para regenerar o cache do Ranking Geral
 * Inclui participantes que foram restaurados após a geração inicial do cache
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import RankingGeralCache from '../models/RankingGeralCache.js';
import Rodada from '../models/Rodada.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGO_URI_DEV;

async function regenerarRankingGeral() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🔄 REGENERAR RANKING GERAL - Super Cartola 2025');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const isDryRun = process.argv.includes('--dry-run');
    const isForce = process.argv.includes('--force');

    // Pegar ligaId dos argumentos (ignorando flags)
    const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
    const ligaId = args[0] || '684cb1c8af923da7c7df51de';

    if (isDryRun) {
        console.log('🔍 MODO DRY-RUN - Nenhuma alteração será feita\n');
    }

    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Conectado ao MongoDB\n');

        const ligaObjectId = new mongoose.Types.ObjectId(ligaId);

        // 1. Verificar caches existentes
        const cachesExistentes = await RankingGeralCache.find({ ligaId: ligaObjectId }).lean();
        console.log(`📊 Caches existentes: ${cachesExistentes.length}`);

        if (cachesExistentes.length > 0) {
            cachesExistentes.forEach(c => {
                console.log(`   - Rodada ${c.rodadaFinal}: ${c.ranking?.length} participantes`);
            });
        }

        // 2. Verificar última rodada com dados
        const ultimaRodada = await Rodada.findOne({ ligaId: ligaObjectId })
            .sort({ rodada: -1 })
            .select('rodada')
            .lean();

        if (!ultimaRodada) {
            console.log('❌ Nenhuma rodada encontrada para esta liga');
            await mongoose.disconnect();
            return;
        }

        const rodadaFinal = ultimaRodada.rodada;
        console.log(`\n📅 Última rodada com dados: ${rodadaFinal}`);

        // 3. Verificar se Antonio Luis (645089) está nas rodadas
        const rodadasAntonio = await Rodada.countDocuments({
            ligaId: ligaObjectId,
            timeId: 645089
        });
        console.log(`\n👤 Antonio Luis (645089): ${rodadasAntonio} rodadas encontradas`);

        // 4. Calcular novo ranking
        console.log('\n🔄 Calculando novo ranking...\n');

        const pipeline = [
            {
                $match: {
                    ligaId: ligaObjectId,
                    rodada: { $lte: rodadaFinal }
                }
            },
            {
                $group: {
                    _id: "$timeId",
                    nome_cartola: { $last: "$nome_cartola" },
                    nome_time: { $last: "$nome_time" },
                    escudo: { $last: "$escudo" },
                    clube_id: { $last: "$clube_id" },
                    pontos_totais: { $sum: "$pontos" },
                    rodadas_jogadas: { $sum: 1 }
                }
            },
            {
                $sort: { pontos_totais: -1 }
            },
            {
                $group: {
                    _id: null,
                    participantes: { $push: "$$ROOT" }
                }
            },
            {
                $unwind: {
                    path: "$participantes",
                    includeArrayIndex: "posicao"
                }
            },
            {
                $project: {
                    _id: 0,
                    timeId: "$participantes._id",
                    nome_cartola: "$participantes.nome_cartola",
                    nome_time: "$participantes.nome_time",
                    escudo: "$participantes.escudo",
                    clube_id: "$participantes.clube_id",
                    pontos_totais: "$participantes.pontos_totais",
                    rodadas_jogadas: "$participantes.rodadas_jogadas",
                    posicao: { $add: ["$posicao", 1] }
                }
            }
        ];

        const novoRanking = await Rodada.aggregate(pipeline);
        console.log(`📊 Novo ranking calculado: ${novoRanking.length} participantes`);

        // 5. Verificar se Antonio Luis está no novo ranking
        const antonioNoRanking = novoRanking.find(p => p.timeId === 645089);
        if (antonioNoRanking) {
            console.log(`\n✅ Antonio Luis INCLUÍDO no ranking:`);
            console.log(`   Posição: ${antonioNoRanking.posicao}º`);
            console.log(`   Pontos: ${antonioNoRanking.pontos_totais.toFixed(2)}`);
            console.log(`   Rodadas: ${antonioNoRanking.rodadas_jogadas}`);
        } else {
            console.log(`\n❌ Antonio Luis NÃO encontrado no novo ranking`);
        }

        // 6. Mostrar top 5 e últimos 5
        console.log('\n📋 TOP 5:');
        novoRanking.slice(0, 5).forEach(p => {
            console.log(`   ${p.posicao}º ${p.nome_time} (${p.nome_cartola}) - ${p.pontos_totais.toFixed(2)} pts`);
        });

        console.log('\n📋 ÚLTIMOS 5:');
        novoRanking.slice(-5).forEach(p => {
            console.log(`   ${p.posicao}º ${p.nome_time} (${p.nome_cartola}) - ${p.pontos_totais.toFixed(2)} pts`);
        });

        if (!isDryRun && !isForce) {
            console.log('\n⚠️  Use --dry-run para simular ou --force para executar\n');
            await mongoose.disconnect();
            return;
        }

        // 7. Salvar novo cache
        if (!isDryRun) {
            console.log('\n📝 Salvando novo cache...');

            // Deletar caches antigos
            const deletados = await RankingGeralCache.deleteMany({ ligaId: ligaObjectId });
            console.log(`   🗑️ Caches antigos deletados: ${deletados.deletedCount}`);

            // Inserir novo cache
            await RankingGeralCache.create({
                ligaId: ligaObjectId,
                rodadaFinal,
                ranking: novoRanking,
                temporada: 2025,
                atualizadoEm: new Date()
            });

            console.log(`   ✅ Novo cache salvo com ${novoRanking.length} participantes`);

            // Verificação final
            const cacheVerificacao = await RankingGeralCache.findOne({
                ligaId: ligaObjectId,
                rodadaFinal
            }).lean();

            const antonioVerificacao = cacheVerificacao?.ranking?.find(p => p.timeId === 645089);
            if (antonioVerificacao) {
                console.log(`\n✅ VERIFICAÇÃO: Antonio Luis está no cache final (${antonioVerificacao.posicao}º lugar)`);
            }
        } else {
            console.log('\n[DRY-RUN] Seria salvo cache com', novoRanking.length, 'participantes');
        }

        console.log('\n═══════════════════════════════════════════════════════════════');

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await mongoose.disconnect();
    }
}

regenerarRankingGeral();
