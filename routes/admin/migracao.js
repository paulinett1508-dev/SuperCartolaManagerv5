// routes/admin/migracao.js
// =====================================================================
// ENDPOINT DE MIGRAÇÃO - FIX EXTRATO PC/MM/TOP10
// =====================================================================

import express from 'express';
import Liga from '../../models/Liga.js';
import ExtratoFinanceiroCache from '../../models/ExtratoFinanceiroCache.js';

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
 * GET /api/admin/migracao/fix-extrato-2026
 * Analisa caches com módulos faltantes (dry-run)
 */
router.get('/fix-extrato-2026', async (req, res) => {
    try {
        const TEMPORADA_ALVO = 2026;
        const ligaIdFiltro = req.query.ligaId;

        const stats = {
            ligasAnalisadas: 0,
            participantesAnalisados: 0,
            cachesComProblemas: 0,
            detalhes: []
        };

        // Buscar ligas
        const query = {};
        if (ligaIdFiltro) query._id = ligaIdFiltro;

        const ligas = await Liga.find(query).lean();
        stats.ligasAnalisadas = ligas.length;

        for (const liga of ligas) {
            const participantes = liga.participantes || [];

            for (const participante of participantes) {
                const timeId = participante.time_id;
                stats.participantesAnalisados++;

                const cache = await ExtratoFinanceiroCache.findOne({
                    liga_id: String(liga._id),
                    time_id: Number(timeId),
                    temporada: TEMPORADA_ALVO
                });

                if (!cache) continue;

                const modulosFaltantes = detectarModulosFaltantes(cache, liga);

                if (modulosFaltantes.length > 0) {
                    stats.cachesComProblemas++;
                    stats.detalhes.push({
                        liga: liga.nome,
                        ligaId: String(liga._id),
                        time: participante.nome_time || `Time ${timeId}`,
                        timeId: Number(timeId),
                        modulosFaltantes: modulosFaltantes.map(m => m.nome),
                        rodadaConsolidada: cache.ultima_rodada_consolidada,
                        saldoAtual: cache.saldo_consolidado,
                        transacoes: cache.historico_transacoes?.length || 0
                    });
                }
            }
        }

        res.json({
            success: true,
            mode: 'dry-run',
            temporada: TEMPORADA_ALVO,
            stats,
            message: `Análise concluída. ${stats.cachesComProblemas} cache(s) com problema.`
        });

    } catch (error) {
        console.error('[MIGRACAO] Erro:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/admin/migracao/fix-extrato-2026
 * Executa correção (deleta caches com problemas)
 */
router.post('/fix-extrato-2026', async (req, res) => {
    try {
        const TEMPORADA_ALVO = 2026;
        const ligaIdFiltro = req.query.ligaId;
        const force = req.query.force === 'true';

        if (!force) {
            return res.status(400).json({
                error: 'Confirmação necessária. Use ?force=true para executar.'
            });
        }

        const stats = {
            ligasAnalisadas: 0,
            participantesAnalisados: 0,
            cachesComProblemas: 0,
            cachesCorrigidos: 0,
            erros: 0,
            detalhes: []
        };

        const query = {};
        if (ligaIdFiltro) query._id = ligaIdFiltro;

        const ligas = await Liga.find(query).lean();
        stats.ligasAnalisadas = ligas.length;

        for (const liga of ligas) {
            const participantes = liga.participantes || [];

            for (const participante of participantes) {
                const timeId = participante.time_id;
                stats.participantesAnalisados++;

                const cache = await ExtratoFinanceiroCache.findOne({
                    liga_id: String(liga._id),
                    time_id: Number(timeId),
                    temporada: TEMPORADA_ALVO
                });

                if (!cache) continue;

                const modulosFaltantes = detectarModulosFaltantes(cache, liga);

                if (modulosFaltantes.length > 0) {
                    stats.cachesComProblemas++;

                    try {
                        await ExtratoFinanceiroCache.deleteOne({ _id: cache._id });
                        stats.cachesCorrigidos++;

                        stats.detalhes.push({
                            liga: liga.nome,
                            time: participante.nome_time || `Time ${timeId}`,
                            timeId: Number(timeId),
                            modulosFaltantes: modulosFaltantes.map(m => m.nome),
                            status: 'corrigido'
                        });
                    } catch (err) {
                        stats.erros++;
                        stats.detalhes.push({
                            liga: liga.nome,
                            time: participante.nome_time || `Time ${timeId}`,
                            timeId: Number(timeId),
                            status: 'erro',
                            erro: err.message
                        });
                    }
                }
            }
        }

        res.json({
            success: true,
            mode: 'execution',
            temporada: TEMPORADA_ALVO,
            stats,
            message: `Correção concluída. ${stats.cachesCorrigidos} cache(s) corrigido(s).`
        });

    } catch (error) {
        console.error('[MIGRACAO] Erro:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
