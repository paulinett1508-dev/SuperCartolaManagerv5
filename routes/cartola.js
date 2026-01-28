import express from "express";
import fetch from "node-fetch";
import {
  listarClubes,
  obterTimePorId,
  obterPontuacao,
  obterEscalacao,
  getMercadoStatus,
  getParciais,
  getClubes,
  sincronizarDadosCartola,
  obterDadosCompletosCartola,
} from "../controllers/cartolaController.js";
import cartolaApiService from "../services/cartolaApiService.js";
import { isSeasonFinished } from "../utils/seasonGuard.js";
import { CURRENT_SEASON, SEASON_CONFIG } from "../config/seasons.js";

const router = express.Router();

router.get("/clubes", listarClubes);

// ===== DADOS COMPLETOS DO TIME (PARA MODAL) =====
// IMPORTANTE: Esta rota DEVE vir ANTES de /time/:id para não ser interceptada
router.get("/time/:id/completo", obterDadosCompletosCartola);

// ===== SINCRONIZAR DADOS DO PARTICIPANTE =====
router.post("/time/:id/sincronizar", sincronizarDadosCartola);

// Rotas básicas de time
router.get("/time/:id", obterTimePorId);
router.get("/time/:id/:rodada", obterPontuacao);
router.get("/time/:id/:rodada/escalacao", obterEscalacao);
// ===== BUSCAR STATUS DO MERCADO (RODADA ATUAL) =====
router.get('/mercado-status', async (req, res) => {
    try {
        // Usar a API diretamente já que não há função específica no service
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch('https://api.cartola.globo.com/mercado/status', {
            signal: controller.signal,
            headers: {
                'User-Agent': 'SuperCartolaManager/1.0'
            }
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('[CARTOLA-ROUTES] Erro ao buscar mercado-status:', error.message);
        // Fallback com valores padrão para não quebrar o frontend
        res.json({
            temporada: new Date().getFullYear(),
            rodada_atual: 1,
            status_mercado: 1,
            erro_interno: true,
            mensagem: 'Usando dados de fallback'
        });
    }
});

// ===== BUSCAR STATUS DO MERCADO (RODADA ATUAL) - ROTA ALTERNATIVA =====
router.get('/status', async (req, res) => {
    try {
        const response = await fetch('https://api.cartola.globo.com/mercado/status');
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('[CARTOLA-ROUTES] Erro ao buscar mercado-status:', error);
        res.status(500).json({
            erro: 'Erro ao buscar status do mercado',
            rodada_atual: 1 // Fallback
        });
    }
});

// ===== ENDPOINT DE DEBUG - ESTADO COMPLETO DO SISTEMA =====
router.get('/status/debug', async (req, res) => {
    try {
        // Buscar informações de todas as fontes
        const statusMercado = await cartolaApiService.obterStatusMercado();
        const ultimaRodada = await cartolaApiService.detectarUltimaRodadaComDados();
        const seasonGuard = isSeasonFinished();

        // Compilar resposta
        const debugInfo = {
            timestamp: new Date().toISOString(),
            api_cartola: {
                rodada_atual: statusMercado.rodada_atual,
                status_mercado: statusMercado.status_mercado,
                mercado_aberto: statusMercado.status_mercado === 1,
                temporada: statusMercado.temporada,
                fechamento: statusMercado.fechamento,
                _descricao_status: _getStatusDescription(statusMercado.status_mercado)
            },
            deteccao_rodadas: {
                ultima_rodada_com_dados: ultimaRodada,
                metodo: 'detectarUltimaRodadaComDados()'
            },
            season_guard: {
                ativo: seasonGuard,
                descricao: seasonGuard ? 'Temporada encerrada - circuit breaker ativo' : 'Temporada ativa - API normal'
            },
            backend_config: {
                season: CURRENT_SEASON,
                status: SEASON_CONFIG.status,
                rodada_inicial: SEASON_CONFIG.rodadaInicial,
                rodada_final: SEASON_CONFIG.rodadaFinal,
                data_fim: SEASON_CONFIG.dataFim
            },
            frontend_configs: {
                admin: 'Verificar: public/js/core/season-config.js → SEASON_STATUS',
                participante: 'Verificar: public/participante/js/participante-config.js → SEASON_STATUS',
                nota: 'Status "preparando" mantém módulos opcionais bloqueados até admin configurar'
            },
            cache_info: cartolaApiService.obterEstatisticasCache()
        };

        res.json(debugInfo);
    } catch (error) {
        console.error('[DEBUG] Erro ao gerar debug info:', error);
        res.status(500).json({
            erro: 'Erro ao gerar informações de debug',
            detalhes: error.message
        });
    }
});

// Helper para descrição de status
function _getStatusDescription(statusCode) {
    const descriptions = {
        1: 'ABERTO - Mercado aceitando escalações',
        2: 'FECHADO - Mercado fechado',
        3: 'DESBLOQUEADO - Mercado reaberto',
        4: 'ENCERRADO - Rodada encerrada',
        5: 'FUTURO - Rodada futura',
        6: 'TEMPORADA_ENCERRADA - Campeonato finalizado'
    };
    return descriptions[statusCode] || `Desconhecido (${statusCode})`;
}

router.get("/version", (req, res) =>
  res.status(200).json({ version: "1.0.0" }),
);

export default router;