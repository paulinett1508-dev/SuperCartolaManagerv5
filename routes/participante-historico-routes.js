// =====================================================================
// PARTICIPANTE HISTORICO ROUTES - Hall da Fama / Cartório Vitalício
// =====================================================================
// Rota para buscar histórico de temporadas do participante
// Dados lidos do arquivo users_registry.json (Cartório Vitalício)
// =====================================================================

import express from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

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

        // Formatar resposta
        const response = {
            success: true,
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
                }
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
