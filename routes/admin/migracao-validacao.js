// routes/admin/migracao-validacao.js
// =====================================================================
// ENDPOINT DE VALIDAÇÃO - COMPARAÇÃO DE SALDOS ANTES/DEPOIS
// =====================================================================

import express from 'express';
import Liga from '../../models/Liga.js';
import ExtratoFinanceiroCache from '../../models/ExtratoFinanceiroCache.js';
import axios from 'axios';

const router = express.Router();

// ✅ Middleware de autorização admin (session-based)
function requireAdmin(req, res, next) {
    if (!req.session?.admin) {
        return res.status(401).json({
            success: false,
            error: 'Acesso restrito a administradores'
        });
    }
    next();
}

router.use(requireAdmin);

/**
 * Detecta módulos faltantes no cache de extrato
 */
function detectarModulosFaltantes(cache, liga) {
    const modulosFaltantes = [];
    const transacoes = cache.historico_transacoes || [];
    const rodadaConsolidada = cache.ultima_rodada_consolidada || 0;

    // 1. PONTOS CORRIDOS
    const pcHabilitado = liga.configuracoes?.pontos_corridos?.habilitado ||
                         liga.modulos_ativos?.pontosCorridos;
    if (pcHabilitado) {
        const rodadaInicialPC = liga.configuracoes?.pontos_corridos?.rodadaInicial || 7;
        if (rodadaConsolidada >= rodadaInicialPC) {
            const temPC = transacoes.some(t =>
                t.tipo === 'PONTOS_CORRIDOS' && t.rodada >= rodadaInicialPC
            );
            if (!temPC) {
                modulosFaltantes.push({
                    nome: 'PONTOS_CORRIDOS',
                    rodadaEsperada: rodadaInicialPC
                });
            }
        }
    }

    // 2. MATA-MATA
    const mmHabilitado = liga.configuracoes?.mata_mata?.habilitado ||
                         liga.modulos_ativos?.mataMata;
    if (mmHabilitado) {
        const edicoes = liga.configuracoes?.mata_mata?.edicoes || [];
        if (edicoes.length > 0 && rodadaConsolidada >= 3) {
            const temMM = transacoes.some(t => t.tipo === 'MATA_MATA');
            if (!temMM) {
                modulosFaltantes.push({
                    nome: 'MATA_MATA',
                    edicoesConfiguradas: edicoes.length
                });
            }
        }
    }

    return modulosFaltantes;
}

/**
 * GET /api/admin/migracao-validacao/preview-correcoes
 * Preview de correções com saldos antes/depois
 */
router.get('/preview-correcoes', async (req, res) => {
    try {
        const TEMPORADA_ALVO = 2026;
        const ligaIdFiltro = req.query.ligaId;

        const resultado = {
            timestamp: new Date().toISOString(),
            temporada: TEMPORADA_ALVO,
            resumo: {
                ligasAnalisadas: 0,
                participantesAnalisados: 0,
                participantesComProblema: 0,
                participantesOK: 0
            },
            problemas: [],
            limpos: []
        };

        // Buscar ligas
        const query = {};
        if (ligaIdFiltro) query._id = ligaIdFiltro;

        const ligas = await Liga.find(query).lean();
        resultado.resumo.ligasAnalisadas = ligas.length;

        for (const liga of ligas) {
            const participantes = liga.participantes || [];

            for (const participante of participantes) {
                const timeId = participante.time_id;
                resultado.resumo.participantesAnalisados++;

                const cache = await ExtratoFinanceiroCache.findOne({
                    liga_id: String(liga._id),
                    time_id: Number(timeId),
                    temporada: TEMPORADA_ALVO
                });

                if (!cache) {
                    resultado.limpos.push({
                        liga: liga.nome,
                        ligaId: String(liga._id),
                        time: participante.nome_time || `Time ${timeId}`,
                        timeId: Number(timeId),
                        status: 'sem_cache',
                        nota: 'Cache será criado no próximo acesso'
                    });
                    resultado.resumo.participantesOK++;
                    continue;
                }

                const modulosFaltantes = detectarModulosFaltantes(cache, liga);

                if (modulosFaltantes.length > 0) {
                    resultado.resumo.participantesComProblema++;

                    // Calcular estimativa de saldo correto
                    const saldoAtual = cache.saldo_consolidado || 0;
                    const transacoesPorRodada = {};

                    // ✅ NOVO: Buscar informações adicionais do participante
                    const saldoLegado = cache.saldo_legado || 0;
                    const inscricao2026Paga = participante.pagouInscricao === true;
                    const valorInscricao = liga.parametros_financeiros?.inscricao || 0;

                    cache.historico_transacoes?.forEach(t => {
                        if (!transacoesPorRodada[t.rodada]) {
                            transacoesPorRodada[t.rodada] = {
                                banco: 0,
                                pc: 0,
                                mm: 0,
                                top10: 0
                            };
                        }

                        if (t.tipo === 'BANCO' || t.tipo === 'BONUS' || t.tipo === 'ONUS') {
                            transacoesPorRodada[t.rodada].banco += t.valor || 0;
                        } else if (t.tipo === 'PONTOS_CORRIDOS') {
                            transacoesPorRodada[t.rodada].pc += t.valor || 0;
                        } else if (t.tipo === 'MATA_MATA') {
                            transacoesPorRodada[t.rodada].mm += t.valor || 0;
                        } else if (t.tipo === 'MITO' || t.tipo === 'MICO') {
                            transacoesPorRodada[t.rodada].top10 += t.valor || 0;
                        }
                    });

                    resultado.problemas.push({
                        liga: liga.nome,
                        ligaId: String(liga._id),
                        time: participante.nome_time || `Time ${timeId}`,
                        timeId: Number(timeId),
                        modulosFaltantes: modulosFaltantes.map(m => m.nome),
                        rodadaConsolidada: cache.ultima_rodada_consolidada,
                        saldoAtual,
                        // ✅ NOVO: Contexto financeiro completo
                        contextoFinanceiro: {
                            saldoLegado2025: saldoLegado,
                            inscricao2026: {
                                valor: valorInscricao,
                                paga: inscricao2026Paga,
                                status: inscricao2026Paga ? 'PAGA' : 'PENDENTE'
                            }
                        },
                        transacoesPorRodada,
                        totalTransacoes: cache.historico_transacoes?.length || 0,
                        urlValidacao: `/api/fluxo-financeiro/${liga._id}/extrato/${timeId}?temporada=${TEMPORADA_ALVO}`,
                        urlParticipante: `/participante/?liga=${liga._id}&time=${timeId}&view=extrato`
                    });
                } else {
                    resultado.resumo.participantesOK++;
                    resultado.limpos.push({
                        liga: liga.nome,
                        ligaId: String(liga._id),
                        time: participante.nome_time || `Time ${timeId}`,
                        timeId: Number(timeId),
                        status: 'ok',
                        saldo: cache.saldo_consolidado,
                        rodadas: cache.ultima_rodada_consolidada
                    });
                }
            }
        }

        res.json({
            success: true,
            ...resultado
        });

    } catch (error) {
        console.error('[MIGRACAO-VALIDACAO] Erro:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/admin/migracao-validacao/recalcular-participante
 * Força recálculo de um participante específico e retorna antes/depois
 */
router.post('/recalcular-participante', async (req, res) => {
    try {
        const { ligaId, timeId, temporada = 2026 } = req.body;

        if (!ligaId || !timeId) {
            return res.status(400).json({
                success: false,
                error: 'ligaId e timeId são obrigatórios'
            });
        }

        // 1. Buscar cache ANTES
        const cacheAntes = await ExtratoFinanceiroCache.findOne({
            liga_id: String(ligaId),
            time_id: Number(timeId),
            temporada: Number(temporada)
        }).lean();

        const saldoAntes = cacheAntes?.saldo_consolidado || 0;
        const transacoesAntes = cacheAntes?.historico_transacoes?.length || 0;

        // 2. Deletar cache
        if (cacheAntes) {
            await ExtratoFinanceiroCache.deleteOne({ _id: cacheAntes._id });
        }

        // 3. Forçar recálculo chamando API interna
        const baseURL = `http://localhost:${process.env.PORT || 3000}`;
        const urlExtrato = `${baseURL}/api/fluxo-financeiro/${ligaId}/extrato/${timeId}?temporada=${temporada}`;

        const response = await axios.get(urlExtrato);
        const extratoNovo = response.data;

        // 4. Buscar cache DEPOIS
        const cacheDepois = await ExtratoFinanceiroCache.findOne({
            liga_id: String(ligaId),
            time_id: Number(timeId),
            temporada: Number(temporada)
        }).lean();

        const saldoDepois = cacheDepois?.saldo_consolidado || extratoNovo.saldo_final || 0;
        const transacoesDepois = cacheDepois?.historico_transacoes?.length || 0;

        // 5. Calcular diferença
        const diferenca = saldoDepois - saldoAntes;

        res.json({
            success: true,
            participante: {
                ligaId,
                timeId,
                temporada
            },
            antes: {
                saldo: saldoAntes,
                transacoes: transacoesAntes,
                cacheExistia: !!cacheAntes
            },
            depois: {
                saldo: saldoDepois,
                transacoes: transacoesDepois
            },
            diferenca: {
                valor: diferenca,
                percentual: saldoAntes !== 0 ? ((diferenca / Math.abs(saldoAntes)) * 100).toFixed(2) : 'N/A',
                mudou: diferenca !== 0
            },
            extrato: extratoNovo
        });

    } catch (error) {
        console.error('[MIGRACAO-VALIDACAO] Erro ao recalcular:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            details: error.response?.data || null
        });
    }
});

export default router;
