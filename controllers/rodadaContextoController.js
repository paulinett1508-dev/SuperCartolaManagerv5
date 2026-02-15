// =====================================================================
// rodadaContextoController.js v1.0 - Contexto de Liga Pós-Rodada
// Endpoint focado em DISPUTAS INTERNAS, não em escalação individual
// =====================================================================
import Rodada from "../models/Rodada.js";
import Liga from "../models/Liga.js";
import PontosCorridosCache from "../models/PontosCorridosCache.js";
import MataMataCache from "../models/MataMataCache.js";
import ArtilheiroCampeao from "../models/ArtilheiroCampeao.js";
import CapitaoCaches from "../models/CapitaoCaches.js";
import MelhorMesCache from "../models/MelhorMesCache.js";
import mongoose from "mongoose";
import { CURRENT_SEASON } from "../config/seasons.js";
import * as disputasService from "../services/disputasService.js";

const LOG_PREFIX = "[RODADA-CONTEXTO]";

/**
 * Helper: Converte ligaId para ObjectId se válido
 */
function toLigaId(ligaId) {
    if (mongoose.Types.ObjectId.isValid(ligaId)) {
        return new mongoose.Types.ObjectId(ligaId);
    }
    return ligaId;
}

/**
 * GET /api/rodada-contexto/:ligaId/:rodada/:timeId
 * Retorna contexto completo de disputas internas da liga para uma rodada
 */
export const obterContextoRodada = async (req, res) => {
    const { ligaId, rodada, timeId } = req.params;
    const { temporada } = req.query;

    try {
        const ligaIdObj = toLigaId(ligaId);
        const numRodada = Number(rodada);
        const numTimeId = Number(timeId);
        const numTemporada = temporada ? Number(temporada) : CURRENT_SEASON;

        console.log(`${LOG_PREFIX} Gerando contexto: liga=${ligaId} rodada=${numRodada} time=${numTimeId} temp=${numTemporada}`);

        // 1. Buscar dados básicos da rodada
        const meuTime = await Rodada.findOne({
            ligaId: ligaIdObj,
            rodada: numRodada,
            temporada: numTemporada,
            timeId: numTimeId,
        }).lean();

        if (!meuTime) {
            return res.status(404).json({
                error: "Time não encontrado nesta rodada",
                timeId: numTimeId,
                rodada: numRodada,
            });
        }

        // 2. Buscar módulos ativos da liga
        const liga = await Liga.findById(ligaIdObj).lean();
        const modulosAtivos = liga?.modulos_ativos || {};

        console.log(`${LOG_PREFIX} Módulos ativos:`, Object.keys(modulosAtivos).filter(k => modulosAtivos[k]));

        // 3. Construir contexto baseado em módulos ativos
        const contexto = {
            // Metadados
            rodada: numRodada,
            temporada: numTemporada,
            time: {
                timeId: meuTime.timeId,
                nome_cartola: meuTime.nome_cartola,
                nome_time: meuTime.nome_time,
                escudo: meuTime.escudo,
                clube_id: meuTime.clube_id,
            },

            // Performance básica
            performance: {
                pontos: meuTime.pontos || 0,
                posicao: meuTime.posicao || 0,
                total_participantes: meuTime.totalParticipantesAtivos || 0,
                financeiro: meuTime.valorFinanceiro || 0,
                vs_media: 0, // Será calculado
                vs_melhor: 0, // Será calculado
            },

            // Disputas (serão preenchidas)
            disputas: {},

            // Movimentações
            movimentacoes: [],

            // Narrativa (será gerada)
            narrativa: {
                resumida: "",
                completa: "",
            },
        };

        // 4. Calcular vs média e vs melhor
        const todosParticipantes = await Rodada.find({
            ligaId: ligaIdObj,
            rodada: numRodada,
            temporada: numTemporada,
        }).lean();

        const pontosArray = todosParticipantes
            .filter(p => !p.rodadaNaoJogada)
            .map(p => p.pontos || 0);

        if (pontosArray.length > 0) {
            const media = pontosArray.reduce((a, b) => a + b, 0) / pontosArray.length;
            const melhor = Math.max(...pontosArray);
            contexto.performance.vs_media = parseFloat(((meuTime.pontos || 0) - media).toFixed(2));
            contexto.performance.vs_melhor = parseFloat(((meuTime.pontos || 0) - melhor).toFixed(2));
        }

        // 5. Buscar dados de cada módulo ativo usando service
        // Nomes usam camelCase conforme Liga.modulos_ativos
        if (modulosAtivos.pontosCorridos) {
            contexto.disputas.pontos_corridos = await disputasService.calcularPontosCorridos(
                ligaIdObj,
                numRodada,
                numTimeId,
                numTemporada
            );
        }

        if (modulosAtivos.mataMata) {
            contexto.disputas.mata_mata = await disputasService.calcularMataMata(
                ligaIdObj,
                numRodada,
                numTimeId,
                numTemporada
            );
        }

        if (modulosAtivos.artilheiro) {
            contexto.disputas.artilheiro = await disputasService.calcularArtilheiro(
                ligaIdObj,
                numRodada,
                numTimeId,
                numTemporada
            );
        }

        if (modulosAtivos.luvaOuro) {
            contexto.disputas.luva_ouro = await disputasService.calcularLuvaOuro(
                ligaIdObj,
                numRodada,
                numTimeId,
                numTemporada
            );
        }

        if (modulosAtivos.capitaoLuxo) {
            contexto.disputas.capitao_luxo = await disputasService.calcularCapitaoLuxo(
                ligaIdObj,
                numRodada,
                numTimeId,
                numTemporada
            );
        }

        if (modulosAtivos.melhorMes) {
            contexto.disputas.melhor_mes = await disputasService.calcularMelhorMes(
                ligaIdObj,
                numRodada,
                numTimeId,
                numTemporada
            );
        }

        // 6. Calcular movimentações (quem subiu/caiu)
        contexto.movimentacoes = await calcularMovimentacoes(
            ligaIdObj,
            numRodada,
            numTimeId,
            numTemporada
        );

        // 7. Gerar narrativa inteligente
        const { gerarNarrativa } = await import("../services/narrativaService.js");
        const narrativas = gerarNarrativa(contexto);
        contexto.narrativa = narrativas;

        console.log(`${LOG_PREFIX} Contexto gerado com sucesso para time ${numTimeId}`);
        res.json(contexto);

    } catch (error) {
        console.error(`${LOG_PREFIX} Erro:`, error);
        res.status(500).json({
            error: "Erro ao gerar contexto da rodada",
            detalhes: error.message,
        });
    }
};

/**
 * Calcula ranking geral acumulado até uma rodada (soma de pontos)
 * Retorna array ordenado por totalPontos desc com posição atribuída
 */
async function calcularRankingAcumulado(ligaId, ateRodada, temporada) {
    return Rodada.aggregate([
        {
            $match: {
                ligaId: ligaId,
                temporada: temporada,
                rodada: { $lte: ateRodada },
            },
        },
        {
            $group: {
                _id: "$timeId",
                nome: { $last: "$nome_cartola" },
                totalPontos: { $sum: "$pontos" },
            },
        },
        { $sort: { totalPontos: -1 } },
    ]);
}

/**
 * Calcula movimentações na liga (quem subiu/caiu no RANKING GERAL)
 * IMPORTANTE: Usa ranking acumulado (soma de todas rodadas), NÃO a
 * posição individual da rodada (Rodada.posicao = rank dentro daquela rodada)
 */
async function calcularMovimentacoes(ligaId, rodada, timeId, temporada) {
    try {
        if (rodada <= 1) return []; // Sem rodada anterior para comparar

        // Calcular ranking geral acumulado até rodada atual e anterior
        const [rankingAtual, rankingAnterior] = await Promise.all([
            calcularRankingAcumulado(ligaId, rodada, temporada),
            calcularRankingAcumulado(ligaId, rodada - 1, temporada),
        ]);

        // Criar map de posições: timeId → posição (1-based)
        const posAtual = new Map();
        rankingAtual.forEach((r, i) => posAtual.set(r._id, { posicao: i + 1, nome: r.nome }));

        const posAnterior = new Map();
        rankingAnterior.forEach((r, i) => posAnterior.set(r._id, i + 1));

        const movimentacoes = [];

        for (const [tid, dados] of posAtual) {
            const posAnt = posAnterior.get(tid);
            if (posAnt === undefined) continue; // Participante novo, sem anterior

            const mudanca = posAnt - dados.posicao; // Positivo = subiu
            if (mudanca === 0) continue;

            movimentacoes.push({
                tipo: mudanca > 0 ? "subida" : "queda",
                time: dados.nome,
                timeId: tid,
                de: posAnt,
                para: dados.posicao,
            });
        }

        // Ordenar por magnitude da mudança
        movimentacoes.sort((a, b) =>
            Math.abs(b.para - b.de) - Math.abs(a.para - a.de)
        );

        return movimentacoes.slice(0, 5); // Top 5 movimentações
    } catch (error) {
        console.error(`${LOG_PREFIX} [MOV] Erro:`, error);
        return [];
    }
}

export default { obterContextoRodada };
