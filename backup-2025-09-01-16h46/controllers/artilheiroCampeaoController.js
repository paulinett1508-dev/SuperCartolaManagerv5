// controllers/artilheiroCampeaoController.js - VERSÃO OTIMIZADA COM SISTEMA INTELIGENTE
import golsService from "../services/golsService.js";
import Gols from "../models/Gols.js";
import mongoose from "mongoose";

class ArtilheiroCampeaoController {
    /**
     * ENDPOINT PRINCIPAL: Dados agregados com coleta inteligente
     * GET /api/artilheiro-campeao/:ligaId/gols/:timeId/agregado?inicio=X&fim=Y
     */
    async getGolsAgregados(req, res) {
        const { ligaId, timeId } = req.params;
        const { inicio = 1, fim = 14 } = req.query;

        try {
            console.log(
                `🏆 [CONTROLLER] Dados agregados: Liga ${ligaId}, Time ${timeId}, Rodadas ${inicio}-${fim}`,
            );

            const resultado = await golsService.obterGolsParticipante(
                ligaId,
                parseInt(timeId),
                parseInt(inicio),
                parseInt(fim),
            );

            res.json(resultado);
        } catch (error) {
            console.error(`❌ [CONTROLLER] Erro nos dados agregados:`, error);
            res.status(500).json({
                success: false,
                message: "Erro ao buscar dados agregados",
                error: error.message,
            });
        }
    }

    /**
     * ENDPOINT: Dados de rodada específica
     * GET /api/artilheiro-campeao/:ligaId/gols/:timeId/:rodada
     */
    async getGolsRodada(req, res) {
        const { ligaId, timeId, rodada } = req.params;

        try {
            console.log(
                `⚽ [CONTROLLER] Rodada específica: Liga ${ligaId}, Time ${timeId}, Rodada ${rodada}`,
            );

            const resultado = await golsService.obterGolsParticipante(
                ligaId,
                parseInt(timeId),
                parseInt(rodada),
                parseInt(rodada),
            );

            // Extrair dados da rodada específica
            const dadosRodada = resultado.data.detalhePorRodada[0] || {
                rodada: parseInt(rodada),
                golsPro: 0,
                golsContra: 0,
                saldo: 0,
                pontos: 0,
                jogadores: [],
            };

            res.json({
                success: true,
                data: {
                    timeId: parseInt(timeId),
                    rodada: parseInt(rodada),
                    golsPro: dadosRodada.golsPro,
                    golsContra: dadosRodada.golsContra,
                    saldo: dadosRodada.saldo,
                    pontos: dadosRodada.pontos,
                    jogadores: dadosRodada.jogadores,
                },
            });
        } catch (error) {
            console.error(`❌ [CONTROLLER] Erro na rodada específica:`, error);
            res.status(500).json({
                success: false,
                message: "Erro ao buscar dados da rodada",
                error: error.message,
            });
        }
    }

    /**
     * ENDPOINT: Detectar rodada atual
     * GET /api/artilheiro-campeao/:ligaId/detectar-rodada
     */
    async detectarRodada(req, res) {
        try {
            console.log(`🔍 [CONTROLLER] Detectando rodada atual`);

            const rodadaAtual = await golsService.detectarRodadaAtual();

            res.json({
                success: true,
                rodadaAtual,
                fonte: "api_cartolafc",
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error(`❌ [CONTROLLER] Erro ao detectar rodada:`, error);
            res.status(500).json({
                success: false,
                message: "Erro ao detectar rodada atual",
                error: error.message,
            });
        }
    }

    /**
     * ENDPOINT: Buscar ranking de uma rodada específica
     * GET /api/artilheiro-campeao/:ligaId/ranking/rodada/:rodada
     */
    async obterRankingRodada(req, res) {
        try {
            const { ligaId, rodada } = req.params;

            console.log(`📊 [CONTROLLER] Buscando ranking da rodada ${rodada} para liga ${ligaId}`);

            // Validar parâmetros
            if (!ligaId || !rodada) {
                return res.status(400).json({
                    success: false,
                    message: "Liga ID e rodada são obrigatórios",
                });
            }

            const rodadaNum = parseInt(rodada);
            if (isNaN(rodadaNum) || rodadaNum < 1) {
                return res.status(400).json({
                    success: false,
                    message: "Rodada deve ser um número válido maior que 0",
                });
            }

            // Buscar dados da rodada
            const resultado = await golsService.obterRankingPorRodada(
                ligaId,
                rodadaNum
            );

            if (!resultado.success) {
                return res.status(404).json({
                    success: false,
                    message: `Dados não encontrados para a rodada ${rodada}`,
                });
            }

            res.json({
                success: true,
                data: resultado.data,
            });

        } catch (error) {
            console.error(`❌ [CONTROLLER] Erro no ranking da rodada:`, error);
            res.status(500).json({
                success: false,
                message: "Erro ao buscar ranking da rodada",
                error: error.message,
            });
        }
    }

    /**
     * ENDPOINT: Ranking completo da liga
     * GET /api/artilheiro-campeao/:ligaId/ranking?inicio=X&fim=Y
     */
    async getRankingLiga(req, res) {
        const { ligaId } = req.params;
        const { inicio = 1, fim = 14 } = req.query;

        try {
            console.log(
                `🏆 [CONTROLLER] Ranking da liga: ${ligaId}, Rodadas ${inicio}-${fim}`,
            );

            // Lista hardcoded dos participantes da Liga Sobral
            const participantes = [
                { timeId: 1926323, nome: "Daniel Barbosa" },
                { timeId: 13935277, nome: "Paulinett Miranda" },
                { timeId: 14747183, nome: "Carlos Henrique" },
                { timeId: 49149009, nome: "Matheus Coutinho" },
                { timeId: 49149388, nome: "Junior Brasilino" },
                { timeId: 50180257, nome: "Hivisson" },
            ];

            const ranking = [];

            // Processar cada participante
            for (const participante of participantes) {
                try {
                    const resultado = await golsService.obterGolsParticipante(
                        ligaId,
                        participante.timeId,
                        parseInt(inicio),
                        parseInt(fim),
                    );

                    ranking.push({
                        timeId: participante.timeId,
                        nome: participante.nome,
                        golsPro: resultado.data.totalGolsPro,
                        golsContra: resultado.data.totalGolsContra,
                        saldo: resultado.data.saldoTotal,
                        detalhes: resultado.data.detalhePorRodada,
                        jogadores: resultado.data.jogadoresAgregados,
                    });

                    console.log(
                        `✅ ${participante.nome}: ${resultado.data.totalGolsPro} gols`,
                    );
                } catch (error) {
                    console.error(
                        `❌ Erro ao processar ${participante.nome}:`,
                        error.message,
                    );

                    // Adicionar com dados vazios
                    ranking.push({
                        timeId: participante.timeId,
                        nome: participante.nome,
                        golsPro: 0,
                        golsContra: 0,
                        saldo: 0,
                        detalhes: [],
                        jogadores: [],
                        erro: error.message,
                    });
                }

                // Delay para não sobrecarregar
                await new Promise((resolve) => setTimeout(resolve, 100));
            }

            // Ordenar por saldo de gols
            ranking.sort((a, b) => b.saldo - a.saldo);

            const totalGols = ranking.reduce((acc, p) => acc + p.golsPro, 0);

            res.json({
                success: true,
                data: {
                    ligaId,
                    rodadaInicio: parseInt(inicio),
                    rodadaFim: parseInt(fim),
                    ranking,
                    estatisticas: {
                        totalParticipantes: ranking.length,
                        totalGols,
                        mediaGolsPorTime: totalGols / ranking.length,
                        processadoEm: new Date().toISOString(),
                    },
                },
            });
        } catch (error) {
            console.error(`❌ [CONTROLLER] Erro no ranking da liga:`, error);
            res.status(500).json({
                success: false,
                message: "Erro ao buscar ranking da liga",
                error: error.message,
            });
        }
    }

    /**
     * ENDPOINT: Estatísticas da collection gols
     * GET /api/artilheiro-campeao/:ligaId/estatisticas
     */
    async getEstatisticas(req, res) {
        const { ligaId } = req.params;

        try {
            console.log(
                `📊 [CONTROLLER] Buscando estatísticas da liga ${ligaId}...`,
            );

            const objectId = new mongoose.Types.ObjectId(ligaId);

            const stats = await Gols.aggregate([
                { $match: { ligaId: objectId, ativo: true } },
                {
                    $group: {
                        _id: null,
                        totalRegistros: { $sum: 1 },
                        totalGols: { $sum: "$gols" },
                        totalGolsContra: { $sum: "$golsContra" },
                        rodadas: { $addToSet: "$rodada" },
                        times: { $addToSet: "$timeId" },
                        ultimaColeta: { $max: "$dataColeta" },
                    },
                },
            ]);

            const estatisticas = stats[0] || {
                totalRegistros: 0,
                totalGols: 0,
                totalGolsContra: 0,
                rodadas: [],
                times: [],
                ultimaColeta: null,
            };

            // Adicionar informações do cache
            const cacheStats = golsService.obterEstatisticasCache();

            res.json({
                success: true,
                data: {
                    ligaId,
                    mongodb: {
                        ...estatisticas,
                        rodadasDisponiveis: estatisticas.rodadas.sort(
                            (a, b) => a - b,
                        ),
                        totalTimes: estatisticas.times.length,
                        timesAtivos: estatisticas.times,
                    },
                    cache: cacheStats,
                    sistema: {
                        versao: "v2.0_inteligente",
                        coleta: "sob_demanda",
                        fonte: "mongodb_primeiro_api_quando_necessario",
                    },
                },
            });
        } catch (error) {
            console.error(`❌ [CONTROLLER] Erro nas estatísticas:`, error);
            res.status(500).json({
                success: false,
                message: "Erro ao buscar estatísticas",
                error: error.message,
            });
        }
    }

    /**
     * ENDPOINT: Forçar coleta de uma rodada específica
     * POST /api/artilheiro-campeao/:ligaId/coletar/:timeId/:rodada
     */
    async forcarColeta(req, res) {
        const { ligaId, timeId, rodada } = req.params;

        try {
            console.log(
                `🚀 [CONTROLLER] Forçando coleta: Liga ${ligaId}, Time ${timeId}, Rodada ${rodada}`,
            );

            // Remover dados existentes da rodada
            await Gols.deleteMany({
                ligaId: new mongoose.Types.ObjectId(ligaId),
                timeId: parseInt(timeId),
                rodada: parseInt(rodada),
            });

            // Forçar nova coleta
            const resultado = await golsService.obterGolsParticipante(
                ligaId,
                parseInt(timeId),
                parseInt(rodada),
                parseInt(rodada),
            );

            res.json({
                success: true,
                message: `Coleta forçada concluída para rodada ${rodada}`,
                data: resultado.data,
            });
        } catch (error) {
            console.error(`❌ [CONTROLLER] Erro na coleta forçada:`, error);
            res.status(500).json({
                success: false,
                message: "Erro na coleta forçada",
                error: error.message,
            });
        }
    }

    /**
     * ENDPOINT: Limpar cache
     * DELETE /api/artilheiro-campeao/limpar-cache
     */
    async limparCache(req, res) {
        try {
            golsService.limparCache();

            res.json({
                success: true,
                message: "Cache limpo com sucesso",
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error(`❌ [CONTROLLER] Erro ao limpar cache:`, error);
            res.status(500).json({
                success: false,
                message: "Erro ao limpar cache",
                error: error.message,
            });
        }
    }
}

// Criar instância do controller
const controller = new ArtilheiroCampeaoController();

// Exportar funções
export const getGolsAgregados = controller.getGolsAgregados.bind(controller);
export const getGolsRodada = controller.getGolsRodada.bind(controller);
export const detectarRodada = controller.detectarRodada.bind(controller);
export const obterRankingRodada = controller.obterRankingRodada.bind(controller);
export const getRankingLiga = controller.getRankingLiga.bind(controller);
export const getEstatisticas = controller.getEstatisticas.bind(controller);
export const forcarColeta = controller.forcarColeta.bind(controller);
export const limparCache = controller.limparCache.bind(controller);

export default controller;