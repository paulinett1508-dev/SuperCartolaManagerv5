// =====================================================================
// SYSTEM HEALTH ROUTES - Dashboard de Saúde do Sistema (Admin)
// v1.0 - Monitoramento visual dos componentes críticos
// =====================================================================

import express from 'express';
import marketGate from '../utils/marketGate.js';
import RodadaSnapshot from '../models/RodadaSnapshot.js';
import Liga from '../models/Liga.js';
import { verificarAdmin } from '../middleware/auth.js';

const router = express.Router();

// =====================================================================
// HELPER: Testar latência de endpoint
// =====================================================================
async function testEndpointLatency(url, timeout = 5000) {
    const start = Date.now();
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
            signal: controller.signal,
            headers: { 'User-Agent': 'SuperCartolaManager-HealthCheck/1.0' }
        });

        clearTimeout(timeoutId);
        const latency = Date.now() - start;

        return {
            status: response.ok ? 'online' : 'degraded',
            latency_ms: latency,
            http_status: response.status,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        const latency = Date.now() - start;
        return {
            status: 'offline',
            latency_ms: latency >= timeout ? timeout : latency,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

// =====================================================================
// GET /api/admin/system-health
// Retorna status completo do sistema para dashboard
// =====================================================================
router.get('/', verificarAdmin, async (req, res) => {
    try {
        console.log('[HEALTH] Gerando relatório de saúde do sistema...');

        // 1. MarketGate Status
        const marketGateStatus = await (async () => {
            try {
                const status = await marketGate.fetchStatus();
                const cacheStats = marketGate.getCacheStats();

                return {
                    status: 'online',
                    mercado_aberto: status.mercado_aberto,
                    rodada_atual: status.rodada_atual,
                    temporada: status.temporada,
                    cache: {
                        ativo: cacheStats.has_cache,
                        ttl_segundos: cacheStats.ttl_seconds
                    },
                    ultimo_fetch: cacheStats.last_update,
                    stale: status._stale || false,
                    fallback: status._fallback || false
                };
            } catch (error) {
                return {
                    status: 'offline',
                    error: error.message
                };
            }
        })();

        // 2. Consolidação Automática Status
        const consolidacaoStatus = await (async () => {
            try {
                // Verificar últimas consolidações
                const ultimasConsolidacoes = await RodadaSnapshot.find({
                    status: 'consolidada'
                })
                    .sort({ atualizado_em: -1 })
                    .limit(5)
                    .select('liga_id rodada atualizado_em')
                    .lean();

                // Buscar nomes das ligas
                const ligasIds = [...new Set(ultimasConsolidacoes.map(c => c.liga_id))];
                const ligas = await Liga.find({ _id: { $in: ligasIds } })
                    .select('_id nome')
                    .lean();

                const ligasMap = Object.fromEntries(ligas.map(l => [l._id.toString(), l.nome]));

                const consolidacoesFormatadas = ultimasConsolidacoes.map(c => ({
                    liga: ligasMap[c.liga_id.toString()] || 'Liga Desconhecida',
                    rodada: c.rodada,
                    timestamp: c.atualizado_em
                }));

                return {
                    status: 'online',
                    ultimas_consolidacoes: consolidacoesFormatadas,
                    total_snapshots: await RodadaSnapshot.countDocuments({ status: 'consolidada' })
                };
            } catch (error) {
                return {
                    status: 'offline',
                    error: error.message
                };
            }
        })();

        // 3. API Cartola Status
        const cartolaApiStatus = await testEndpointLatency(
            'https://api.cartolafc.globo.com/mercado/status',
            5000
        );

        // 4. Jogos do Dia Status (via proxy)
        const jogosApiStatus = await (async () => {
            const start = Date.now();
            try {
                const response = await fetch(`http://localhost:${process.env.PORT || 3000}/api/jogos-ao-vivo/status`);
                const data = await response.json();

                return {
                    status: 'online',
                    latency_ms: Date.now() - start,
                    fonte_ativa: data.fonteAtiva || 'unknown',
                    cache_ttl: data.cacheTTL || 0,
                    timestamp: new Date().toISOString()
                };
            } catch (error) {
                return {
                    status: 'offline',
                    latency_ms: Date.now() - start,
                    error: error.message,
                    timestamp: new Date().toISOString()
                };
            }
        })();

        // 5. Database Status
        const databaseStatus = {
            status: 'online',
            connected: global.mongoose?.connection?.readyState === 1,
            uptime_seconds: Math.floor(process.uptime()),
            collections: {
                rodadas_consolidadas: await RodadaSnapshot.countDocuments({ status: 'consolidada' }),
                ligas_ativas: await Liga.countDocuments({ ativa: true })
            }
        };

        // 6. Sistema Geral
        const sistemaStatus = {
            uptime_seconds: Math.floor(process.uptime()),
            uptime_formatted: formatUptime(process.uptime()),
            memory_usage: {
                rss_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
                heap_used_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                heap_total_mb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
            },
            node_version: process.version,
            timestamp: new Date().toISOString()
        };

        // Calcular health score geral
        const healthScore = calculateHealthScore({
            marketGate: marketGateStatus,
            consolidacao: consolidacaoStatus,
            cartolaApi: cartolaApiStatus,
            jogosApi: jogosApiStatus,
            database: databaseStatus
        });

        // Resposta completa
        res.json({
            success: true,
            health_score: healthScore,
            components: {
                market_gate: marketGateStatus,
                consolidacao_automatica: consolidacaoStatus,
                api_cartola: cartolaApiStatus,
                api_jogos: jogosApiStatus,
                database: databaseStatus,
                sistema: sistemaStatus
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[HEALTH] Erro ao gerar relatório:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao gerar relatório de saúde',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// =====================================================================
// HELPERS
// =====================================================================

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

function calculateHealthScore(components) {
    let score = 100;

    // MarketGate (-20 se offline, -10 se stale)
    if (components.marketGate.status === 'offline') score -= 20;
    else if (components.marketGate.stale) score -= 10;

    // Consolidação (-15 se offline)
    if (components.consolidacao.status === 'offline') score -= 15;

    // API Cartola (-20 se offline, -5 se latência > 2s)
    if (components.cartolaApi.status === 'offline') score -= 20;
    else if (components.cartolaApi.latency_ms > 2000) score -= 5;

    // API Jogos (-10 se offline)
    if (components.jogosApi.status === 'offline') score -= 10;

    // Database (-25 se offline)
    if (components.database.status === 'offline' || !components.database.connected) score -= 25;

    return Math.max(0, score);
}

console.log('[ROUTES] System Health routes carregadas');

export default router;
