// =====================================================================
// RODADAS CACHE CONTROLLER v2.0.0 (SaaS DINÂMICO)
// Sistema de recálculo SEGURO - NUNCA deleta dados
// ✅ v2.0.0: MULTI-TENANT - Busca configurações de liga.configuracoes (White Label)
//   - Remove hardcoded IDs e valores de ligas específicas
//   - getConfigRankingRodada() busca de liga.configuracoes.ranking_rodada
//   - Suporta configs temporais (fases) automaticamente
// ✅ v1.2: Suporte a fases (Cartoleiros Sobral: FASE1 R1-28, FASE2 R29-38)
// =====================================================================

import Rodada from "../models/Rodada.js";
import Liga from "../models/Liga.js";
import Time from "../models/Time.js";
import mongoose from "mongoose";

// =====================================================================
// ✅ v2.0: FUNÇÕES SaaS DINÂMICAS (Multi-Tenant)
// =====================================================================

/**
 * Obtém configuração de ranking_rodada (BANCO) da liga
 * @param {Object} liga - Documento da liga
 * @param {number} rodada - Número da rodada (para configs temporais)
 * @returns {Object} { valores: {posicao: valor}, temporal: boolean }
 */
function getConfigRankingRodada(liga, rodada = 1) {
  const config = liga?.configuracoes?.ranking_rodada;

  if (!config) {
    console.warn(`[RODADAS-CACHE] Liga ${liga?._id} sem configuracoes.ranking_rodada`);
    return { valores: {}, temporal: false };
  }

  // Config temporal (ex: Sobral com 2 fases)
  if (config.temporal) {
    const rodadaTransicao = config.rodada_transicao || 30;
    const fase = rodada < rodadaTransicao ? 'fase1' : 'fase2';
    const faseConfig = config[fase] || {};

    return {
      valores: faseConfig.valores || {},
      temporal: true,
      rodadaTransicao,
      fase,
    };
  }

  // Config simples
  return {
    valores: config.valores || {},
    temporal: false,
  };
}

/**
 * Obtém valor financeiro para uma posição específica
 * @param {Object} configRanking - Resultado de getConfigRankingRodada()
 * @param {number} posicao - Posição do participante
 * @returns {number} Valor financeiro (positivo, zero ou negativo)
 */
function getValorFinanceiroPosicao(configRanking, posicao) {
  const valores = configRanking?.valores || {};
  return valores[posicao] || valores[String(posicao)] || 0;
}

function toLigaId(ligaId) {
  if (mongoose.Types.ObjectId.isValid(ligaId)) {
    return new mongoose.Types.ObjectId(ligaId);
  }
  return ligaId;
}

// =====================================================================
// RECALCULAR RODADAS - ÚNICA FUNÇÃO PERMITIDA (APENAS ATUALIZA)
// =====================================================================
export const recalcularRodadas = async (req, res) => {
  try {
    const { ligaId } = req.params;
    const { rodadaInicio, rodadaFim } = req.body;

    console.log(
      `[RODADAS-CACHE] 🔄 Recalculando rodadas ${rodadaInicio} a ${rodadaFim} da liga ${ligaId}`,
    );

    // Validações
    if (!rodadaInicio || !rodadaFim) {
      return res.status(400).json({
        success: false,
        erro: "Parâmetros rodadaInicio e rodadaFim são obrigatórios",
      });
    }

    const inicio = parseInt(rodadaInicio);
    const fim = parseInt(rodadaFim);

    if (inicio < 1 || fim > 38 || inicio > fim) {
      return res.status(400).json({
        success: false,
        erro: "Valores de rodada inválidos (1-38)",
      });
    }

    // Buscar dados da liga
    const liga = await Liga.findById(toLigaId(ligaId)).lean();
    if (!liga) {
      return res.status(404).json({
        success: false,
        erro: "Liga não encontrada",
      });
    }

    // ✅ v1.2: Buscar status de todos os times da liga (da coleção Time)
    let mapaDesistencia = {};
    if (liga.times && liga.times.length > 0) {
      const timesStatus = await Time.find(
        { id: { $in: liga.times } },
        { id: 1, ativo: 1, rodada_desistencia: 1 }
      ).lean();

      timesStatus.forEach((time) => {
        if (time.ativo === false && time.rodada_desistencia) {
          mapaDesistencia[time.id] = time.rodada_desistencia;
        }
      });

      console.log(`[RODADAS-CACHE] Mapa de desistências:`, mapaDesistencia);
    }

    let totalRecalculados = 0;
    let rodadasProcessadas = [];

    // Iterar sobre cada rodada
    for (let rodada = inicio; rodada <= fim; rodada++) {
      console.log(`[RODADAS-CACHE] 📊 Processando rodada ${rodada}...`);

      // ✅ v2.0: Obter valores do banco da configuração da liga
      const configRanking = getConfigRankingRodada(liga, rodada);

      // Buscar documentos existentes desta rodada
      const documentosRodada = await Rodada.find({
        ligaId: toLigaId(ligaId),
        rodada,
      });

      if (documentosRodada.length === 0) {
        console.log(`[RODADAS-CACHE] ⚠️ Rodada ${rodada} sem dados - pulando`);
        rodadasProcessadas.push({
          rodada,
          status: "sem_dados",
          recalculados: 0,
        });
        continue;
      }

      // ✅ v1.2: Enriquecer com status de ativo/inativo (usando mapa da coleção Time)
      const timesComStatus = documentosRodada.map((doc) => {
        const rodadaDesistencia = mapaDesistencia[doc.timeId] || null;
        const ativoNestaRodada =
          !rodadaDesistencia || rodada < rodadaDesistencia;

        return {
          _id: doc._id,
          timeId: doc.timeId,
          pontos: doc.pontos,
          rodadaNaoJogada: doc.rodadaNaoJogada,
          nome_cartola: doc.nome_cartola,
          nome_time: doc.nome_time,
          escudo: doc.escudo,
          clube_id: doc.clube_id,
          escudo_time_do_coracao: doc.escudo_time_do_coracao,
          ativoNestaRodada,
        };
      });

      // Filtrar apenas ATIVOS nesta rodada
      const timesAtivos = timesComStatus.filter((t) => t.ativoNestaRodada);

      // Ordenar por pontos
      const timesOrdenados = [...timesAtivos].sort(
        (a, b) => (b.pontos || 0) - (a.pontos || 0),
      );

      // Recalcular posições e valores financeiros (APENAS ATUALIZA, NÃO DELETA)
      let recalculadosRodada = 0;
      for (let i = 0; i < timesOrdenados.length; i++) {
        const time = timesOrdenados[i];
        const posicao = i + 1;
        // ✅ v2.0: Usar função que busca do config do banco
        const valorFinanceiro = getValorFinanceiroPosicao(configRanking, posicao);

        await Rodada.findByIdAndUpdate(time._id, {
          posicao,
          valorFinanceiro,
          totalParticipantesAtivos: timesOrdenados.length,
        });

        recalculadosRodada++;
        totalRecalculados++;
      }

      rodadasProcessadas.push({
        rodada,
        status: "recalculado",
        ativos: timesOrdenados.length,
        total: documentosRodada.length,
        recalculados: recalculadosRodada,
      });

      console.log(
        `[RODADAS-CACHE] ✅ Rodada ${rodada}: ${recalculadosRodada} registros recalculados`,
      );
    }

    res.json({
      success: true,
      message: `Recálculo concluído com sucesso`,
      ligaId,
      rodadaInicio: inicio,
      rodadaFim: fim,
      totalRecalculados,
      rodadasProcessadas,
      participantesAtivos: liga.times.filter((t) => t.ativo !== false).length,
      participantesTotal: liga.times.length,
    });
  } catch (error) {
    console.error("[RODADAS-CACHE] ❌ Erro ao recalcular:", error);
    res.status(500).json({
      success: false,
      erro: error.message,
    });
  }
};

// =====================================================================
// ESTATÍSTICAS
// =====================================================================
export const estatisticasCache = async (req, res) => {
  try {
    const { ligaId } = req.params;
    const filtroBase = ligaId ? { ligaId: toLigaId(ligaId) } : {};

    const total = await Rodada.countDocuments(filtroBase);

    const corrompidos = await Rodada.countDocuments({
      ...filtroBase,
      $or: [
        { posicao: { $exists: false } },
        { posicao: null },
        { valorFinanceiro: { $exists: false } },
      ],
    });

    const validos = total - corrompidos;

    let porRodada = null;
    if (ligaId) {
      const pipeline = [
        { $match: { ligaId: toLigaId(ligaId) } },
        { $group: { _id: "$rodada", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ];
      porRodada = await Rodada.aggregate(pipeline);
    }

    res.json({
      success: true,
      estatisticas: {
        total,
        validos,
        corrompidos,
        percentualValido:
          total > 0 ? ((validos / total) * 100).toFixed(1) + "%" : "0%",
        porRodada: porRodada || "disponível apenas para liga específica",
      },
    });
  } catch (error) {
    console.error("[RODADAS-CACHE] ❌ Erro ao obter estatísticas:", error);
    res.status(500).json({
      success: false,
      erro: "Erro ao obter estatísticas",
    });
  }
};

console.log("[RODADAS-CACHE] ✅ v2.0.0 carregado (SaaS Dinâmico)");
