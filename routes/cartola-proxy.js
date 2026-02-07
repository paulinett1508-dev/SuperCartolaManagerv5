import express from "express";
import axios from "axios";
import { isSeasonFinished, SEASON_CONFIG, logBlockedOperation } from "../utils/seasonGuard.js";
import cartolaApiService from "../services/cartolaApiService.js";

const router = express.Router();
const CARTOLA_API_BASE = "https://api.cartola.globo.com";

// =====================================================================
// HELPER: Calcular rodada atual dinamicamente
// =====================================================================
function calcularRodadaAtual() {
    // Usar data de início da temporada do config
    const inicioTemporada = SEASON_CONFIG.dataInicio || new Date("2026-01-28T00:00:00-03:00");
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

// =============================================================================
// 🔍 BUSCA DE TIME POR NOME
// Usado para cadastrar novos participantes na renovação de temporada
// Estratégia: Busca no banco local (times já cadastrados em temporadas anteriores)
// =============================================================================
router.get("/buscar-time", async (req, res) => {
    try {
        const { q, limit = 20 } = req.query;

        if (!q || q.trim().length < 2) {
            return res.status(400).json({
                success: false,
                error: "Informe pelo menos 2 caracteres para buscar"
            });
        }

        console.log(`🔍 [CARTOLA-PROXY] Buscando times no banco local: "${q}"`);

        // Buscar no banco de dados local (collection times = participantes do Cartola FC)
        const { getDB } = await import("../config/database.js");
        const db = getDB();

        // Criar regex case-insensitive para busca flexível
        const regex = new RegExp(q.trim(), 'i');

        // Buscar por nome_time, nome_cartoleiro ou apelido
        const timesLocal = await db.collection('times').find({
            $or: [
                { nome_time: regex },
                { nome_cartoleiro: regex },
                { nome: regex }
            ]
        }).limit(parseInt(limit)).toArray();

        // Normalizar resultados
        const times = timesLocal.map(t => ({
            time_id: t.id || t.time_id,
            nome_time: t.nome_time || t.nome || '',
            nome_cartoleiro: t.nome_cartoleiro || '',
            escudo: t.escudo || t.url_escudo_png || '',
            assinante: t.assinante || false,
            slug: t.slug || '',
            // Dados extras do banco local
            temporada: t.temporada,
            ativo: t.ativo,
            fonte: 'banco_local'
        }));

        console.log(`✅ [CARTOLA-PROXY] ${times.length} times encontrados no banco local para "${q}"`);

        res.json({
            success: true,
            query: q,
            total: times.length,
            times,
            fonte: 'banco_local',
            aviso: times.length === 0
                ? 'Nenhum time encontrado. Se for um novo participante, informe o ID do Cartola manualmente.'
                : null
        });

    } catch (error) {
        console.error(`❌ [CARTOLA-PROXY] Erro na busca por "${req.query.q}":`, error.message);
        res.status(500).json({
            success: false,
            error: "Erro ao buscar times",
            details: error.message
        });
    }
});

// =============================================================================
// 🌐 BUSCA DE TIME NA API DA GLOBO
// Busca times diretamente na API publica do Cartola (Globo)
// Usado para encontrar novos participantes que ainda nao estao no banco local
// =============================================================================
router.get("/buscar-time-globo", async (req, res) => {
    try {
        const { q, limit = 10 } = req.query;

        if (!q || q.trim().length < 3) {
            return res.status(400).json({
                success: false,
                error: "Informe pelo menos 3 caracteres para buscar"
            });
        }

        console.log(`🌐 [CARTOLA-PROXY] Buscando times na API Globo: "${q}"`);

        // Usar o servico que busca diretamente na API da Globo
        const times = await cartolaApiService.buscarTimePorNome(q.trim(), parseInt(limit));

        console.log(`✅ [CARTOLA-PROXY] ${times.length} times encontrados na API Globo para "${q}"`);

        res.json({
            success: true,
            query: q,
            total: times.length,
            times,
            fonte: 'api_globo'
        });

    } catch (error) {
        console.error(`❌ [CARTOLA-PROXY] Erro na busca Globo por "${req.query.q}":`, error.message);
        res.status(500).json({
            success: false,
            error: "Erro ao buscar times na API da Globo",
            details: error.message
        });
    }
});

// =============================================================================
// 🏠 BUSCA DE TIME POR ID
// Retorna dados completos de um time específico
// =============================================================================
router.get("/buscar-time/:timeId", async (req, res) => {
    try {
        const { timeId } = req.params;

        if (!timeId || isNaN(parseInt(timeId))) {
            return res.status(400).json({
                success: false,
                error: "ID do time inválido"
            });
        }

        console.log(`🔍 [CARTOLA-PROXY] Buscando time ID: ${timeId}`);

        const time = await cartolaApiService.buscarTimePorId(parseInt(timeId));

        if (!time) {
            return res.status(404).json({
                success: false,
                error: "Time não encontrado"
            });
        }

        console.log(`✅ [CARTOLA-PROXY] Time encontrado: ${time.nome_time}`);

        res.json({
            success: true,
            time
        });

    } catch (error) {
        console.error(`❌ [CARTOLA-PROXY] Erro ao buscar time ${req.params.timeId}:`, error.message);
        res.status(500).json({
            success: false,
            error: "Erro ao buscar time",
            details: error.message
        });
    }
});

// =============================================================================
// 🔬 BUSCA COMPLETA DE TIME POR ID (DADOS BRUTOS DA API)
// Retorna todos os dados da API Cartola sem normalização
// =============================================================================
router.get("/time/:timeId/completo", async (req, res) => {
    try {
        const { timeId } = req.params;

        if (!timeId || isNaN(parseInt(timeId))) {
            return res.status(400).json({
                success: false,
                error: "ID do time inválido"
            });
        }

        console.log(`🔬 [CARTOLA-PROXY] Buscando dados COMPLETOS do time ID: ${timeId}`);

        // Buscar dados brutos da API Cartola
        const dadosCompletos = await cartolaApiService.buscarTimePorIdCompleto(parseInt(timeId));

        if (!dadosCompletos) {
            return res.status(404).json({
                success: false,
                error: "Time não encontrado na API Cartola"
            });
        }

        console.log(`✅ [CARTOLA-PROXY] Dados completos obtidos para time ${timeId}`);

        res.json({
            success: true,
            time: dadosCompletos,
            fonte: 'api_cartola_raw',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error(`❌ [CARTOLA-PROXY] Erro ao buscar dados completos do time ${req.params.timeId}:`, error.message);
        res.status(500).json({
            success: false,
            error: "Erro ao buscar dados completos",
            details: error.message
        });
    }
});

// =============================================================================
// 💰 INFO DO TIME (Patrimônio / Cartoletas)
// Retorna dados básicos do time incluindo patrimônio para o card da Home
// =============================================================================
router.get("/time-info/:timeId", async (req, res) => {
    try {
        const { timeId } = req.params;

        if (!timeId || isNaN(parseInt(timeId))) {
            return res.status(400).json({ error: "ID do time inválido" });
        }

        console.log(`🔄 [CARTOLA-PROXY] Buscando info do time ${timeId}...`);

        const response = await axios.get(
            `${CARTOLA_API_BASE}/time/id/${timeId}`,
            {
                timeout: 10000,
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                },
            },
        );

        const data = response.data;

        console.log(`✅ [CARTOLA-PROXY] Info do time ${timeId} obtida (patrimônio: ${data.patrimonio})`);

        res.json({
            time_id: data.time_id || data.time?.time_id,
            nome_time: data.nome || data.time?.nome,
            nome_cartoleiro: data.nome_cartola || data.time?.nome_cartola,
            patrimonio: data.patrimonio ?? data.time?.patrimonio ?? 0,
            pontos_campeonato: data.pontos_campeonato ?? 0,
            rodada_atual: data.rodada_atual ?? 0,
        });
    } catch (error) {
        console.error(
            `❌ [CARTOLA-PROXY] Erro ao buscar info do time ${req.params.timeId}:`,
            error.message,
        );

        if (error.response?.status === 404) {
            return res.status(404).json({ error: "Time não encontrado" });
        }

        res.status(error.response?.status || 500).json({
            error: "Erro ao buscar info do time",
            details: error.message,
        });
    }
});

export default router;
