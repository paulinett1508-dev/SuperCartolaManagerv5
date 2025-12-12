import express from "express";
import axios from "axios";
import { isSeasonFinished, SEASON_CONFIG, logBlockedOperation } from "../utils/seasonGuard.js";

const router = express.Router();
const CARTOLA_API_BASE = "https://api.cartola.globo.com";

// =====================================================================
// HELPER: Calcular rodada atual dinamicamente
// =====================================================================
function calcularRodadaAtual() {
    // Temporada 2025: R1 começou em 29/03/2025
    const inicioTemporada = new Date("2025-03-29T00:00:00-03:00");
    const agora = new Date();

    // Cada rodada dura ~7 dias em média
    const diasPassados = Math.floor(
        (agora - inicioTemporada) / (1000 * 60 * 60 * 24),
    );
    const rodadaCalculada = Math.ceil(diasPassados / 7);

    // Limitar entre 1 e 38
    return Math.max(1, Math.min(38, rodadaCalculada));
}

// Middleware para CORS
router.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS",
    );
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    );

    if (req.method === "OPTIONS") {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Proxy para liga específica
router.get("/liga/:ligaId", async (req, res) => {
    try {
        const { ligaId } = req.params;
        console.log(`🔄 Buscando liga: ${ligaId}`);

        const response = await axios.get(`${CARTOLA_API_BASE}/liga/${ligaId}`, {
            timeout: 10000,
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
        });

        console.log(`✅ Liga encontrada: ${response.data.nome}`);
        res.json(response.data);
    } catch (error) {
        console.error(
            `❌ Erro ao buscar liga ${req.params.ligaId}:`,
            error.message,
        );
        res.status(error.response?.status || 500).json({
            error: "Erro ao buscar liga",
            details: error.message,
        });
    }
});

// Rota: Status do mercado (corrigida com fallback dinâmico)
// ⛔ SEASON GUARD: Retorna status fixo se temporada encerrada
router.get("/mercado/status", async (req, res) => {
    // Se temporada encerrada, retornar status fixo imediatamente
    if (isSeasonFinished()) {
        logBlockedOperation('cartola-proxy/mercado/status');
        return res.json({
            rodada_atual: SEASON_CONFIG.LAST_ROUND,
            status_mercado: 6, // 6 = Temporada Encerrada
            mercado_aberto: false,
            temporada_encerrada: true,
            season: SEASON_CONFIG.SEASON_YEAR,
            message: SEASON_CONFIG.BLOCK_MESSAGE
        });
    }

    try {
        console.log("🔄 [CARTOLA-PROXY] Buscando status do mercado...");

        const response = await axios.get(
            "https://api.cartola.globo.com/mercado/status",
            {
                timeout: 10000,
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                },
            },
        );

        console.log(
            "✅ [CARTOLA-PROXY] Status do mercado obtido:",
            response.data,
        );
        res.json(response.data);
    } catch (error) {
        console.error(
            "❌ [CARTOLA-PROXY] Erro ao buscar status do mercado:",
            error.message,
        );

        // ✅ FALLBACK DINÂMICO - Calcula rodada baseado na data atual
        const rodadaCalculada = calcularRodadaAtual();
        const agora = new Date();

        console.log(
            `⚠️ [CARTOLA-PROXY] Usando fallback dinâmico - Rodada: ${rodadaCalculada}`,
        );

        res.json({
            rodada_atual: rodadaCalculada,
            status_mercado: 1, // ABERTO (permite banner aparecer)
            mes: agora.getMonth() + 1,
            ano: agora.getFullYear(),
            aviso: "Dados de fallback - API indisponível",
            fallback: true,
        });
    }
});

// Endpoint: Atletas pontuados (para cálculo de parciais) - SEM CACHE
// ⛔ SEASON GUARD: Retorna vazio se temporada encerrada
router.get("/atletas/pontuados", async (req, res) => {
    // Se temporada encerrada, retornar vazio imediatamente
    if (isSeasonFinished()) {
        logBlockedOperation('cartola-proxy/atletas/pontuados');
        return res.json({
            atletas: {},
            rodada: SEASON_CONFIG.LAST_ROUND,
            temporada_encerrada: true,
            message: SEASON_CONFIG.BLOCK_MESSAGE
        });
    }

    try {
        console.log(
            "🔄 [CARTOLA-PROXY] Buscando atletas pontuados (sem cache)...",
        );

        const response = await axios.get(
            "https://api.cartola.globo.com/atletas/pontuados",
            {
                timeout: 10000,
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                    Pragma: "no-cache",
                    Expires: "0",
                },
            },
        );

        console.log(
            `✅ [CARTOLA-PROXY] ${Object.keys(response.data.atletas || {}).length} atletas pontuados obtidos`,
        );

        // Headers anti-cache na resposta
        res.set({
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
        });

        res.json(response.data);
    } catch (error) {
        console.error(
            "❌ [CARTOLA-PROXY] Erro ao buscar atletas pontuados:",
            error.message,
        );

        // Retornar objeto vazio em caso de erro (mercado pode estar fechado)
        res.json({
            atletas: {},
            rodada: calcularRodadaAtual(),
        });
    }
});

// Endpoint: Escalação de um time em uma rodada específica
router.get("/time/id/:timeId/:rodada", async (req, res) => {
    try {
        const { timeId, rodada } = req.params;
        console.log(
            `🔄 [CARTOLA-PROXY] Buscando escalação do time ${timeId} na rodada ${rodada}...`,
        );

        const response = await axios.get(
            `https://api.cartola.globo.com/time/id/${timeId}/${rodada}`,
            {
                timeout: 10000,
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                },
            },
        );

        console.log(`✅ [CARTOLA-PROXY] Escalação obtida para time ${timeId}`);
        res.json(response.data);
    } catch (error) {
        console.error(
            `❌ [CARTOLA-PROXY] Erro ao buscar escalação do time ${req.params.timeId}:`,
            error.message,
        );

        // Retornar 404 se time não jogou na rodada
        if (error.response?.status === 404) {
            res.status(404).json({
                error: "Time não jogou nesta rodada",
                timeId: req.params.timeId,
                rodada: req.params.rodada,
            });
        } else {
            res.status(error.response?.status || 500).json({
                error: "Erro ao buscar escalação",
                details: error.message,
            });
        }
    }
});

// Proxy para atletas
router.get("/atletas/mercado", async (req, res) => {
    try {
        console.log("🔄 Buscando atletas do mercado...");

        const response = await axios.get(
            `${CARTOLA_API_BASE}/atletas/mercado`,
            {
                timeout: 15000,
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                },
            },
        );

        console.log("✅ Atletas do mercado obtidos");
        res.json(response.data);
    } catch (error) {
        console.error("❌ Erro ao buscar atletas:", error.message);
        res.status(error.response?.status || 500).json({
            error: "Erro ao buscar atletas",
            details: error.message,
        });
    }
});

export default router;
