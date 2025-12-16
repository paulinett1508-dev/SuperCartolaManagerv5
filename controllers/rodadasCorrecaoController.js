// =====================================================================
// rodadasCorrecaoController.js v2.0.0 - SaaS DINÂMICO
// Controller para corrigir rodadas com dados corrompidos
// v2.0.0: Configurações dinâmicas via liga.configuracoes (White Label)
// Rota: POST /api/rodadas-correcao/:ligaId/corrigir
// =====================================================================

import Rodada from "../models/Rodada.js";
import Liga from "../models/Liga.js";
import Time from "../models/Time.js";
import mongoose from "mongoose";

function toLigaId(ligaId) {
  if (mongoose.Types.ObjectId.isValid(ligaId)) {
    return new mongoose.Types.ObjectId(ligaId);
  }
  return ligaId;
}

// =====================================================================
// ✅ v2.0: BUSCAR CONFIGURAÇÕES DA LIGA DO BANCO (SaaS Dinâmico)
// =====================================================================

/**
 * Busca as configurações de ranking_rodada da liga
 * @param {Object} liga - Documento da liga do MongoDB
 * @param {number} rodada - Número da rodada (para configs temporais)
 * @returns {Object} { valores: {posicao: valor}, temporal: boolean }
 */
function getConfigRankingRodada(liga, rodada = 1) {
  const config = liga?.configuracoes?.ranking_rodada;

  if (!config) {
    console.warn(`[CONFIG] Liga ${liga?._id} sem configuracoes.ranking_rodada, usando fallback`);
    return { valores: {}, temporal: false, totalParticipantes: 0 };
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
      totalParticipantes: faseConfig.total_participantes || 0
    };
  }

  // Config simples (ex: SuperCartola)
  return {
    valores: config.valores || {},
    temporal: false,
    totalParticipantes: config.total_participantes || 0
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

// =====================================================================
// CORRIGIR RODADAS CORROMPIDAS
// POST /api/rodadas-correcao/:ligaId/corrigir
// Body: { rodadaInicio: 36, rodadaFim: 38 }
// =====================================================================
export const corrigirRodadas = async (req, res) => {
  const { ligaId } = req.params;
  const { rodadaInicio, rodadaFim } = req.body;

  try {
    console.log(`[CORRIGIR-RODADAS] Iniciando correção para liga ${ligaId}`);
    console.log(`[CORRIGIR-RODADAS] Rodadas: ${rodadaInicio} a ${rodadaFim}`);

    const ligaIdObj = toLigaId(ligaId);
    const inicio = parseInt(rodadaInicio) || 36;
    const fim = parseInt(rodadaFim) || 38;

    // ✅ ETAPA 0: Buscar configuração da liga (para verificar rodada_desistencia)
    const liga = await Liga.findById(ligaIdObj).lean();
    if (!liga) {
      return res.status(404).json({
        success: false,
        error: "Liga não encontrada",
      });
    }

    // ✅ CORREÇÃO: Buscar rodada_desistencia da coleção Time (não de liga.times)
    // liga.times é apenas um array de IDs numéricos [123, 456, 789...]
    // O campo rodada_desistencia está no modelo Time separado
    const mapaDesistencia = {};
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

      console.log(`[CORRIGIR-RODADAS] Times consultados: ${timesStatus.length}`);
    }
    console.log(`[CORRIGIR-RODADAS] Mapa de desistências:`, mapaDesistencia);

    // ETAPA 1: Identificar times válidos de uma rodada anterior
    const timesValidos = await Rodada.distinct("timeId", {
      ligaId: ligaIdObj,
      rodada: { $lt: inicio },
      timeId: { $ne: null, $exists: true },
      nome_cartola: { $ne: "N/D" },
    });

    if (timesValidos.length === 0) {
      return res.status(400).json({
        success: false,
        error:
          "Não foi possível identificar times válidos em rodadas anteriores",
      });
    }

    console.log(
      `[CORRIGIR-RODADAS] Times válidos encontrados: ${timesValidos.length}`,
    );
    console.log(`[CORRIGIR-RODADAS] IDs: ${timesValidos.join(", ")}`);

    const resultados = [];

    // ETAPA 2: Para cada rodada a corrigir
    for (let rodada = inicio; rodada <= fim; rodada++) {
      console.log(`[CORRIGIR-RODADAS] Processando rodada ${rodada}...`);

      // 2.1: Limpar registros corrompidos
      const deletados = await Rodada.deleteMany({
        ligaId: ligaIdObj,
        rodada,
        $or: [
          { timeId: null },
          { timeId: { $exists: false } },
          { nome_cartola: "N/D", pontos: 0 },
        ],
      });

      console.log(
        `[CORRIGIR-RODADAS] Rodada ${rodada}: ${deletados.deletedCount} corrompidos removidos`,
      );

      // ✅ 2.1.5: Remover registros de times inativos (que desistiram antes desta rodada)
      const timesInativosNestaRodada = Object.entries(mapaDesistencia)
        .filter(([timeId, desistencia]) => rodada >= desistencia)
        .map(([timeId]) => Number(timeId));

      if (timesInativosNestaRodada.length > 0) {
        const deletadosInativos = await Rodada.deleteMany({
          ligaId: ligaIdObj,
          rodada,
          timeId: { $in: timesInativosNestaRodada },
        });
        console.log(
          `[CORRIGIR-RODADAS] Rodada ${rodada}: ${deletadosInativos.deletedCount} registros de times inativos removidos`,
        );
      }

      // 2.2: Buscar dados da API do Cartola
      const dadosRodada = [];
      let timesIgnorados = 0;

      for (const timeId of timesValidos) {
        // ✅ NOVO: Verificar se o time estava ativo nesta rodada
        const rodadaDesistencia = mapaDesistencia[timeId];
        const ativoNestaRodada = !rodadaDesistencia || rodada < rodadaDesistencia;

        if (!ativoNestaRodada) {
          console.log(
            `[CORRIGIR-RODADAS] Time ${timeId} IGNORADO na rodada ${rodada} (desistência: R${rodadaDesistencia})`,
          );
          timesIgnorados++;
          continue;
        }

        try {
          const url = `https://api.cartolafc.globo.com/time/id/${timeId}/${rodada}`;
          const response = await fetch(url);

          if (response.ok) {
            const dados = await response.json();

            dadosRodada.push({
              timeId,
              nome_cartola: dados.time?.nome_cartola || "N/D",
              nome_time: dados.time?.nome || "N/D",
              escudo: dados.time?.url_escudo_png || "",
              clube_id: dados.time?.time_id_do_coracao || null,
              pontos: dados.pontos || 0,
            });

            console.log(
              `[CORRIGIR-RODADAS] Time ${timeId}: ${dados.pontos} pts`,
            );
          } else {
            console.warn(
              `[CORRIGIR-RODADAS] API retornou ${response.status} para time ${timeId}`,
            );
          }

          // Rate limiting
          await new Promise((r) => setTimeout(r, 200));
        } catch (error) {
          console.error(
            `[CORRIGIR-RODADAS] Erro ao buscar time ${timeId}:`,
            error.message,
          );
        }
      }

      console.log(
        `[CORRIGIR-RODADAS] Rodada ${rodada}: ${timesIgnorados} times inativos ignorados`,
      );

      // 2.3: Ordenar e calcular posições
      dadosRodada.sort((a, b) => b.pontos - a.pontos);

      // ✅ v2.0: Buscar config para esta rodada específica
      const configRanking = getConfigRankingRodada(liga, rodada);
      console.log(`[CORRIGIR-RODADAS] Config ranking rodada ${rodada}:`,
        configRanking.temporal ? `${configRanking.fase} (temporal)` : 'simples');

      // 2.4: Salvar no banco
      let salvos = 0;
      for (let i = 0; i < dadosRodada.length; i++) {
        const time = dadosRodada[i];
        const posicao = i + 1;
        // ✅ v2.0: Usar função que busca do config do banco
        const valorFinanceiro = getValorFinanceiroPosicao(configRanking, posicao);

        await Rodada.findOneAndUpdate(
          { ligaId: ligaIdObj, rodada, timeId: time.timeId },
          {
            ligaId: ligaIdObj,
            rodada,
            timeId: time.timeId,
            nome_cartola: time.nome_cartola,
            nome_time: time.nome_time,
            escudo: time.escudo,
            clube_id: time.clube_id,
            pontos: time.pontos,
            posicao,
            valorFinanceiro,
            totalParticipantesAtivos: dadosRodada.length,
            rodadaNaoJogada: false,
          },
          { upsert: true, new: true },
        );
        salvos++;
      }

      resultados.push({
        rodada,
        corrompidosRemovidos: deletados.deletedCount,
        timesBuscados: dadosRodada.length,
        registrosSalvos: salvos,
        ranking: dadosRodada.map((t, i) => ({
          posicao: i + 1,
          nome: t.nome_cartola,
          pontos: t.pontos,
          // ✅ v2.0: Usar função que busca do config
          banco: getValorFinanceiroPosicao(configRanking, i + 1),
        })),
      });
    }

    // ETAPA 3: Verificação final
    const verificacao = {};
    for (let rodada = inicio; rodada <= fim; rodada++) {
      const count = await Rodada.countDocuments({
        ligaId: ligaIdObj,
        rodada,
        timeId: { $ne: null },
      });
      verificacao[`rodada_${rodada}`] = count;
    }

    res.json({
      success: true,
      mensagem: `Correção concluída para rodadas ${inicio} a ${fim}`,
      timesIdentificados: timesValidos.length,
      resultados,
      verificacao,
    });
  } catch (error) {
    console.error("[CORRIGIR-RODADAS] Erro:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// =====================================================================
// VERIFICAR RODADAS CORROMPIDAS
// GET /api/rodadas-correcao/:ligaId/verificar
// =====================================================================
export const verificarCorrompidos = async (req, res) => {
  const { ligaId } = req.params;

  try {
    const ligaIdObj = toLigaId(ligaId);

    // Buscar rodadas com dados corrompidos
    const corrompidos = await Rodada.find({
      ligaId: ligaIdObj,
      $or: [
        { timeId: null },
        { timeId: { $exists: false } },
        { nome_cartola: "N/D", pontos: 0 },
      ],
    })
      .select("rodada timeId nome_cartola pontos")
      .lean();

    // Agrupar por rodada
    const porRodada = {};
    corrompidos.forEach((r) => {
      if (!porRodada[r.rodada]) porRodada[r.rodada] = 0;
      porRodada[r.rodada]++;
    });

    // Contar registros válidos por rodada (1-38)
    const contagem = {};
    for (let i = 1; i <= 38; i++) {
      contagem[i] = await Rodada.countDocuments({
        ligaId: ligaIdObj,
        rodada: i,
        timeId: { $ne: null },
      });
    }

    // Identificar rodadas problemáticas
    const mediaRegistros = Object.values(contagem).filter((v) => v > 0);
    const esperado =
      mediaRegistros.length > 0 ? Math.max(...mediaRegistros) : 0;

    const rodadasProblematicas = Object.entries(contagem)
      .filter(([rodada, count]) => count < esperado && count >= 0)
      .map(([rodada, count]) => ({
        rodada: parseInt(rodada),
        registros: count,
        esperado,
        faltando: esperado - count,
      }));

    res.json({
      success: true,
      totalCorrompidos: corrompidos.length,
      corrompidosPorRodada: porRodada,
      registrosPorRodada: contagem,
      registrosEsperados: esperado,
      rodadasProblematicas,
    });
  } catch (error) {
    console.error("[VERIFICAR-CORROMPIDOS] Erro:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

console.log("[RODADAS-CORRECAO] ✅ v2.0.0 carregado (SaaS Dinâmico)");
