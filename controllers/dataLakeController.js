// ✅ controllers/dataLakeController.js - Data Lake dos Participantes
// Gerencia sincronização com API Cartola e acesso aos dados raw
import fetch from "node-fetch";
import CartolaOficialDump from "../models/CartolaOficialDump.js";
import Time from "../models/Time.js";
import { CURRENT_SEASON } from "../config/seasons.js";
import { isSeasonFinished, logBlockedOperation, SEASON_CONFIG } from "../utils/seasonGuard.js";

// =============================================================================
// CONFIGURAÇÕES
// =============================================================================
const API_CARTOLA_BASE = "https://api.cartola.globo.com";
const FETCH_TIMEOUT = 15000; // 15 segundos
const FETCH_HEADERS = {
  "Cache-Control": "no-cache",
  "Pragma": "no-cache",
  "If-Modified-Since": "0",
  "User-Agent": "SuperCartola/1.0 DataLake",
};

// =============================================================================
// FUNÇÕES AUXILIARES
// =============================================================================

/**
 * Fetch com timeout
 */
async function fetchWithTimeout(url, timeout = FETCH_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      headers: FETCH_HEADERS,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Busca times na API Cartola por nome
 * @param {string} query - Nome do time para buscar
 * @returns {Promise<Array>} Lista de times encontrados
 */
async function buscarTimesNaAPI(query) {
  const url = `${API_CARTOLA_BASE}/times?q=${encodeURIComponent(query)}`;
  console.log(`[DATA-LAKE] Buscando times: ${url}`);

  const response = await fetchWithTimeout(url);

  if (!response.ok) {
    throw new Error(`API Cartola retornou ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Busca dados completos de um time por ID
 * @param {number} timeId - ID do time
 * @param {number} rodada - Rodada específica (opcional)
 * @returns {Promise<object>} Dados completos do time
 */
async function buscarDadosCompletosTime(timeId, rodada = null) {
  const url = rodada
    ? `${API_CARTOLA_BASE}/time/id/${timeId}/${rodada}`
    : `${API_CARTOLA_BASE}/time/id/${timeId}`;

  console.log(`[DATA-LAKE] Buscando dados completos: ${url}`);

  const response = await fetchWithTimeout(url);

  if (!response.ok) {
    throw new Error(`API Cartola retornou ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

// =============================================================================
// FUNÇÕES PRINCIPAIS - SINCRONIZAÇÃO
// =============================================================================

/**
 * 🔄 SINCRONIZAR COM GLOBO
 *
 * Fluxo:
 * 1. Busca o time na API pública por nome
 * 2. Pega a resposta COMPLETA (atletas, patrimonio, status, etc.)
 * 3. Salva o objeto INTEIRO no CartolaOficialDump (sem filtrar nada)
 * 4. Atualiza o Time (Participante) com dados básicos + referência ao dump
 *
 * @param {string} nomeTime - Nome do time para buscar
 * @param {object} opcoes - { ligaId, rodada, origemTrigger }
 * @returns {Promise<object>} { success, time, dump, message }
 */
export async function sincronizarComGlobo(nomeTime, opcoes = {}) {
  const { ligaId = null, rodada = null, origemTrigger = 'manual' } = opcoes;

  console.log(`[DATA-LAKE] Iniciando sincronização: "${nomeTime}"`);

  // ⛔ SEASON GUARD: Verificar se temporada está ativa
  if (isSeasonFinished()) {
    logBlockedOperation('sincronizarComGlobo', { nomeTime, reason: 'Temporada encerrada' });
    return {
      success: false,
      error: 'season_finished',
      message: SEASON_CONFIG.BLOCK_MESSAGE,
    };
  }

  try {
    // PASSO 1: Buscar time na API
    const resultadoBusca = await buscarTimesNaAPI(nomeTime);

    if (!Array.isArray(resultadoBusca) || resultadoBusca.length === 0) {
      return {
        success: false,
        error: 'not_found',
        message: `Nenhum time encontrado com o nome "${nomeTime}"`,
      };
    }

    // Pegar o primeiro resultado (mais relevante)
    const timeEncontrado = resultadoBusca[0];
    const timeId = timeEncontrado.time_id;

    console.log(`[DATA-LAKE] Time encontrado: ${timeEncontrado.nome} (ID: ${timeId})`);

    // PASSO 2: Buscar dados COMPLETOS do time
    const dadosCompletos = await buscarDadosCompletosTime(timeId, rodada);

    // ⚠️ Verificar se a API retornou dados válidos do time
    if (dadosCompletos.game_over === true && !dadosCompletos.time) {
      console.log(`[DATA-LAKE] ⚠️ API Globo com game_over=true, sem dados do time`);
      return {
        success: false,
        error: 'season_ended',
        message: 'Temporada do Cartola FC encerrada. A API não retorna mais dados de times individuais.',
      };
    }

    // PASSO 3: Salvar dump COMPLETO no Data Lake
    const dump = await CartolaOficialDump.salvarDump({
      time_id: timeId,
      temporada: CURRENT_SEASON,
      rodada: rodada,
      tipo_coleta: rodada ? 'time_rodada' : 'time_info',
      raw_json: dadosCompletos, // ⭐ JSON COMPLETO SEM FILTROS
      meta: {
        url_origem: rodada
          ? `${API_CARTOLA_BASE}/time/id/${timeId}/${rodada}`
          : `${API_CARTOLA_BASE}/time/id/${timeId}`,
        http_status: 200,
        origem_trigger: origemTrigger,
        liga_id: ligaId,
      },
    });

    console.log(`[DATA-LAKE] Dump salvo: ${dump._id} (${dump.meta.payload_size} bytes)`);

    // PASSO 4: Atualizar ou criar Time (Participante) com dados básicos
    const timeData = dadosCompletos.time || dadosCompletos;

    const timeAtualizado = await Time.findOneAndUpdate(
      { id: timeId },
      {
        $set: {
          id: timeId,
          nome_time: timeData.nome || timeData.nome_time || nomeTime,
          nome_cartoleiro: timeData.nome_cartola || timeData.nome_cartoleiro || '',
          url_escudo_png: timeData.url_escudo_png || timeData.url_escudo_svg || '',
          escudo: timeData.url_escudo_png || timeData.url_escudo_svg || '',
          slug: timeData.slug || '',
          assinante: timeData.assinante || false,
          foto_perfil: timeData.foto_perfil || '',
          temporada: CURRENT_SEASON,
          // ⭐ REFERÊNCIA AO DUMP
          ref_dados_oficiais: dump._id,
          ultima_sincronizacao_globo: new Date(),
        },
      },
      {
        upsert: true, // Criar se não existir
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    console.log(`[DATA-LAKE] Time atualizado: ${timeAtualizado.nome_time}`);

    return {
      success: true,
      time: {
        _id: timeAtualizado._id,
        id: timeAtualizado.id,
        nome_time: timeAtualizado.nome_time,
        nome_cartoleiro: timeAtualizado.nome_cartoleiro,
        escudo: timeAtualizado.url_escudo_png,
        slug: timeAtualizado.slug,
        ultima_sincronizacao: timeAtualizado.ultima_sincronizacao_globo,
      },
      dump: {
        _id: dump._id,
        tipo_coleta: dump.tipo_coleta,
        data_coleta: dump.data_coleta,
        payload_size: dump.meta.payload_size,
      },
      message: `Time "${timeAtualizado.nome_time}" sincronizado com sucesso!`,
    };

  } catch (error) {
    console.error(`[DATA-LAKE] Erro na sincronização:`, error.message);

    return {
      success: false,
      error: 'api_error',
      message: `Erro ao sincronizar: ${error.message}`,
    };
  }
}

/**
 * 🔄 SINCRONIZAR TIME POR ID
 *
 * Variante que busca diretamente pelo ID (sem busca por nome)
 *
 * @param {number} timeId - ID do time no Cartola
 * @param {object} opcoes - { ligaId, rodada, origemTrigger }
 * @returns {Promise<object>}
 */
export async function sincronizarPorId(timeId, opcoes = {}) {
  const { ligaId = null, rodada = null, origemTrigger = 'manual' } = opcoes;

  console.log(`[DATA-LAKE] Sincronizando por ID: ${timeId}`);

  // ⛔ SEASON GUARD
  if (isSeasonFinished()) {
    logBlockedOperation('sincronizarPorId', { timeId, reason: 'Temporada encerrada' });
    return {
      success: false,
      error: 'season_finished',
      message: SEASON_CONFIG.BLOCK_MESSAGE,
    };
  }

  try {
    // Buscar dados completos diretamente
    const dadosCompletos = await buscarDadosCompletosTime(timeId, rodada);

    // ⚠️ Verificar se a API retornou dados válidos do time
    if (dadosCompletos.game_over === true && !dadosCompletos.time) {
      console.log(`[DATA-LAKE] ⚠️ API Globo com game_over=true, sem dados do time`);
      return {
        success: false,
        error: 'season_ended',
        message: 'Temporada do Cartola FC encerrada. A API não retorna mais dados de times individuais.',
      };
    }

    // Verificar se há dados do time na resposta
    if (!dadosCompletos.time && !dadosCompletos.nome && !dadosCompletos.time_id) {
      console.log(`[DATA-LAKE] ⚠️ Resposta da API não contém dados do time`);
      return {
        success: false,
        error: 'no_team_data',
        message: 'A API não retornou dados do time. Verifique se o ID está correto.',
      };
    }

    // Salvar dump
    const dump = await CartolaOficialDump.salvarDump({
      time_id: timeId,
      temporada: CURRENT_SEASON,
      rodada: rodada,
      tipo_coleta: rodada ? 'time_rodada' : 'time_info',
      raw_json: dadosCompletos,
      meta: {
        url_origem: rodada
          ? `${API_CARTOLA_BASE}/time/id/${timeId}/${rodada}`
          : `${API_CARTOLA_BASE}/time/id/${timeId}`,
        http_status: 200,
        origem_trigger: origemTrigger,
        liga_id: ligaId,
      },
    });

    // Atualizar Time
    const timeData = dadosCompletos.time || dadosCompletos;

    const timeAtualizado = await Time.findOneAndUpdate(
      { id: timeId },
      {
        $set: {
          id: timeId,
          nome_time: timeData.nome || timeData.nome_time || `Time ${timeId}`,
          nome_cartoleiro: timeData.nome_cartola || timeData.nome_cartoleiro || '',
          url_escudo_png: timeData.url_escudo_png || '',
          escudo: timeData.url_escudo_png || '',
          slug: timeData.slug || '',
          assinante: timeData.assinante || false,
          temporada: CURRENT_SEASON,
          ref_dados_oficiais: dump._id,
          ultima_sincronizacao_globo: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    return {
      success: true,
      time: {
        _id: timeAtualizado._id,
        id: timeAtualizado.id,
        nome_time: timeAtualizado.nome_time,
        nome_cartoleiro: timeAtualizado.nome_cartoleiro,
        escudo: timeAtualizado.url_escudo_png,
      },
      dump: {
        _id: dump._id,
        tipo_coleta: dump.tipo_coleta,
        data_coleta: dump.data_coleta,
        payload_size: dump.meta.payload_size,
      },
      message: `Time ID ${timeId} sincronizado!`,
    };

  } catch (error) {
    console.error(`[DATA-LAKE] Erro:`, error.message);
    return {
      success: false,
      error: 'api_error',
      message: `Erro ao sincronizar: ${error.message}`,
    };
  }
}

// =============================================================================
// FUNÇÕES DE ACESSO AOS DADOS RAW
// =============================================================================

/**
 * 📦 BUSCAR DADOS RAW DE UM PARTICIPANTE
 *
 * Retorna o conteúdo completo do CartolaOficialDump
 *
 * @param {number} timeId - ID do time
 * @param {object} opcoes - { temporada, incluirHistorico, rodada, limit }
 * @returns {Promise<object>}
 */
export async function buscarDadosRaw(timeId, opcoes = {}) {
  const { temporada = CURRENT_SEASON, incluirHistorico = false, rodada = null, limit = 10 } = opcoes;

  console.log(`[DATA-LAKE] Buscando dados raw: time=${timeId}, temporada=${temporada}, rodada=${rodada || 'mais recente'}`);

  try {
    let dumpSelecionado;

    // Se rodada específica foi solicitada, buscar aquela rodada
    if (rodada) {
      dumpSelecionado = await CartolaOficialDump.findOne({
        time_id: timeId,
        temporada: temporada,
        rodada: rodada,
        tipo_coleta: 'time_rodada'
      }).lean();
    } else {
      // Buscar dump mais recente
      dumpSelecionado = await CartolaOficialDump.buscarMaisRecente(timeId, temporada);
    }

    if (!dumpSelecionado) {
      return {
        success: false,
        error: 'not_found',
        message: rodada
          ? `Nenhum dump encontrado para o time ${timeId} na rodada ${rodada}`
          : `Nenhum dump encontrado para o time ${timeId} na temporada ${temporada}`,
      };
    }

    const resultado = {
      success: true,
      time_id: timeId,
      temporada: temporada,
      dump_atual: {
        _id: dumpSelecionado._id,
        tipo_coleta: dumpSelecionado.tipo_coleta,
        rodada: dumpSelecionado.rodada,
        data_coleta: dumpSelecionado.data_coleta,
        raw_json: dumpSelecionado.raw_json, // ⭐ O JSON COMPLETO
        meta: dumpSelecionado.meta,
      },
    };

    // Incluir histórico se solicitado (lista de todas as rodadas disponíveis)
    if (incluirHistorico) {
      const historico = await CartolaOficialDump.find({
        time_id: timeId,
        temporada: temporada,
        tipo_coleta: 'time_rodada'
      })
        .sort({ rodada: -1 })
        .limit(limit)
        .select('_id tipo_coleta rodada data_coleta meta.payload_size raw_json.pontos')
        .lean();

      resultado.historico = historico.map(d => ({
        _id: d._id,
        tipo_coleta: d.tipo_coleta,
        rodada: d.rodada,
        data_coleta: d.data_coleta,
        payload_size: d.meta?.payload_size,
        pontos: d.raw_json?.pontos || 0, // ⭐ Pontos da rodada
      }));

      // Adicionar lista de rodadas disponíveis para o seletor
      resultado.rodadas_disponiveis = historico.map(d => d.rodada).sort((a, b) => a - b);

      // ⭐ Somar pontos de todas as rodadas disponíveis
      resultado.pontos_total_temporada = historico.reduce((acc, d) => acc + (d.raw_json?.pontos || 0), 0);
    }

    return resultado;

  } catch (error) {
    console.error(`[DATA-LAKE] Erro ao buscar dados raw:`, error.message);
    return {
      success: false,
      error: 'database_error',
      message: error.message,
    };
  }
}

/**
 * 📊 ESTATÍSTICAS DO DATA LAKE
 */
export async function estatisticasDataLake(temporada = CURRENT_SEASON) {
  try {
    return await CartolaOficialDump.estatisticas(temporada);
  } catch (error) {
    console.error(`[DATA-LAKE] Erro nas estatísticas:`, error.message);
    return { error: error.message };
  }
}

// =============================================================================
// HANDLERS HTTP (Para usar nas rotas Express)
// =============================================================================

/**
 * POST /api/participantes/sincronizar
 * Body: { nome_time: "Nome do Time", liga_id?: ObjectId, rodada?: number }
 */
export async function httpSincronizarComGlobo(req, res) {
  try {
    const { nome_time, liga_id, rodada } = req.body;

    if (!nome_time || typeof nome_time !== 'string' || nome_time.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'validation',
        message: 'nome_time é obrigatório e deve ter pelo menos 2 caracteres',
      });
    }

    const resultado = await sincronizarComGlobo(nome_time.trim(), {
      ligaId: liga_id,
      rodada: rodada,
      origemTrigger: 'admin_panel',
    });

    const statusCode = resultado.success ? 200 : (resultado.error === 'not_found' ? 404 : 500);
    return res.status(statusCode).json(resultado);

  } catch (error) {
    console.error('[DATA-LAKE HTTP] Erro:', error);
    return res.status(500).json({
      success: false,
      error: 'server_error',
      message: error.message,
    });
  }
}

/**
 * POST /api/participantes/sincronizar/:id
 * Sincroniza diretamente por ID
 */
export async function httpSincronizarPorId(req, res) {
  try {
    const timeId = parseInt(req.params.id);

    if (isNaN(timeId)) {
      return res.status(400).json({
        success: false,
        error: 'validation',
        message: 'ID do time inválido',
      });
    }

    const { liga_id, rodada } = req.body || {};

    const resultado = await sincronizarPorId(timeId, {
      ligaId: liga_id,
      rodada: rodada,
      origemTrigger: 'admin_panel',
    });

    const statusCode = resultado.success ? 200 : 500;
    return res.status(statusCode).json(resultado);

  } catch (error) {
    console.error('[DATA-LAKE HTTP] Erro:', error);
    return res.status(500).json({
      success: false,
      error: 'server_error',
      message: error.message,
    });
  }
}

/**
 * GET /api/data-lake/raw/:id
 * Retorna os dados raw (dump completo) de um participante
 *
 * Query params:
 *   ?temporada=2025    - Temporada (default: atual)
 *   ?historico=true    - Incluir lista de rodadas disponíveis
 *   ?rodada=15         - Buscar rodada específica (1-38)
 *   ?limit=50          - Limite do histórico (default: 10)
 */
export async function httpBuscarDadosRaw(req, res) {
  try {
    const timeId = parseInt(req.params.id);

    if (isNaN(timeId)) {
      return res.status(400).json({
        success: false,
        error: 'validation',
        message: 'ID do time inválido',
      });
    }

    const { temporada, historico, rodada, limit } = req.query;

    const resultado = await buscarDadosRaw(timeId, {
      temporada: temporada ? parseInt(temporada) : CURRENT_SEASON,
      incluirHistorico: historico === 'true' || historico === '1',
      rodada: rodada ? parseInt(rodada) : null,
      limit: limit ? parseInt(limit) : 50, // Aumentado para pegar todas as 38 rodadas
    });

    const statusCode = resultado.success ? 200 : (resultado.error === 'not_found' ? 404 : 500);
    return res.status(statusCode).json(resultado);

  } catch (error) {
    console.error('[DATA-LAKE HTTP] Erro:', error);
    return res.status(500).json({
      success: false,
      error: 'server_error',
      message: error.message,
    });
  }
}

/**
 * GET /api/data-lake/estatisticas
 * Retorna estatísticas do Data Lake
 */
export async function httpEstatisticas(req, res) {
  try {
    const temporada = req.query.temporada ? parseInt(req.query.temporada) : CURRENT_SEASON;
    const stats = await estatisticasDataLake(temporada);
    return res.status(200).json(stats);
  } catch (error) {
    console.error('[DATA-LAKE HTTP] Erro:', error);
    return res.status(500).json({ error: error.message });
  }
}

// =============================================================================
// EXPORT DEFAULT
// =============================================================================
export default {
  sincronizarComGlobo,
  sincronizarPorId,
  buscarDadosRaw,
  estatisticasDataLake,
  httpSincronizarComGlobo,
  httpSincronizarPorId,
  httpBuscarDadosRaw,
  httpEstatisticas,
};
