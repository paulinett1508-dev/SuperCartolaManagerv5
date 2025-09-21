// routes/artilheiro-campeao-routes.js - VERSÃO CORRIGIDA PARA CONTROLLER V2.0
import express from "express";
import {
    getGolsAgregados,
    getGolsRodada,
    detectarRodada,
    getRankingLiga,
    getEstatisticas,
    forcarColeta,
    limparCache,
} from "../controllers/artilheiroCampeaoController.js";

const router = express.Router();

console.log("🚀 [ROUTES] Carregando rotas do Artilheiro Campeão v2.0...");

// ========================================
// ENDPOINTS PRINCIPAIS (V2.0 - SISTEMA INTELIGENTE)
// ========================================

/**
 * ENDPOINT: Dados agregados de um participante (múltiplas rodadas)
 * GET /api/artilheiro-campeao/:ligaId/gols/:timeId/agregado?inicio=X&fim=Y
 *
 * Exemplo: /api/artilheiro-campeao/684d821cf1a7ae16d1f89572/gols/1926323/agregado?inicio=1&fim=14
 */
router.get("/:ligaId/gols/:timeId/agregado", getGolsAgregados);

/**
 * ENDPOINT: Dados de uma rodada específica
 * GET /api/artilheiro-campeao/:ligaId/gols/:timeId/:rodada
 *
 * Exemplo: /api/artilheiro-campeao/684d821cf1a7ae16d1f89572/gols/1926323/14
 */
router.get("/:ligaId/gols/:timeId/:rodada", getGolsRodada);

/**
 * ENDPOINT: Ranking completo da liga
 * GET /api/artilheiro-campeao/:ligaId/ranking?inicio=X&fim=Y
 *
 * Exemplo: /api/artilheiro-campeao/684d821cf1a7ae16d1f89572/ranking?inicio=1&fim=14
 */
router.get("/:ligaId/ranking", getRankingLiga);

/**
 * ENDPOINT: Detectar rodada atual do Cartola FC
 * GET /api/artilheiro-campeao/:ligaId/detectar-rodada
 */
router.get("/:ligaId/detectar-rodada", detectarRodada);

/**
 * ENDPOINT: Estatísticas da liga e do sistema
 * GET /api/artilheiro-campeao/:ligaId/estatisticas
 */
router.get("/:ligaId/estatisticas", getEstatisticas);

// ========================================
// ENDPOINTS DE ADMINISTRAÇÃO
// ========================================

/**
 * ENDPOINT: Forçar coleta de uma rodada específica
 * POST /api/artilheiro-campeao/:ligaId/coletar/:timeId/:rodada
 */
router.post("/:ligaId/coletar/:timeId/:rodada", forcarColeta);

/**
 * ENDPOINT: Limpar cache do sistema
 * DELETE /api/artilheiro-campeao/limpar-cache
 */
router.delete("/limpar-cache", limparCache);

// ========================================
// ENDPOINTS DE COMPATIBILIDADE (V1.X)
// ========================================

/**
 * COMPATIBILIDADE: Endpoint legado para dados acumulados
 * GET /api/artilheiro-campeao/:ligaId/acumulado
 *
 * Redireciona para o novo endpoint de ranking
 */
router.get("/:ligaId/acumulado", async (req, res) => {
    const { ligaId } = req.params;
    const { inicio = 1, fim = 14 } = req.query;

    console.log(`🔄 [COMPATIBILIDADE] Redirecionando /acumulado para /ranking`);

    // Redirecionar para o novo endpoint
    req.url = `/${ligaId}/ranking?inicio=${inicio}&fim=${fim}`;
    return getRankingLiga(req, res);
});

/**
 * COMPATIBILIDADE: Endpoint legado para rodadas disponíveis
 * GET /api/artilheiro-campeao/:ligaId/rodadas
 */
router.get("/:ligaId/rodadas", async (req, res) => {
    const { ligaId } = req.params;

    console.log(
        `🔄 [COMPATIBILIDADE] Redirecionando /rodadas para /estatisticas`,
    );

    try {
        // Buscar estatísticas e extrair rodadas
        req.url = `/${ligaId}/estatisticas`;

        // Criar um response wrapper para capturar o resultado
        const originalJson = res.json;
        res.json = function (data) {
            if (data.success && data.data.mongodb.rodadasDisponiveis) {
                // Converter para formato legado
                const rodadasLegacy = data.data.mongodb.rodadasDisponiveis.map(
                    (r) => ({
                        rodada: r,
                        disponivel: true,
                    }),
                );

                return originalJson.call(this, {
                    success: true,
                    rodadas: rodadasLegacy,
                    total: rodadasLegacy.length,
                });
            }
            return originalJson.call(this, data);
        };

        return getEstatisticas(req, res);
    } catch (error) {
        console.error(`❌ [COMPATIBILIDADE] Erro em /rodadas:`, error);
        res.status(500).json({
            success: false,
            message: "Erro ao buscar rodadas disponíveis",
            error: error.message,
        });
    }
});

// ========================================
// MIDDLEWARE DE LOG
// ========================================

router.use((req, res, next) => {
    console.log(
        `📝 [ROUTES] ${req.method} ${req.originalUrl} - ${new Date().toISOString()}`,
    );
    next();
});

// ========================================
// ENDPOINT DE TESTE
// ========================================

/**
 * ENDPOINT: Verificar se o sistema está funcionando
 * GET /api/artilheiro-campeao/health
 */
router.get("/health", (req, res) => {
    res.json({
        success: true,
        message: "Sistema Artilheiro Campeão v2.0 funcionando",
        timestamp: new Date().toISOString(),
        versao: "2.0_inteligente",
        funcionalidades: [
            "coleta_inteligente_mongodb",
            "proxy_api_cartolafc",
            "cache_sistema",
            "endpoints_v2",
            "compatibilidade_v1",
        ],
    });
});

// Detectar rodada atual
router.get("/:ligaId/detectar-rodada", detectarRodada);

// Buscar ranking de uma rodada específica
router.get("/:ligaId/ranking/rodada/:rodada", getRankingLiga);

export default router;