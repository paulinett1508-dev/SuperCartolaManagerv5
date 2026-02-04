import express from "express";
import mongoose from "mongoose";
import { CURRENT_SEASON } from "../config/seasons.js";
import { verificarAdmin } from "../middleware/auth.js";
import {
    salvarCacheMataMata,
    lerCacheMataMata,
    deletarCacheMataMata,
} from "../controllers/mataMataCacheController.js";

const router = express.Router();

// ============================================================================
// Rate limiter especifico para operacoes de escrita do mata-mata
// Mais restritivo que o global: 30 req/min por IP
// ============================================================================
const writeLimitCounts = new Map();
const WRITE_LIMIT_WINDOW = 60 * 1000;
const WRITE_LIMIT_MAX = 30;

function mataMataWriteLimiter(req, res, next) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
               req.headers['x-real-ip'] ||
               req.ip || 'unknown';
    const now = Date.now();

    if (!writeLimitCounts.has(ip)) {
        writeLimitCounts.set(ip, { count: 1, startTime: now });
        return next();
    }

    const data = writeLimitCounts.get(ip);
    if (now - data.startTime > WRITE_LIMIT_WINDOW) {
        writeLimitCounts.set(ip, { count: 1, startTime: now });
        return next();
    }

    data.count++;
    if (data.count > WRITE_LIMIT_MAX) {
        console.log(`[MATA-CACHE] 🚫 Rate limit de escrita excedido: ${ip}`);
        return res.status(429).json({
            error: "Muitas operações de escrita",
            retryAfter: Math.ceil((WRITE_LIMIT_WINDOW - (now - data.startTime)) / 1000),
        });
    }

    next();
}

// Middleware de validacao de params para rotas com :ligaId
function validarLigaIdParam(req, res, next) {
    const { ligaId } = req.params;
    if (!ligaId || !mongoose.Types.ObjectId.isValid(ligaId)) {
        return res.status(400).json({ error: "ligaId invalido" });
    }
    next();
}

// Middleware de validacao de params para rotas com :edicao
function validarEdicaoParam(req, res, next) {
    const edicao = Number(req.params.edicao);
    if (!Number.isInteger(edicao) || edicao < 1 || edicao > 10) {
        return res.status(400).json({ error: "edicao invalida (esperado: 1-10)" });
    }
    next();
}

// ============================================================================
// 📋 ROTA PARA LISTAR TODAS AS EDIÇÕES DISPONÍVEIS NO CACHE
// ⚠️ IMPORTANTE: Esta rota DEVE vir ANTES da rota com parâmetro :edicao
// ============================================================================
router.get("/cache/:ligaId/edicoes", validarLigaIdParam, async (req, res) => {
    try {
        const { ligaId } = req.params;
        const { temporada } = req.query;
        const temporadaFiltro = temporada ? parseInt(temporada) : CURRENT_SEASON;

        console.log(
            `[MATA-CACHE] 📋 Listando edições disponíveis para liga ${ligaId}, temporada ${temporadaFiltro}`,
        );

        const MataMataCache = (await import("../models/MataMataCache.js"))
            .default;

        // Buscar edições APENAS da temporada especificada
        const edicoes = await MataMataCache.find({
            liga_id: ligaId,
            temporada: temporadaFiltro
        })
            .select("edicao rodada_atual ultima_atualizacao")
            .sort({ edicao: 1 })
            .lean();

        if (edicoes.length === 0) {
            return res.json({
                liga_id: ligaId,
                total: 0,
                edicoes: [],
                mensagem: "Nenhuma edição encontrada no cache",
            });
        }

        // Formatar resposta
        const resumo = edicoes.map((ed) => ({
            edicao: ed.edicao,
            rodada_salva: ed.rodada_atual,
            ultima_atualizacao: ed.ultima_atualizacao,
            cache_id: ed._id,
        }));

        console.log(`[MATA-CACHE] ✅ Encontradas ${edicoes.length} edições`);

        res.json({
            liga_id: ligaId,
            total: edicoes.length,
            edicoes: resumo,
        });
    } catch (error) {
        console.error("[MATA-CACHE] ❌ Erro ao listar edições:", error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// 🔍 ROTA DE DEBUG - INSPECIONAR ESTRUTURA DO MONGODB
// ⚠️ IMPORTANTE: Esta rota DEVE vir ANTES da rota com parâmetro :edicao
// 🔒 Protegida: requer sessão admin
// ============================================================================
router.get("/debug/:ligaId", verificarAdmin, validarLigaIdParam, async (req, res) => {
    try {
        const { ligaId } = req.params;

        console.log(
            `[MATA-DEBUG] 🔍 Inspecionando estrutura para liga ${ligaId}`,
        );

        const MataMataCache = (await import("../models/MataMataCache.js"))
            .default;

        // Buscar um documento de exemplo
        const exemplo = await MataMataCache.findOne({ liga_id: ligaId }).lean();

        if (!exemplo) {
            return res.json({
                error: "Nenhum documento encontrado",
                liga_id: ligaId,
            });
        }

        // Extrair estrutura do dados_torneio
        const dadosTorneio = exemplo.dados_torneio || {};

        // Análise detalhada da estrutura
        const analise = {
            documento_id: exemplo._id,
            liga_id: exemplo.liga_id,
            edicao: exemplo.edicao,
            rodada_atual: exemplo.rodada_atual,
            ultima_atualizacao: exemplo.ultima_atualizacao,

            dados_torneio_keys: Object.keys(dadosTorneio),

            estrutura_confrontos: null,
            exemplo_confronto: null,
            estrutura_time: null,

            campos_detectados: {
                tem_confrontos: !!dadosTorneio.confrontos,
                tem_jogos: !!dadosTorneio.jogos,
                tem_fases: !!dadosTorneio.fases,
                tem_rounds: !!dadosTorneio.rounds,
                tem_matches: !!dadosTorneio.matches,
            },
        };

        // Detectar array de confrontos
        let confrontos = null;
        if (dadosTorneio.confrontos && Array.isArray(dadosTorneio.confrontos)) {
            confrontos = dadosTorneio.confrontos;
            analise.estrutura_confrontos = "dados_torneio.confrontos (array)";
        } else if (dadosTorneio.jogos && Array.isArray(dadosTorneio.jogos)) {
            confrontos = dadosTorneio.jogos;
            analise.estrutura_confrontos = "dados_torneio.jogos (array)";
        } else if (dadosTorneio.fases && Array.isArray(dadosTorneio.fases)) {
            // Tentar extrair de fases
            if (dadosTorneio.fases[0]?.confrontos) {
                confrontos = dadosTorneio.fases[0].confrontos;
                analise.estrutura_confrontos =
                    "dados_torneio.fases[0].confrontos (array)";
            } else if (dadosTorneio.fases[0]?.jogos) {
                confrontos = dadosTorneio.fases[0].jogos;
                analise.estrutura_confrontos =
                    "dados_torneio.fases[0].jogos (array)";
            }
        }

        // Analisar primeiro confronto
        if (confrontos && confrontos.length > 0) {
            const primeiroConfronto = confrontos[0];
            analise.exemplo_confronto = {
                keys: Object.keys(primeiroConfronto),
                estrutura_completa: primeiroConfronto,
            };

            // Detectar estrutura dos times
            const timeA =
                primeiroConfronto.timeA ||
                primeiroConfronto.time1 ||
                primeiroConfronto.team1;
            const timeB =
                primeiroConfronto.timeB ||
                primeiroConfronto.time2 ||
                primeiroConfronto.team2;

            if (timeA) {
                analise.estrutura_time = {
                    campo_usado: primeiroConfronto.timeA
                        ? "timeA"
                        : primeiroConfronto.time1
                          ? "time1"
                          : "team1",
                    keys_do_time: Object.keys(timeA),
                    exemplo_time_completo: timeA,

                    campos_id: {
                        tem_timeId: !!timeA.timeId,
                        tem_time_id: !!timeA.time_id,
                        tem_id: !!timeA.id,
                        valor_id: timeA.timeId || timeA.time_id || timeA.id,
                    },

                    campos_nome: {
                        tem_nomeTime: !!timeA.nomeTime,
                        tem_nome_time: !!timeA.nome_time,
                        tem_nome: !!timeA.nome,
                        tem_name: !!timeA.name,
                        valor_nome:
                            timeA.nomeTime ||
                            timeA.nome_time ||
                            timeA.nome ||
                            timeA.name,
                    },

                    campos_pontos: {
                        tem_pontos: !!timeA.pontos,
                        tem_pontos_total: !!timeA.pontos_total,
                        tem_score: !!timeA.score,
                        tem_points: !!timeA.points,
                        valor_pontos:
                            timeA.pontos ||
                            timeA.pontos_total ||
                            timeA.score ||
                            timeA.points,
                    },

                    campos_escudo: {
                        tem_escudo: !!timeA.escudo,
                        tem_url_escudo_png: !!timeA.url_escudo_png,
                        tem_foto: !!timeA.foto,
                        tem_logo: !!timeA.logo,
                        valor_escudo:
                            timeA.escudo ||
                            timeA.url_escudo_png ||
                            timeA.foto ||
                            timeA.logo,
                    },

                    campos_cartoleiro: {
                        tem_nomeCartoleiro: !!timeA.nomeCartoleiro,
                        tem_nome_cartola: !!timeA.nome_cartola,
                        tem_cartoleiro: !!timeA.cartoleiro,
                        valor_cartoleiro:
                            timeA.nomeCartoleiro ||
                            timeA.nome_cartola ||
                            timeA.cartoleiro,
                    },
                };
            }
        }

        console.log("[MATA-DEBUG] ✅ Análise completa gerada");

        res.json(analise);
    } catch (error) {
        console.error("[MATA-DEBUG] ❌ Erro:", error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// 📦 ROTAS CRUD COM PARÂMETRO :edicao
// ⚠️ IMPORTANTE: Estas rotas DEVEM vir DEPOIS das rotas específicas acima
// 🔒 POST e DELETE protegidos: requerem sessão admin
// ============================================================================
router.post("/cache/:ligaId/:edicao", verificarAdmin, mataMataWriteLimiter, validarLigaIdParam, validarEdicaoParam, salvarCacheMataMata);
router.get("/cache/:ligaId/:edicao", validarLigaIdParam, validarEdicaoParam, lerCacheMataMata);
router.delete("/cache/:ligaId/:edicao", verificarAdmin, mataMataWriteLimiter, validarLigaIdParam, validarEdicaoParam, deletarCacheMataMata);

export default router;
