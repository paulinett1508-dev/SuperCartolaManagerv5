// =====================================================================
// PARTICIPANTE HISTORICO ROUTES - Hall da Fama / Cartório Vitalício
// =====================================================================
// ✅ v2.0: Busca saldo ATUAL do MongoDB (dados em tempo real)
// Dados históricos do arquivo users_registry.json (Cartório Vitalício)
// Dados financeiros ATUAIS do MongoDB (extrato_financeiro_caches)
// =====================================================================

import express from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import ExtratoFinanceiroCache from "../models/ExtratoFinanceiroCache.js";
import AcertoFinanceiro from "../models/AcertoFinanceiro.js";
import Liga from "../models/Liga.js";
import { CURRENT_SEASON, getAvailableSeasons, getFinancialSeason } from "../config/seasons.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Caminho para o arquivo do Cartório Vitalício
const USERS_REGISTRY_PATH = path.join(__dirname, "../data/users_registry.json");
const HISTORY_DIR = path.join(__dirname, "../data/history");

// =====================================================================
// GET /api/participante/historico/:timeId
// Busca histórico completo de um participante
// =====================================================================
router.get("/:timeId", async (req, res) => {
    try {
        const { timeId } = req.params;

        if (!timeId) {
            return res.status(400).json({
                success: false,
                error: "timeId é obrigatório"
            });
        }

        console.log(`[HISTORICO] 📜 Buscando histórico para timeId: ${timeId}`);

        // Ler arquivo do Cartório Vitalício
        let registryData;
        try {
            const fileContent = await fs.readFile(USERS_REGISTRY_PATH, "utf-8");
            registryData = JSON.parse(fileContent);
        } catch (readError) {
            console.error("[HISTORICO] ❌ Erro ao ler users_registry.json:", readError.message);
            return res.status(404).json({
                success: false,
                error: "Arquivo de histórico não encontrado"
            });
        }

        // Buscar participante pelo timeId
        const participante = registryData.users?.find(
            (u) => String(u.id) === String(timeId)
        );

        if (!participante) {
            console.log(`[HISTORICO] ⚠️ Participante ${timeId} não encontrado no registro`);
            return res.status(404).json({
                success: false,
                error: "Participante não encontrado no histórico"
            });
        }

        // ✅ v2.1: Buscar modulos_ativos de cada liga para evitar erros 400 no frontend
        const ligaIds = [...new Set((participante.historico || []).map(h => h.liga_id).filter(Boolean))];
        const ligasData = await Liga.find(
            { _id: { $in: ligaIds } },
            { _id: 1, modulos_ativos: 1 }
        ).lean();
        const ligasMap = new Map(ligasData.map(l => [String(l._id), l.modulos_ativos || {}]));

        // v2.4: Extrair temporadas do historico do participante
        const temporadasParticipante = [...new Set(
            (participante.historico || []).map(h => h.ano)
        )].sort((a, b) => b - a);

        // Formatar resposta
        const response = {
            success: true,
            temporada_atual: CURRENT_SEASON,
            temporadas_disponiveis: temporadasParticipante,
            participante: {
                id: participante.id,
                nome: participante.nome,
                email: participante.email,
                primeiro_registro: participante.primeiro_registro,
                temporadas_ativas: participante.active_seasons || [],
            },
            historico: (participante.historico || []).map(h => ({
                ano: h.ano,
                liga_id: h.liga_id,
                liga_nome: h.liga_nome,
                time_escudo: h.time_escudo,
                modulos_ativos: ligasMap.get(h.liga_id) || {}, // ✅ v2.1: Módulos ativos da liga
                estatisticas: {
                    posicao_final: h.estatisticas?.posicao_final,
                    pontos_totais: h.estatisticas?.pontos_totais,
                    rodadas_jogadas: h.estatisticas?.rodadas_jogadas
                },
                financeiro: {
                    saldo_final: h.financeiro?.saldo_final || 0,
                    total_bonus: h.financeiro?.total_bonus || 0,
                    total_onus: h.financeiro?.total_onus || 0
                },
                conquistas: {
                    badges: h.conquistas?.badges || []
                },
                // ✅ v2.3: Status de atividade do participante
                status: h.status || { ativo: true, rodada_desistencia: null },
                observacoes: h.observacoes || []
            })),
            situacao_financeira: {
                saldo_atual: participante.situacao_financeira?.saldo_atual || 0,
                tipo: participante.situacao_financeira?.tipo || "zerado",
                detalhamento: participante.situacao_financeira?.detalhamento || {}
            },
            stats_agregadas: {
                total_temporadas: participante.stats_agregadas?.total_temporadas || 0,
                total_titulos: participante.stats_agregadas?.total_titulos || 0,
                melhor_posicao_geral: participante.stats_agregadas?.melhor_posicao_geral,
                total_pontos_historico: participante.stats_agregadas?.total_pontos_historico || 0
            },
            status_renovacao: participante.status_renovacao || {},
            acesso_permitido: participante.acesso_permitido || {
                hall_da_fama: true,
                extrato_financeiro: true,
                temporada_atual: false
            }
        };

        console.log(`[HISTORICO] ✅ Histórico encontrado: ${response.historico.length} temporada(s)`);

        // ✅ v3.0: Buscar saldo ATUAL POR LIGA (NÃO mais agregado)
        // FIX CRÍTICO: Participantes com múltiplas ligas precisam de dados separados
        const temporadaFinanceira = getFinancialSeason();
        try {
            // Buscar todos os caches do participante
            const extratosCaches = await ExtratoFinanceiroCache.find({
                time_id: Number(timeId),
                temporada: temporadaFinanceira
            });

            // Buscar todos os acertos do participante
            const todosAcertos = await AcertoFinanceiro.find({
                timeId: String(timeId),
                temporada: temporadaFinanceira
            });

            // Criar mapas por liga_id para lookup rápido
            const cachesPorLiga = new Map();
            extratosCaches.forEach(cache => {
                const ligaId = String(cache.liga_id);
                cachesPorLiga.set(ligaId, cache);
            });

            const acertosPorLiga = new Map();
            todosAcertos.forEach(acerto => {
                const ligaId = String(acerto.ligaId);
                if (!acertosPorLiga.has(ligaId)) {
                    acertosPorLiga.set(ligaId, []);
                }
                acertosPorLiga.get(ligaId).push(acerto);
            });

            console.log(`[HISTORICO] 💰 Caches encontrados: ${extratosCaches.length} ligas, Acertos: ${todosAcertos.length} registros`);

            // ✅ v3.0: Atualizar CADA entrada do histórico com dados da SUA liga
            // IMPORTANTE: Só sobrescreve o JSON se existe cache no MongoDB
            // Se não existe cache, mantém o valor histórico do JSON (temporada consolidada)
            let saldoGeralConsolidado = 0;

            response.historico.forEach(h => {
                if (h.ano !== temporadaFinanceira) return;

                const ligaId = String(h.liga_id);
                const cache = cachesPorLiga.get(ligaId);
                const acertosLiga = acertosPorLiga.get(ligaId) || [];

                // Calcular acertos da liga (sempre incluir)
                let saldoAcertos = 0;
                acertosLiga.forEach(a => {
                    saldoAcertos += a.tipo === 'pagamento' ? a.valor : -a.valor;
                });

                // ✅ LÓGICA CORRETA:
                // - Se existe cache: usar dados do MongoDB (temporada em andamento)
                // - Se NÃO existe cache: manter dados do JSON (temporada consolidada)
                if (cache) {
                    const resumo = cache.resumo || {};
                    const saldoCache = resumo.saldo_final ?? resumo.saldo ?? cache.saldo_consolidado ?? 0;
                    const ganhosLiga = resumo.totalGanhos ?? cache.ganhos_consolidados ?? 0;
                    const perdasLiga = resumo.totalPerdas ?? cache.perdas_consolidadas ?? 0;

                    // Atualizar com dados do MongoDB
                    h.financeiro = {
                        saldo_final: saldoCache,  // Saldo da temporada (SEM acertos)
                        total_bonus: ganhosLiga,
                        total_onus: perdasLiga,
                        saldo_cache: saldoCache,
                        saldo_acertos: saldoAcertos,
                        fonte: 'mongodb'
                    };

                    saldoGeralConsolidado += saldoCache + saldoAcertos;
                    console.log(`[HISTORICO] 💰 Liga ${h.liga_nome}: cache=${saldoCache}, acertos=${saldoAcertos} [MongoDB]`);
                } else {
                    // Manter dados do JSON (histórico consolidado)
                    const saldoJSON = h.financeiro?.saldo_final ?? 0;
                    h.financeiro = {
                        ...h.financeiro,
                        saldo_cache: 0,
                        saldo_acertos: saldoAcertos,
                        fonte: 'json'
                    };

                    saldoGeralConsolidado += saldoJSON + saldoAcertos;
                    console.log(`[HISTORICO] 💰 Liga ${h.liga_nome}: json=${saldoJSON}, acertos=${saldoAcertos} [JSON]`);
                }
            });

            // Atualizar situacao_financeira com saldo CONSOLIDADO (soma de todas ligas)
            response.situacao_financeira.saldo_atual = saldoGeralConsolidado;
            response.situacao_financeira.tipo = saldoGeralConsolidado > 0 ? "credor" : saldoGeralConsolidado < 0 ? "devedor" : "zerado";

            console.log(`[HISTORICO] 💰 Saldo GERAL consolidado: ${saldoGeralConsolidado}`);

        } catch (mongoError) {
            console.warn(`[HISTORICO] ⚠️ Erro ao buscar MongoDB:`, mongoError.message);
            // Continua com dados do JSON em caso de erro
        }

        res.json(response);

    } catch (error) {
        console.error("[HISTORICO] ❌ Erro interno:", error);
        res.status(500).json({
            success: false,
            error: "Erro interno ao buscar histórico"
        });
    }
});

// =====================================================================
// GET /api/participante/historico/:timeId/temporada/:ano
// Busca dados detalhados de uma temporada específica
// =====================================================================
router.get("/:timeId/temporada/:ano", async (req, res) => {
    try {
        const { timeId, ano } = req.params;

        console.log(`[HISTORICO] 📅 Buscando temporada ${ano} para timeId: ${timeId}`);

        // Tentar ler arquivo de histórico específico da temporada
        const historyFilePath = path.join(HISTORY_DIR, ano, "final_standings.json");

        let standingsData;
        try {
            const fileContent = await fs.readFile(historyFilePath, "utf-8");
            standingsData = JSON.parse(fileContent);
        } catch (readError) {
            // Fallback: buscar do users_registry.json
            console.log(`[HISTORICO] ⚠️ final_standings.json não encontrado para ${ano}, usando registry`);

            const registryContent = await fs.readFile(USERS_REGISTRY_PATH, "utf-8");
            const registryData = JSON.parse(registryContent);

            const participante = registryData.users?.find(
                (u) => String(u.id) === String(timeId)
            );

            if (!participante) {
                return res.status(404).json({
                    success: false,
                    error: "Participante não encontrado"
                });
            }

            const temporadaHistorico = participante.historico?.find(
                (h) => h.ano === parseInt(ano)
            );

            if (!temporadaHistorico) {
                return res.status(404).json({
                    success: false,
                    error: `Temporada ${ano} não encontrada para este participante`
                });
            }

            return res.json({
                success: true,
                temporada: parseInt(ano),
                dados: temporadaHistorico,
                fonte: "registry"
            });
        }

        // Se encontrou o final_standings.json, buscar dados do participante lá
        let dadosParticipante = null;

        // Procurar em todas as ligas do standings
        for (const [ligaNome, ligaDados] of Object.entries(standingsData.ligas || {})) {
            const encontrado = ligaDados.rankingGeral?.find(
                (p) => String(p.timeId) === String(timeId)
            );
            if (encontrado) {
                dadosParticipante = {
                    ...encontrado,
                    liga_nome: ligaNome,
                    liga_id: ligaDados.ligaId
                };
                break;
            }
        }

        if (!dadosParticipante) {
            return res.status(404).json({
                success: false,
                error: `Participante não encontrado na temporada ${ano}`
            });
        }

        console.log(`[HISTORICO] ✅ Dados da temporada ${ano} encontrados`);

        res.json({
            success: true,
            temporada: parseInt(ano),
            dados: dadosParticipante,
            fonte: "final_standings"
        });

    } catch (error) {
        console.error("[HISTORICO] ❌ Erro ao buscar temporada:", error);
        res.status(500).json({
            success: false,
            error: "Erro interno ao buscar temporada"
        });
    }
});

// =====================================================================
// GET /api/participante/historico/badges/lista
// Lista todos os badges possíveis e suas descrições
// =====================================================================
router.get("/badges/lista", async (req, res) => {
    const badges = {
        campeao: {
            id: "campeao",
            nome: "Campeão",
            descricao: "Conquistou o título de campeão da liga",
            icone: "🏆",
            cor: "#ffd700"
        },
        vice: {
            id: "vice",
            nome: "Vice-Campeão",
            descricao: "Alcançou a segunda posição na liga",
            icone: "🥈",
            cor: "#c0c0c0"
        },
        terceiro: {
            id: "terceiro",
            nome: "Terceiro Lugar",
            descricao: "Alcançou a terceira posição na liga",
            icone: "🥉",
            cor: "#cd7f32"
        },
        top10_mito: {
            id: "top10_mito",
            nome: "Top 10 Mito",
            descricao: "Terminou entre os 10 primeiros no ranking de mitos",
            icone: "⭐",
            cor: "#10b981"
        },
        top10_mico: {
            id: "top10_mico",
            nome: "Top 10 Mico",
            descricao: "Terminou entre os 10 últimos no ranking de micos",
            icone: "💀",
            cor: "#ef4444"
        },
        artilheiro: {
            id: "artilheiro",
            nome: "Artilheiro",
            descricao: "Conquistou o prêmio de artilheiro da temporada",
            icone: "⚽",
            cor: "#3b82f6"
        },
        luva_ouro: {
            id: "luva_ouro",
            nome: "Luva de Ouro",
            descricao: "Conquistou o prêmio de melhor goleiro",
            icone: "🧤",
            cor: "#f59e0b"
        },
        melhor_mes: {
            id: "melhor_mes",
            nome: "Melhor do Mês",
            descricao: "Foi o melhor de um mês na temporada",
            icone: "📅",
            cor: "#8b5cf6"
        },
        mata_mata_campeao: {
            id: "mata_mata_campeao",
            nome: "Campeão Mata-Mata",
            descricao: "Venceu a fase eliminatória mata-mata",
            icone: "⚔️",
            cor: "#ec4899"
        },
        invicto: {
            id: "invicto",
            nome: "Invicto",
            descricao: "Não perdeu nenhuma rodada na temporada",
            icone: "🛡️",
            cor: "#14b8a6"
        }
    };

    res.json({
        success: true,
        badges: Object.values(badges)
    });
});

export default router;
