// =====================================================================
// rodadaController.js v3.1.0 - SaaS DINÂMICO: Configs do banco de dados
// Busca dados da API do Cartola e calcula posições
// v3.1.0: Salva atletas na rodada para fallback offline (Campinho)
// v3.0.0: Configurações dinâmicas via liga.configuracoes (White Label)
// v2.9.3: Circuit Breaker de fim de temporada implementado
// =====================================================================

import Rodada from "../models/Rodada.js";
import Time from "../models/Time.js";
import Liga from "../models/Liga.js";
import CartolaOficialDump from "../models/CartolaOficialDump.js";
import mongoose from "mongoose";
import { isSeasonFinished, logBlockedOperation, SEASON_CONFIG } from "../utils/seasonGuard.js";
import { CURRENT_SEASON } from "../config/seasons.js";

// ✅ Converter ligaId para ObjectId
function toLigaId(ligaId) {
  if (mongoose.Types.ObjectId.isValid(ligaId)) {
    return new mongoose.Types.ObjectId(ligaId);
  }
  return ligaId;
}

// =====================================================================
// ✅ v3.0: BUSCAR CONFIGURAÇÕES DA LIGA DO BANCO (SaaS Dinâmico)
// =====================================================================

/**
 * Busca as configurações de ranking_rodada da liga
 * @param {Object} liga - Documento da liga do MongoDB
 * @param {number} rodada - Número da rodada (para configs temporais)
 * @returns {Object} { valores: {posicao: valor}, temporal: boolean, totalParticipantes: number }
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
      totalParticipantes: faseConfig.total_participantes || 0,
      faixas: faseConfig.faixas || null
    };
  }

  // Config simples (ex: SuperCartola)
  return {
    valores: config.valores || {},
    temporal: false,
    totalParticipantes: config.total_participantes || 0,
    faixas: config.faixas || null
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
// ✅ v2.4: BUSCAR MAPA DE clube_id EXISTENTES
// =====================================================================
async function obterMapaClubeId(ligaIdObj) {
  // Busca o clube_id mais recente de cada time nas rodadas já salvas
  const registros = await Rodada.aggregate([
    { $match: { ligaId: ligaIdObj, clube_id: { $ne: null, $exists: true } } },
    { $sort: { rodada: -1 } },
    { $group: { _id: "$timeId", clube_id: { $first: "$clube_id" } } },
  ]);

  const mapa = {};
  registros.forEach((r) => {
    mapa[r._id] = r.clube_id;
  });

  console.log(`[MAPA-CLUBE-ID] ${Object.keys(mapa).length} times mapeados`);
  return mapa;
}

// =====================================================================
// POPULAR RODADAS
// =====================================================================
export const popularRodadas = async (req, res) => {
  const { ligaId } = req.params;
  const { rodada, inicio, fim, repopular } = req.body;

  // ⛔ SEASON GUARD: Bloquear população de rodadas se temporada encerrada
  if (isSeasonFinished()) {
    logBlockedOperation('popularRodadas', { ligaId, rodada, inicio, fim });
    return res.status(403).json({
      error: 'Operação bloqueada',
      message: SEASON_CONFIG.BLOCK_MESSAGE,
      hint: 'A temporada está encerrada. Dados são imutáveis.',
      season: SEASON_CONFIG.SEASON_YEAR
    });
  }

  try {
    console.log(`[POPULAR-RODADAS] Iniciando para liga ${ligaId}`, {
      rodada,
      inicio,
      fim,
      repopular,
    });

    // Determinar range de rodadas
    let rodadaInicio, rodadaFim;

    if (rodada !== undefined) {
      rodadaInicio = rodadaFim = Number(rodada);
    } else if (inicio !== undefined && fim !== undefined) {
      rodadaInicio = Number(inicio);
      rodadaFim = Number(fim);
    } else {
      return res.status(400).json({
        error: "Parâmetros inválidos. Use 'rodada' OU 'inicio' e 'fim'",
      });
    }

    // Validação
    if (rodadaInicio < 1 || rodadaFim > 38 || rodadaInicio > rodadaFim) {
      return res.status(400).json({
        error: "Intervalo de rodadas inválido (1-38)",
      });
    }

    // ✅ FIX: Converter ligaId para ObjectId
    const ligaIdObj = toLigaId(ligaId);
    console.log(`[POPULAR-RODADAS] ligaId convertido: ${ligaIdObj}`);

    // 1. BUSCAR TODOS OS TIMES DA LIGA
    // ✅ v2.6: Buscar via Liga.times (array de IDs numéricos)
    const liga = await Liga.findById(ligaIdObj).lean();

    if (!liga) {
      console.error(`[POPULAR-RODADAS] Liga não encontrada: ${ligaId}`);
      return res.status(404).json({
        error: "Liga não encontrada",
        ligaId: ligaId,
      });
    }

    if (!Array.isArray(liga.times) || liga.times.length === 0) {
      console.error(`[POPULAR-RODADAS] Liga sem times cadastrados: ${ligaId}`);
      return res.status(404).json({
        error: "Nenhum time cadastrado na liga",
        ligaId: ligaId,
      });
    }

    console.log(
      `[POPULAR-RODADAS] Liga tem ${liga.times.length} times cadastrados`,
    );

    // Buscar dados completos dos times
    const timesCompletos = await Time.find({ id: { $in: liga.times } })
      .select("id ativo rodada_desistencia")
      .lean();

    // ✅ v2.6: Mapear campo 'id' para 'timeId' para compatibilidade
    const times = timesCompletos.map((t) => ({
      timeId: t.id,
      ativo: t.ativo,
      rodada_desistencia: t.rodada_desistencia,
    }));

    console.log(`[POPULAR-RODADAS] ${times.length} times encontrados na liga`);

    // ✅ v2.4: Buscar mapa de clube_id existentes
    const mapaClubeId = await obterMapaClubeId(ligaIdObj);

    // 2. PROCESSAR CADA RODADA
    const resumo = {
      processadas: 0,
      inseridas: 0,
      atualizadas: 0,
      erros: 0,
    };
    const detalhes = [];

    for (let numRodada = rodadaInicio; numRodada <= rodadaFim; numRodada++) {
      console.log(`[POPULAR-RODADAS] Processando rodada ${numRodada}...`);

      try {
        const resultadoRodada = await processarRodada(
          ligaIdObj,
          ligaId,
          numRodada,
          times,
          repopular,
          mapaClubeId,
          liga, // ✅ v3.0: Passar objeto liga para acessar configuracoes
        );

        resumo.processadas++;
        resumo.inseridas += resultadoRodada.inseridas;
        resumo.atualizadas += resultadoRodada.atualizadas;

        detalhes.push(
          `Rodada ${numRodada}: ${resultadoRodada.inseridas} inseridas, ${resultadoRodada.atualizadas} atualizadas`,
        );
      } catch (error) {
        console.error(
          `[POPULAR-RODADAS] Erro na rodada ${numRodada}:`,
          error.message,
        );
        resumo.erros++;
        detalhes.push(`Rodada ${numRodada}: ERRO - ${error.message}`);
      }
    }

    // 3. RESPOSTA
    const mensagem =
      rodadaInicio === rodadaFim
        ? `Rodada ${rodadaInicio} populada com sucesso`
        : `Rodadas ${rodadaInicio} a ${rodadaFim} populadas`;

    res.json({
      success: true,
      mensagem,
      resumo,
      detalhes,
      participantesAtivos: times.filter((t) => t.ativo !== false).length,
      participantesTotal: times.length,
    });
  } catch (error) {
    console.error("[POPULAR-RODADAS] Erro geral:", error);
    res.status(500).json({
      error: "Erro ao popular rodadas",
      detalhes: error.message,
    });
  }
};

// =====================================================================
// PROCESSAR UMA RODADA - ✅ v3.0: Usa configs do banco
// =====================================================================
async function processarRodada(
  ligaIdObj,
  ligaIdStr,
  rodada,
  times,
  repopular,
  mapaClubeId = {},
  liga = null, // ✅ v3.0: Recebe objeto liga para acessar configuracoes
) {
  // ✅ v3.0: Buscar configuração do banco ao invés de hardcode
  const configRanking = getConfigRankingRodada(liga, rodada);
  console.log(`[PROCESSAR-RODADA] Config ranking para rodada ${rodada}:`,
    configRanking.temporal ? `${configRanking.fase} (temporal)` : 'simples');

  let inseridas = 0;
  let atualizadas = 0;

  // 1. VERIFICAR SE JÁ EXISTE (✅ fix: filtrar por temporada para não colidir com dados antigos)
  if (!repopular) {
    const existente = await Rodada.findOne({ ligaId: ligaIdObj, rodada, temporada: CURRENT_SEASON }).lean();
    if (existente) {
      console.log(`[PROCESSAR-RODADA] Rodada ${rodada} temporada ${CURRENT_SEASON} já existe (pulando)`);
      return { inseridas: 0, atualizadas: 0 };
    }
  }

  // 2. BUSCAR DADOS DE CADA TIME DA API DO CARTOLA
  const dadosRodada = [];

  for (const time of times) {
    // ✅ Verificar se o time estava ativo nesta rodada
    const rodadaDesistencia = time.rodada_desistencia || null;
    const ativoNestaRodada = !rodadaDesistencia || rodada < rodadaDesistencia;

    // Se time já tinha desistido antes desta rodada, pular
    if (!ativoNestaRodada) {
      console.log(
        `[PROCESSAR-RODADA] Time ${time.timeId} inativo na rodada ${rodada} (desistência: ${rodadaDesistencia})`,
      );
      continue;
    }

    try {
      // Buscar da API do Cartola FC
      const url = `https://api.cartolafc.globo.com/time/id/${time.timeId}/${rodada}`;
      const response = await fetch(url);

      if (response.ok) {
        const dados = await response.json();

        // ✅ v3.2: Salvar JSON completo no Data Lake (CartolaOficialDump)
        try {
          await CartolaOficialDump.salvarDump({
            time_id: time.timeId,
            temporada: CURRENT_SEASON,
            rodada,
            tipo_coleta: 'time_rodada',
            raw_json: dados,
            meta: {
              url_origem: url,
              http_status: response.status,
              origem_trigger: 'processamento_rodada',
              liga_id: ligaIdObj,
            },
          });
        } catch (dumpErr) {
          // Não bloquear o fluxo principal se o dump falhar
          console.warn(`[PROCESSAR-RODADA] Erro ao salvar dump time ${time.timeId} rodada ${rodada}:`, dumpErr.message);
        }

        // ✅ v2.4: clube_id da API OU do mapa de rodadas anteriores
        const clubeIdApi = dados.time?.time_id_do_coracao || null;
        const clubeIdHerdado = mapaClubeId[time.timeId] || null;
        const clubeIdFinal = clubeIdApi || clubeIdHerdado;

        // ✅ v2.4: Atualizar mapa se conseguiu um novo clube_id
        if (clubeIdApi && !mapaClubeId[time.timeId]) {
          mapaClubeId[time.timeId] = clubeIdApi;
        }

        // ✅ v3.1: Extrair atletas para fallback offline (Campinho)
        const atletasRaw = dados.atletas || [];
        const atletas = atletasRaw.map(a => ({
          atleta_id: a.atleta_id,
          apelido: a.apelido,
          posicao_id: a.posicao_id,
          clube_id: a.clube?.id || a.clube_id,
          pontos_num: a.pontos_num || 0,
          status_id: a.status_id || 0,
        }));

        dadosRodada.push({
          timeId: time.timeId,
          nome_cartola: dados.time?.nome_cartola || "N/D",
          nome_time: dados.time?.nome || "N/D",
          escudo: dados.time?.url_escudo_png || "",
          clube_id: clubeIdFinal,
          pontos: dados.pontos || 0,
          ativo: time.ativo !== false,
          // ✅ v3.1: Dados de escalação para fallback
          atletas: atletas,
          capitao_id: dados.capitao_id || null,
          reserva_luxo_id: dados.reserva_luxo_id || null,
        });

        console.log(
          `[PROCESSAR-RODADA] Time ${time.timeId} rodada ${rodada}: ${dados.pontos} pontos (clube_id: ${clubeIdFinal})`,
        );
      } else {
        // API falhou - criar registro com clube_id herdado
        console.warn(
          `[PROCESSAR-RODADA] API falhou para time ${time.timeId} rodada ${rodada} (status: ${response.status})`,
        );

        dadosRodada.push({
          timeId: time.timeId,
          nome_cartola: "N/D",
          nome_time: "N/D",
          escudo: "",
          clube_id: mapaClubeId[time.timeId] || null, // ✅ v2.4: Herdar clube_id
          pontos: 0,
          ativo: time.ativo !== false,
          rodadaNaoJogada: true,
        });
      }
    } catch (error) {
      console.error(
        `[PROCESSAR-RODADA] Erro ao buscar time ${time.timeId}:`,
        error.message,
      );

      // Erro na requisição - criar registro com clube_id herdado
      dadosRodada.push({
        timeId: time.timeId,
        nome_cartola: "N/D",
        nome_time: "N/D",
        escudo: "",
        clube_id: mapaClubeId[time.timeId] || null, // ✅ v2.4: Herdar clube_id
        pontos: 0,
        ativo: time.ativo !== false,
        rodadaNaoJogada: true,
      });
    }
  }

  // 3. CALCULAR POSIÇÕES (considerando apenas times ativos)
  const timesAtivos = dadosRodada.filter((t) => t.ativo);
  const timesInativos = dadosRodada.filter((t) => !t.ativo);

  // Ordenar ativos por pontos (decrescente)
  timesAtivos.sort((a, b) => b.pontos - a.pontos);

  // Atribuir posições aos ativos
  timesAtivos.forEach((time, index) => {
    time.posicao = index + 1;
    // ✅ v3.0: Usar função que busca do config ao invés de hardcode
    time.valorFinanceiro = getValorFinanceiroPosicao(configRanking, time.posicao);
  });

  // Inativos ficam nas últimas posições (sem valor financeiro)
  timesInativos.forEach((time, index) => {
    time.posicao = timesAtivos.length + index + 1;
    time.valorFinanceiro = 0;
  });

  // 4. SALVAR NO BANCO
  const todosTimes = [...timesAtivos, ...timesInativos];

  for (const time of todosTimes) {
    try {
      const resultado = await Rodada.findOneAndUpdate(
        { ligaId: ligaIdObj, rodada, timeId: time.timeId, temporada: CURRENT_SEASON },
        {
          ligaId: ligaIdObj,
          rodada,
          timeId: time.timeId,
          temporada: CURRENT_SEASON,
          nome_cartola: time.nome_cartola,
          nome_time: time.nome_time,
          escudo: time.escudo,
          clube_id: time.clube_id,
          pontos: time.pontos,
          posicao: time.posicao,
          valorFinanceiro: time.valorFinanceiro,
          totalParticipantesAtivos: timesAtivos.length,
          rodadaNaoJogada: time.rodadaNaoJogada || false,
          // ✅ v3.1: Escalação para fallback offline (Campinho)
          atletas: time.atletas || [],
          capitao_id: time.capitao_id || null,
          reserva_luxo_id: time.reserva_luxo_id || null,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );

      if (resultado) {
        atualizadas++;
      }
    } catch (saveError) {
      console.error(
        `[PROCESSAR-RODADA] Erro ao salvar time ${time.timeId}:`,
        saveError.message,
      );
    }
  }

  console.log(
    `[PROCESSAR-RODADA] Rodada ${rodada}: ${atualizadas} registros processados (${timesAtivos.length} ativos)`,
  );

  return { inseridas, atualizadas };
}

// =====================================================================
// OBTER RODADAS (GET) - ✅ v2.9: Lógica por fase (Cartoleiros Sobral)
// FASE 1 (R1-R28): 6 times, valores originais, sem recalcular
// FASE 2 (R29-R38): 4 times, filtrar inativos, recalcular posições
// =====================================================================
export const obterRodadas = async (req, res) => {
  const { ligaId } = req.params;
  const { rodada, inicio, fim, temporada } = req.query;

  try {
    const ligaIdObj = toLigaId(ligaId);
    let filtro = { ligaId: ligaIdObj };

    // Multi-Temporada: filtrar por temporada se fornecida
    if (temporada) {
      filtro.temporada = Number(temporada);
    }

    if (rodada) {
      filtro.rodada = Number(rodada);
    } else if (inicio && fim) {
      filtro.rodada = { $gte: Number(inicio), $lte: Number(fim) };
    }

    console.log(`[OBTER-RODADAS] Filtro:`, JSON.stringify(filtro));

    // Buscar rodadas do banco
    const rodadas = await Rodada.find(filtro)
      .sort({ rodada: 1, posicao: 1 })
      .lean();

    // ✅ v3.0: Buscar liga para acessar configurações do banco
    const liga = await Liga.findById(ligaIdObj).lean();

    // ✅ v3.0: Verificar se a liga tem config temporal (ex: 2 fases)
    const configRanking = getConfigRankingRodada(liga, 1); // Rodada 1 para checar se é temporal
    const isConfigTemporal = configRanking.temporal;

    if (!isConfigTemporal) {
      // ✅ v3.0: Liga com config simples (ex: SuperCartola)
      // Necessário porque dados antigos podem não ter esses campos
      const rodadasComTotal = [];
      const rodadasAgrupadas = new Map();

      rodadas.forEach((r) => {
        if (!rodadasAgrupadas.has(r.rodada)) {
          rodadasAgrupadas.set(r.rodada, []);
        }
        rodadasAgrupadas.get(r.rodada).push(r);
      });

      rodadasAgrupadas.forEach((participantes, numRodada) => {
        // Filtrar participantes que jogaram (ativos na rodada)
        const jogadores = participantes.filter(p => p.rodadaNaoJogada !== true);
        const naoJogaram = participantes.filter(p => p.rodadaNaoJogada === true);
        const totalAtivos = jogadores.length;

        // ✅ v3.0: Buscar config para esta rodada específica
        const configRodada = getConfigRankingRodada(liga, numRodada);

        // Ordenar por pontos (decrescente) para calcular posição
        jogadores.sort((a, b) => (b.pontos || 0) - (a.pontos || 0));

        // Atribuir posições e valores financeiros aos que jogaram
        jogadores.forEach((p, index) => {
          const posicao = index + 1;
          // ✅ v3.0: Usar função que busca do config
          const valorFinanceiro = getValorFinanceiroPosicao(configRodada, posicao);

          rodadasComTotal.push({
            ...p,
            posicao: posicao,
            valorFinanceiro: valorFinanceiro,
            totalParticipantesAtivos: totalAtivos,
          });
        });

        // Participantes que não jogaram ficam no final sem posição financeira
        naoJogaram.forEach((p, index) => {
          rodadasComTotal.push({
            ...p,
            posicao: totalAtivos + index + 1,
            valorFinanceiro: 0,
            totalParticipantesAtivos: totalAtivos,
          });
        });
      });

      // Ordenar resultado final
      rodadasComTotal.sort((a, b) => {
        if (a.rodada !== b.rodada) return a.rodada - b.rodada;
        return (a.posicao || 999) - (b.posicao || 999);
      });

      console.log(`[OBTER-RODADAS] Retornando: ${rodadasComTotal.length} rodadas (SuperCartola - posições recalculadas)`);
      return res.json(rodadasComTotal);
    }

    // =====================================================================
    // ✅ v3.0: LÓGICA PARA LIGAS COM CONFIG TEMPORAL (ex: 2 FASES)
    // =====================================================================
    console.log(`[OBTER-RODADAS] Liga com config temporal - aplicando lógica de fases`);

    // Buscar mapa de desistências (liga já foi buscada acima)
    let mapaDesistencia = {};

    if (liga && liga.times && liga.times.length > 0) {
      const timesStatus = await Time.find(
        { id: { $in: liga.times } },
        { id: 1, ativo: 1, rodada_desistencia: 1 }
      ).lean();

      timesStatus.forEach((time) => {
        if (time.ativo === false && time.rodada_desistencia) {
          mapaDesistencia[time.id] = time.rodada_desistencia;
        }
      });

      console.log(`[OBTER-RODADAS] Mapa de desistências:`, mapaDesistencia);
    }

    // ✅ v3.0: Buscar rodada de transição do config do banco
    const rodadaTransicao = configRanking.rodadaTransicao || 30;
    const rodadasProcessadas = [];

    // Separar rodadas por fase
    const rodadasFase1 = rodadas.filter((r) => r.rodada < rodadaTransicao);
    const rodadasFase2Raw = rodadas.filter((r) => r.rodada >= rodadaTransicao);

    // FASE 1: Retornar como está no banco (sem alterações)
    console.log(`[OBTER-RODADAS] FASE 1 (R1-R${rodadaTransicao - 1}): ${rodadasFase1.length} registros (sem recálculo)`);
    rodadasProcessadas.push(...rodadasFase1);

    // FASE 2 (R29+): Filtrar inativos e recalcular posições
    const rodadasFase2Filtradas = rodadasFase2Raw.filter((r) => {
      const rodadaDesistencia = mapaDesistencia[r.timeId];
      if (rodadaDesistencia && r.rodada >= rodadaDesistencia) {
        return false;
      }
      return true;
    });

    const removidosFase2 = rodadasFase2Raw.length - rodadasFase2Filtradas.length;
    console.log(`[OBTER-RODADAS] FASE 2 (R${rodadaTransicao}+): ${removidosFase2} inativos filtrados`);

    // Agrupar FASE 2 por rodada para recalcular
    const rodadasFase2PorNumero = new Map();
    rodadasFase2Filtradas.forEach((r) => {
      if (!rodadasFase2PorNumero.has(r.rodada)) {
        rodadasFase2PorNumero.set(r.rodada, []);
      }
      rodadasFase2PorNumero.get(r.rodada).push(r);
    });

    // Recalcular posições e valores da FASE 2
    rodadasFase2PorNumero.forEach((timesNaRodada, numRodada) => {
      // ✅ v3.0: Buscar config para esta rodada específica (fase2)
      const configFase2 = getConfigRankingRodada(liga, numRodada);

      // Ordenar por pontos (decrescente)
      timesNaRodada.sort((a, b) => (b.pontos || 0) - (a.pontos || 0));

      // Atribuir novas posições e valores
      timesNaRodada.forEach((time, index) => {
        const novaPosicao = index + 1;
        // ✅ v3.0: Usar função que busca do config
        const novoValorFinanceiro = getValorFinanceiroPosicao(configFase2, novaPosicao);

        rodadasProcessadas.push({
          ...time,
          posicao: novaPosicao,
          valorFinanceiro: novoValorFinanceiro,
          totalParticipantesAtivos: timesNaRodada.length,
        });
      });
    });

    // Ordenar resultado final
    rodadasProcessadas.sort((a, b) => {
      if (a.rodada !== b.rodada) return a.rodada - b.rodada;
      return a.posicao - b.posicao;
    });

    console.log(`[OBTER-RODADAS] Retornando: ${rodadasProcessadas.length} rodadas (FASE 1: original, FASE 2: recalculada)`);

    res.json(rodadasProcessadas);
  } catch (error) {
    console.error("[OBTER-RODADAS] Erro:", error);
    res.status(500).json({
      error: "Erro ao obter rodadas",
      detalhes: error.message,
    });
  }
};

// =====================================================================
// CRIAR ÍNDICE ÚNICO
// =====================================================================
export const criarIndiceUnico = async (req, res) => {
  try {
    await Rodada.collection.createIndex(
      { ligaId: 1, rodada: 1, timeId: 1 },
      { unique: true },
    );

    res.json({
      success: true,
      mensagem: "Índice único criado com sucesso",
    });
  } catch (error) {
    console.error("[CRIAR-INDICE] Erro:", error);
    res.status(500).json({
      error: "Erro ao criar índice",
      detalhes: error.message,
    });
  }
};

console.log("[RODADA-CONTROLLER] ✅ v3.0.0 carregado (SaaS Dinâmico + SEASON GUARD)");
