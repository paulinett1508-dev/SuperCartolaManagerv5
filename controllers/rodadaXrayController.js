// =====================================================================
// rodadaXrayController.js v1.0 - Raio-X da Rodada
// Endpoint que retorna análise detalhada de uma rodada para um time
// =====================================================================

import Rodada from "../models/Rodada.js";
import Liga from "../models/Liga.js";
import mongoose from "mongoose";
import { CURRENT_SEASON } from "../config/seasons.js";

const LOG_PREFIX = "[RODADA-XRAY]";

// Mapa de posições Cartola
const POSICOES = {
    1: { nome: "Goleiro", sigla: "GOL", cor: "#eab308" },
    2: { nome: "Lateral", sigla: "LAT", cor: "#3b82f6" },
    3: { nome: "Zagueiro", sigla: "ZAG", cor: "#22c55e" },
    4: { nome: "Meia", sigla: "MEI", cor: "#a855f7" },
    5: { nome: "Atacante", sigla: "ATA", cor: "#ef4444" },
    6: { nome: "Técnico", sigla: "TEC", cor: "#6b7280" },
};

function toLigaId(ligaId) {
    if (mongoose.Types.ObjectId.isValid(ligaId)) {
        return new mongoose.Types.ObjectId(ligaId);
    }
    return ligaId;
}

/**
 * GET /api/rodada-xray/:ligaId/:rodada/:timeId
 * Retorna raio-x completo de uma rodada para um time específico
 */
export const obterRaioXRodada = async (req, res) => {
    const { ligaId, rodada, timeId } = req.params;
    const { temporada } = req.query;

    try {
        const ligaIdObj = toLigaId(ligaId);
        const numRodada = Number(rodada);
        const numTimeId = Number(timeId);
        const numTemporada = temporada ? Number(temporada) : CURRENT_SEASON;

        console.log(`${LOG_PREFIX} Gerando raio-x: liga=${ligaId} rodada=${numRodada} time=${numTimeId} temp=${numTemporada}`);

        // 1. Buscar TODOS os participantes da rodada (para comparação)
        const todosParticipantes = await Rodada.find({
            ligaId: ligaIdObj,
            rodada: numRodada,
            temporada: numTemporada,
        }).lean();

        if (!todosParticipantes || todosParticipantes.length === 0) {
            return res.status(404).json({
                error: "Rodada não encontrada",
                rodada: numRodada,
                temporada: numTemporada,
            });
        }

        // 2. Encontrar dados do time solicitado
        const meuTime = todosParticipantes.find(p => p.timeId === numTimeId);

        if (!meuTime) {
            return res.status(404).json({
                error: "Time não encontrado nesta rodada",
                timeId: numTimeId,
                rodada: numRodada,
            });
        }

        // 3. Calcular estatísticas da liga na rodada
        const participantesAtivos = todosParticipantes.filter(p => !p.rodadaNaoJogada);
        const pontosArray = participantesAtivos.map(p => p.pontos || 0);
        const somaTotal = pontosArray.reduce((a, b) => a + b, 0);
        const mediaPontos = participantesAtivos.length > 0 ? somaTotal / participantesAtivos.length : 0;
        const melhorPontuacao = Math.max(...pontosArray, 0);
        const piorPontuacao = Math.min(...pontosArray, 0);

        // Encontrar o melhor da rodada
        const melhorDaRodada = participantesAtivos.reduce((best, p) =>
            (p.pontos || 0) > (best.pontos || 0) ? p : best, participantesAtivos[0] || {});

        // 4. Análise dos atletas do time
        const atletas = meuTime.atletas || [];
        const capitaoId = meuTime.capitao_id;

        // Separar titulares e reservas
        const titulares = atletas.filter(a => a.status_id !== 2);
        const reservas = atletas.filter(a => a.status_id === 2);

        // Enriquecer atletas com info de capitão
        const atletasEnriquecidos = atletas.map(a => {
            const isCapitao = a.atleta_id === capitaoId;
            const pontosBase = a.pontos_num || 0;
            // Capitão pontua em dobro no Cartola
            const pontosEfetivos = isCapitao ? pontosBase * 2 : pontosBase;
            const posInfo = POSICOES[a.posicao_id] || { nome: "Desconhecido", sigla: "???", cor: "#6b7280" };

            return {
                atleta_id: a.atleta_id,
                apelido: a.apelido || "N/D",
                posicao_id: a.posicao_id,
                posicao_nome: posInfo.nome,
                posicao_sigla: posInfo.sigla,
                posicao_cor: posInfo.cor,
                clube_id: a.clube_id,
                pontos_base: pontosBase,
                pontos_efetivos: pontosEfetivos,
                is_capitao: isCapitao,
                is_reserva: a.status_id === 2,
            };
        });

        // Ordenar por pontos efetivos (decrescente)
        atletasEnriquecidos.sort((a, b) => b.pontos_efetivos - a.pontos_efetivos);

        // 5. Análise por posição
        const analisePosPosicao = {};
        for (const [posId, posInfo] of Object.entries(POSICOES)) {
            const atletasDaPosicao = atletasEnriquecidos.filter(
                a => a.posicao_id === Number(posId) && !a.is_reserva
            );
            const totalPontos = atletasDaPosicao.reduce((s, a) => s + a.pontos_efetivos, 0);
            analisePosPosicao[posId] = {
                ...posInfo,
                quantidade: atletasDaPosicao.length,
                pontos_total: parseFloat(totalPontos.toFixed(2)),
                atletas: atletasDaPosicao.map(a => a.apelido),
            };
        }

        // 6. Análise do capitão
        const atletaCapitao = atletasEnriquecidos.find(a => a.is_capitao);
        const bonusCapitao = atletaCapitao ? atletaCapitao.pontos_base : 0;
        // O bônus do capitão é a diferença (pontos dobrados - pontos simples = pontos base)

        // 7. Top e Flop atletas (titulares apenas)
        const atletasTitulares = atletasEnriquecidos.filter(a => !a.is_reserva);
        const topAtletas = atletasTitulares.slice(0, 3); // Top 3
        const flopAtletas = [...atletasTitulares].sort((a, b) => a.pontos_efetivos - b.pontos_efetivos).slice(0, 3); // Bottom 3

        // 8. Distribuição de pontos na liga (para histograma)
        const faixas = calcularFaixasHistograma(pontosArray, meuTime.pontos || 0);

        // 9. Montar resposta
        const raioX = {
            // Dados gerais
            rodada: numRodada,
            temporada: numTemporada,
            time: {
                timeId: meuTime.timeId,
                nome_cartola: meuTime.nome_cartola,
                nome_time: meuTime.nome_time,
                escudo: meuTime.escudo,
                clube_id: meuTime.clube_id,
                pontos: meuTime.pontos || 0,
                posicao: meuTime.posicao,
                valorFinanceiro: meuTime.valorFinanceiro || 0,
                totalParticipantes: meuTime.totalParticipantesAtivos || participantesAtivos.length,
                rodadaNaoJogada: meuTime.rodadaNaoJogada || false,
            },

            // Estatísticas da liga na rodada
            liga: {
                media: parseFloat(mediaPontos.toFixed(2)),
                melhor: parseFloat(melhorPontuacao.toFixed(2)),
                pior: parseFloat(piorPontuacao.toFixed(2)),
                total_participantes: participantesAtivos.length,
                melhor_da_rodada: {
                    nome_cartola: melhorDaRodada.nome_cartola || "N/D",
                    pontos: melhorDaRodada.pontos || 0,
                    timeId: melhorDaRodada.timeId,
                },
                diferenca_media: parseFloat(((meuTime.pontos || 0) - mediaPontos).toFixed(2)),
                diferenca_melhor: parseFloat(((meuTime.pontos || 0) - melhorPontuacao).toFixed(2)),
            },

            // Atletas detalhados
            atletas: atletasEnriquecidos,
            titulares_count: titulares.length,
            reservas_count: reservas.length,

            // Análise por posição
            analise_posicao: analisePosPosicao,

            // Capitão
            capitao: atletaCapitao ? {
                apelido: atletaCapitao.apelido,
                pontos_base: atletaCapitao.pontos_base,
                bonus: parseFloat(bonusCapitao.toFixed(2)),
                posicao: atletaCapitao.posicao_nome,
                impacto_percentual: (meuTime.pontos || 0) > 0
                    ? parseFloat(((bonusCapitao / (meuTime.pontos || 1)) * 100).toFixed(1))
                    : 0,
            } : null,

            // Top e Flop
            top_atletas: topAtletas,
            flop_atletas: flopAtletas,

            // Histograma de distribuição
            distribuicao: faixas,
        };

        console.log(`${LOG_PREFIX} Raio-x gerado com sucesso para time ${numTimeId} rodada ${numRodada}`);
        res.json(raioX);

    } catch (error) {
        console.error(`${LOG_PREFIX} Erro:`, error);
        res.status(500).json({
            error: "Erro ao gerar raio-x da rodada",
            detalhes: error.message,
        });
    }
};

/**
 * Calcula faixas para histograma de distribuição de pontos
 */
function calcularFaixasHistograma(pontosArray, meusPontos) {
    if (pontosArray.length === 0) return [];

    const min = Math.min(...pontosArray);
    const max = Math.max(...pontosArray);
    const range = max - min;

    // 5 faixas
    const numFaixas = 5;
    const step = range > 0 ? range / numFaixas : 10;

    const faixas = [];
    for (let i = 0; i < numFaixas; i++) {
        const faixaMin = min + (step * i);
        const faixaMax = i === numFaixas - 1 ? max + 0.01 : min + (step * (i + 1));
        const count = pontosArray.filter(p => p >= faixaMin && p < faixaMax).length;

        faixas.push({
            label: `${faixaMin.toFixed(0)}-${(faixaMax - 0.01).toFixed(0)}`,
            min: parseFloat(faixaMin.toFixed(2)),
            max: parseFloat(faixaMax.toFixed(2)),
            count,
            is_minha_faixa: meusPontos >= faixaMin && meusPontos < faixaMax,
        });
    }

    return faixas;
}

export default { obterRaioXRodada };
