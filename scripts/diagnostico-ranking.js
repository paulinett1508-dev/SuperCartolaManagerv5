#!/usr/bin/env node
/**
 * diagnostico-ranking.js
 *
 * Script de diagnostico que compara a soma manual de pontos das rodadas
 * com os valores armazenados nos caches de ranking (RankingTurno e RankingGeralCache).
 *
 * Uso:
 *   node scripts/diagnostico-ranking.js
 *   node scripts/diagnostico-ranking.js --nome "Paulinett Miranda"
 *   node scripts/diagnostico-ranking.js --nome "Outro Cartoleiro"
 *
 * O script:
 *   1. Busca o participante pela nome_cartola nas Ligas
 *   2. Consulta todas as Rodadas desse participante na temporada 2026
 *   3. Calcula soma manual de pontos (excluindo e incluindo rodadaNaoJogada)
 *   4. Consulta RankingTurno (turno=geral) e RankingGeralCache
 *   5. Imprime tabela comparativa detalhada
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Liga from '../models/Liga.js';
import Rodada from '../models/Rodada.js';
import RankingTurno from '../models/RankingTurno.js';
import RankingGeralCache from '../models/RankingGeralCache.js';
import { CURRENT_SEASON } from '../config/seasons.js';

dotenv.config();

// =============================================================================
// PARSE DE ARGUMENTOS
// =============================================================================
function parseArgs() {
    const args = process.argv.slice(2);
    let nome = 'Paulinett Miranda'; // default

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--nome' && args[i + 1]) {
            nome = args[i + 1];
            i++;
        }
    }

    return { nome };
}

// =============================================================================
// FUNCOES AUXILIARES
// =============================================================================
function padRight(str, len) {
    const s = String(str);
    return s.length >= len ? s : s + ' '.repeat(len - s.length);
}

function padLeft(str, len) {
    const s = String(str);
    return s.length >= len ? s : ' '.repeat(len - s.length) + s;
}

function separator(len = 80) {
    return '='.repeat(len);
}

function dashSeparator(len = 80) {
    return '-'.repeat(len);
}

// =============================================================================
// MAIN
// =============================================================================
async function main() {
    const { nome } = parseArgs();
    const temporada = CURRENT_SEASON;

    console.log('');
    console.log(separator());
    console.log('  DIAGNOSTICO DE RANKING - Super Cartola Manager');
    console.log(separator());
    console.log(`  Participante: ${nome}`);
    console.log(`  Temporada:    ${temporada}`);
    console.log(separator());
    console.log('');

    // -------------------------------------------------------------------------
    // 1. CONECTAR AO MONGODB
    // -------------------------------------------------------------------------
    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) {
        console.error('[ERRO] Variavel MONGO_URI nao configurada. Verifique o .env');
        process.exit(1);
    }

    console.log('[1/6] Conectando ao MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('[1/6] Conectado com sucesso.\n');

    try {
        // ---------------------------------------------------------------------
        // 2. BUSCAR PARTICIPANTE DINAMICAMENTE NAS LIGAS
        // ---------------------------------------------------------------------
        console.log(`[2/6] Buscando participante "${nome}" nas ligas...`);

        const ligas = await Liga.find({
            temporada,
            'participantes.nome_cartola': { $regex: new RegExp(nome, 'i') }
        }).lean();

        if (!ligas || ligas.length === 0) {
            console.error(`[ERRO] Participante "${nome}" nao encontrado em nenhuma liga da temporada ${temporada}.`);
            process.exit(1);
        }

        console.log(`[2/6] Encontrado em ${ligas.length} liga(s).\n`);

        // Processar cada liga em que o participante aparece
        for (const liga of ligas) {
            const participante = liga.participantes.find(
                p => p.nome_cartola && p.nome_cartola.toLowerCase().includes(nome.toLowerCase())
            );

            if (!participante) continue;

            const timeId = participante.time_id;
            const ligaId = liga._id;
            const ligaNome = liga.nome;

            console.log(separator());
            console.log(`  Liga: ${ligaNome}`);
            console.log(`  Liga ID: ${ligaId}`);
            console.log(`  Time ID: ${timeId}`);
            console.log(`  Cartoleiro: ${participante.nome_cartola}`);
            console.log(`  Time: ${participante.nome_time}`);
            console.log(`  Ativo: ${participante.ativo ? 'Sim' : 'Nao'}`);
            console.log(separator());
            console.log('');

            // -----------------------------------------------------------------
            // 3. BUSCAR TODAS AS RODADAS DO PARTICIPANTE
            // -----------------------------------------------------------------
            console.log(`[3/6] Buscando rodadas para timeId=${timeId}, temporada=${temporada}...`);

            const rodadas = await Rodada.find({
                ligaId,
                timeId,
                temporada
            }).sort({ rodada: 1 }).lean();

            console.log(`[3/6] Encontradas ${rodadas.length} rodada(s).\n`);

            if (rodadas.length === 0) {
                console.log('[AVISO] Nenhuma rodada encontrada. Pulando esta liga.\n');
                continue;
            }

            // -----------------------------------------------------------------
            // 4. TABELA POR RODADA + CALCULO MANUAL
            // -----------------------------------------------------------------
            console.log(`[4/6] Detalhamento por rodada:`);
            console.log('');

            const header = `  ${padLeft('Rodada', 7)} | ${padLeft('Pontos', 10)} | ${padRight('NaoJogada', 10)} | ${padRight('Posicao', 8)} | ${padRight('ValorFin', 10)}`;
            console.log(header);
            console.log('  ' + dashSeparator(header.length - 2));

            let somaComNaoJogada = 0;
            let somaSemNaoJogada = 0;
            let rodadasJogadas = 0;
            let rodadasNaoJogadas = 0;

            for (const r of rodadas) {
                const pontos = r.pontos || 0;
                const naoJogada = r.rodadaNaoJogada ? 'SIM' : '-';
                const posicao = r.posicao != null ? r.posicao : '-';
                const valorFin = r.valorFinanceiro != null ? r.valorFinanceiro.toFixed(2) : '-';

                somaComNaoJogada += pontos;

                if (!r.rodadaNaoJogada) {
                    somaSemNaoJogada += pontos;
                    rodadasJogadas++;
                } else {
                    rodadasNaoJogadas++;
                }

                console.log(`  ${padLeft(r.rodada, 7)} | ${padLeft(pontos.toFixed(2), 10)} | ${padRight(naoJogada, 10)} | ${padRight(posicao, 8)} | ${padRight(valorFin, 10)}`);
            }

            console.log('  ' + dashSeparator(header.length - 2));
            console.log('');

            console.log(`  Soma TOTAL (com naoJogada):   ${somaComNaoJogada.toFixed(2)}`);
            console.log(`  Soma JOGADAS (sem naoJogada): ${somaSemNaoJogada.toFixed(2)}`);
            console.log(`  Rodadas jogadas:  ${rodadasJogadas}`);
            console.log(`  Rodadas nao jogadas: ${rodadasNaoJogadas}`);
            console.log(`  Total de registros: ${rodadas.length}`);
            console.log('');

            // -----------------------------------------------------------------
            // 5. BUSCAR RANKING TURNO (geral)
            // -----------------------------------------------------------------
            console.log('[5/6] Buscando RankingTurno (turno=geral)...');

            const rankingTurno = await RankingTurno.findOne({
                ligaId,
                temporada,
                turno: 'geral'
            }).lean();

            let turnoEntry = null;
            if (rankingTurno) {
                turnoEntry = (rankingTurno.ranking || []).find(
                    r => r.timeId === timeId
                );
            }

            // -----------------------------------------------------------------
            // 6. BUSCAR RANKING GERAL CACHE
            // -----------------------------------------------------------------
            console.log('[6/6] Buscando RankingGeralCache...');

            // Pegar o mais recente
            const rankingGeral = await RankingGeralCache.findOne({
                ligaId,
                temporada
            }).sort({ rodadaFinal: -1 }).lean();

            let geralEntry = null;
            if (rankingGeral) {
                geralEntry = (rankingGeral.ranking || []).find(
                    r => r.timeId === timeId
                );
            }

            // -----------------------------------------------------------------
            // TABELA COMPARATIVA
            // -----------------------------------------------------------------
            console.log('');
            console.log(separator());
            console.log('  COMPARACAO DE VALORES');
            console.log(separator());
            console.log('');

            const compHeader = `  ${padRight('Fonte', 30)} | ${padLeft('Pontos', 12)} | ${padLeft('Rodadas', 10)} | ${padLeft('Posicao', 10)}`;
            console.log(compHeader);
            console.log('  ' + dashSeparator(compHeader.length - 2));

            // Linha: Calculo manual (sem naoJogada)
            console.log(`  ${padRight('Manual (sem naoJogada)', 30)} | ${padLeft(somaSemNaoJogada.toFixed(2), 12)} | ${padLeft(rodadasJogadas, 10)} | ${padLeft('-', 10)}`);

            // Linha: Calculo manual (com naoJogada)
            console.log(`  ${padRight('Manual (com naoJogada)', 30)} | ${padLeft(somaComNaoJogada.toFixed(2), 12)} | ${padLeft(rodadas.length, 10)} | ${padLeft('-', 10)}`);

            // Linha: RankingTurno
            if (turnoEntry) {
                console.log(`  ${padRight('RankingTurno (geral)', 30)} | ${padLeft((turnoEntry.pontos || 0).toFixed(2), 12)} | ${padLeft(turnoEntry.rodadas_jogadas || '-', 10)} | ${padLeft(turnoEntry.posicao || '-', 10)}`);
            } else {
                console.log(`  ${padRight('RankingTurno (geral)', 30)} | ${padLeft('N/A', 12)} | ${padLeft('N/A', 10)} | ${padLeft('N/A', 10)}`);
            }

            // Linha: RankingGeralCache
            if (geralEntry) {
                console.log(`  ${padRight('RankingGeralCache', 30)} | ${padLeft((geralEntry.pontos_totais || 0).toFixed(2), 12)} | ${padLeft(geralEntry.rodadas_jogadas || '-', 10)} | ${padLeft(geralEntry.posicao || '-', 10)}`);
            } else {
                console.log(`  ${padRight('RankingGeralCache', 30)} | ${padLeft('N/A', 12)} | ${padLeft('N/A', 10)} | ${padLeft('N/A', 10)}`);
            }

            console.log('  ' + dashSeparator(compHeader.length - 2));
            console.log('');

            // -----------------------------------------------------------------
            // ANALISE DE DISCREPANCIAS
            // -----------------------------------------------------------------
            console.log(separator());
            console.log('  ANALISE DE DISCREPANCIAS');
            console.log(separator());
            console.log('');

            let temDiscrepancia = false;

            // Comparar com RankingTurno
            if (turnoEntry) {
                const diffTurno = Math.abs(somaSemNaoJogada - (turnoEntry.pontos || 0));
                if (diffTurno > 0.01) {
                    temDiscrepancia = true;
                    console.log(`  [!!] RankingTurno DIVERGE do calculo manual (sem naoJogada):`);
                    console.log(`       Manual: ${somaSemNaoJogada.toFixed(2)} vs Cache: ${(turnoEntry.pontos || 0).toFixed(2)}`);
                    console.log(`       Diferenca: ${diffTurno.toFixed(2)}`);
                } else {
                    console.log(`  [OK] RankingTurno BATE com calculo manual (sem naoJogada)`);
                }

                const diffTurnoComNJ = Math.abs(somaComNaoJogada - (turnoEntry.pontos || 0));
                if (diffTurnoComNJ <= 0.01 && diffTurno > 0.01) {
                    console.log(`  [!!] RankingTurno BATE com calculo COM naoJogada (possivel bug: incluindo rodadas nao jogadas)`);
                }

                // Comparar rodadas_jogadas
                if (turnoEntry.rodadas_jogadas != null) {
                    if (turnoEntry.rodadas_jogadas !== rodadasJogadas) {
                        temDiscrepancia = true;
                        console.log(`  [!!] Rodadas jogadas DIVERGEM: Manual=${rodadasJogadas} vs Cache=${turnoEntry.rodadas_jogadas}`);
                    } else {
                        console.log(`  [OK] Rodadas jogadas BATEM: ${rodadasJogadas}`);
                    }
                }

                // Info do cache
                console.log(`  [INFO] RankingTurno - rodada_atual: ${rankingTurno.rodada_atual}, status: ${rankingTurno.status}`);
                console.log(`  [INFO] RankingTurno - atualizado_em: ${rankingTurno.atualizado_em || rankingTurno.updatedAt || 'N/A'}`);
            } else {
                console.log(`  [AVISO] RankingTurno (turno=geral) NAO encontrado para este participante.`);
                if (rankingTurno) {
                    console.log(`  [INFO] Cache existe mas participante nao esta no ranking (${(rankingTurno.ranking || []).length} entries)`);
                } else {
                    console.log(`  [INFO] Cache RankingTurno nao existe para esta liga/temporada.`);
                }
            }

            console.log('');

            // Comparar com RankingGeralCache
            if (geralEntry) {
                const diffGeral = Math.abs(somaSemNaoJogada - (geralEntry.pontos_totais || 0));
                if (diffGeral > 0.01) {
                    temDiscrepancia = true;
                    console.log(`  [!!] RankingGeralCache DIVERGE do calculo manual (sem naoJogada):`);
                    console.log(`       Manual: ${somaSemNaoJogada.toFixed(2)} vs Cache: ${(geralEntry.pontos_totais || 0).toFixed(2)}`);
                    console.log(`       Diferenca: ${diffGeral.toFixed(2)}`);
                } else {
                    console.log(`  [OK] RankingGeralCache BATE com calculo manual (sem naoJogada)`);
                }

                const diffGeralComNJ = Math.abs(somaComNaoJogada - (geralEntry.pontos_totais || 0));
                if (diffGeralComNJ <= 0.01 && diffGeral > 0.01) {
                    console.log(`  [!!] RankingGeralCache BATE com calculo COM naoJogada (possivel bug: incluindo rodadas nao jogadas)`);
                }

                // Comparar rodadas_jogadas
                if (geralEntry.rodadas_jogadas != null) {
                    if (geralEntry.rodadas_jogadas !== rodadasJogadas) {
                        temDiscrepancia = true;
                        console.log(`  [!!] Rodadas jogadas DIVERGEM (GeralCache): Manual=${rodadasJogadas} vs Cache=${geralEntry.rodadas_jogadas}`);
                    } else {
                        console.log(`  [OK] Rodadas jogadas BATEM (GeralCache): ${rodadasJogadas}`);
                    }
                }

                // Info do cache
                console.log(`  [INFO] RankingGeralCache - rodadaFinal: ${rankingGeral.rodadaFinal}`);
                console.log(`  [INFO] RankingGeralCache - atualizadoEm: ${rankingGeral.atualizadoEm || rankingGeral.updatedAt || 'N/A'}`);
            } else {
                console.log(`  [AVISO] RankingGeralCache NAO encontrado para este participante.`);
                if (rankingGeral) {
                    console.log(`  [INFO] Cache existe mas participante nao esta no ranking (${(rankingGeral.ranking || []).length} entries)`);
                } else {
                    console.log(`  [INFO] Cache RankingGeralCache nao existe para esta liga/temporada.`);
                }
            }

            console.log('');

            // Resumo final
            if (!temDiscrepancia) {
                console.log('  >>> RESULTADO: Nenhuma discrepancia encontrada. Caches OK.');
            } else {
                console.log('  >>> RESULTADO: DISCREPANCIAS DETECTADAS! Revisar caches.');
            }

            console.log('');
            console.log(separator());
            console.log('');
        }

    } catch (error) {
        console.error('[ERRO] Falha durante a execucao:', error);
    } finally {
        await mongoose.disconnect();
        console.log('[FIM] Desconectado do MongoDB.');
    }
}

main();
