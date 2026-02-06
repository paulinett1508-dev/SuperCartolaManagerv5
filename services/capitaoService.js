// capitaoService.js - Lógica de negócio do Capitão de Luxo
import mongoose from 'mongoose';
import cartolaApiService from './cartolaApiService.js';
import CapitaoCaches from '../models/CapitaoCaches.js';
import Liga from '../models/Liga.js';

const LOG_PREFIX = '[CAPITAO-SERVICE]';

/**
 * Busca mapa de pontuados da rodada atual (parciais ao vivo)
 * @returns {Object} { atletaId: { apelido, pontuacao } }
 */
async function buscarPontuadosRodada() {
  try {
    const response = await cartolaApiService.httpClient.get(
      `${cartolaApiService.baseUrl}/atletas/pontuados`
    );
    if (!response.data || !response.data.atletas) return {};
    return response.data.atletas; // { "68996": { apelido, pontuacao, ... }, ... }
  } catch (error) {
    console.warn(`${LOG_PREFIX} Erro ao buscar pontuados:`, error.message);
    return {};
  }
}

/**
 * Busca dados do capitão em uma rodada específica
 * @param {number} timeId
 * @param {number} rodada
 * @param {Object} pontuadosMap - Mapa de pontuados (para rodada em andamento)
 * @returns {Object} { capitao_id, capitao_nome, pontuacao }
 */
export async function buscarCapitaoRodada(timeId, rodada, pontuadosMap = null) {
  try {
    const escalacao = await cartolaApiService.obterDadosTimeRodada(timeId, rodada);

    if (!escalacao || !escalacao.atletas) {
      return { capitao_id: null, capitao_nome: null, pontuacao: 0 };
    }

    const capitaoId = escalacao.capitao_id;
    if (!capitaoId) {
      return { capitao_id: null, capitao_nome: null, pontuacao: 0 };
    }

    // Buscar atleta na escalação
    const capitao = escalacao.atletas.find(a => a.atletaId === capitaoId);

    if (!capitao) {
      return { capitao_id: capitaoId, capitao_nome: 'Desconhecido', pontuacao: 0 };
    }

    // pontos_num da API é o valor BRUTO → multiplicar por 1.5 (bônus capitão)
    let pontuacao = (capitao.pontos || 0) * 1.5;
    let nome = capitao.nome;
    let jogou = null; // null = rodada finalizada, true/false = parcial

    // Para rodada em andamento: suplementar com pontuados (parciais ao vivo)
    if (pontuadosMap) {
      const pontuado = pontuadosMap[String(capitaoId)];
      if (pontuado) {
        // Capitão já jogou - pontuação bruta x1.5 (bônus capitão)
        pontuacao = (pontuado.pontuacao || 0) * 1.5;
        nome = pontuado.apelido || nome;
        jogou = true;
      } else {
        // Capitão ainda não jogou
        jogou = false;
      }
    }

    return {
      capitao_id: capitaoId,
      capitao_nome: nome,
      pontuacao,
      jogou
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Erro ao buscar capitão rodada ${rodada}:`, error);
    return { capitao_id: null, capitao_nome: null, pontuacao: 0 };
  }
}

/**
 * Calcula estatísticas de capitães para uma temporada
 * @param {number} rodadaFinal - Última rodada a considerar
 * @param {Object} pontuadosMap - Mapa de pontuados para rodada em andamento (opcional)
 * @param {number} rodadaEmAndamento - Número da rodada em andamento (opcional)
 */
export async function calcularEstatisticasCapitao(ligaId, temporada, timeId, rodadaFinal = 38, pontuadosMap = null, rodadaEmAndamento = null) {
  const estatisticas = {
    pontuacao_total: 0,
    rodadas_jogadas: 0,
    melhor_capitao: null,
    pior_capitao: null,
    capitaes_distintos: 0,
    historico_rodadas: []
  };

  const capitaesUsados = new Set();
  let melhorPontos = -Infinity;
  let piorPontos = Infinity;

  // Buscar capitães de todas as rodadas
  for (let rodada = 1; rodada <= rodadaFinal; rodada++) {
    // Passar pontuadosMap apenas na rodada em andamento
    const usarPontuados = (rodada === rodadaEmAndamento) ? pontuadosMap : null;
    const capitao = await buscarCapitaoRodada(timeId, rodada, usarPontuados);

    if (!capitao.capitao_id) continue; // Não escalou

    estatisticas.rodadas_jogadas++;
    estatisticas.pontuacao_total += capitao.pontuacao;
    capitaesUsados.add(capitao.capitao_id);

    // Histórico por rodada
    const isParcial = (rodada === rodadaEmAndamento);
    estatisticas.historico_rodadas.push({
      rodada,
      atleta_nome: capitao.capitao_nome,
      pontuacao: capitao.pontuacao,
      parcial: isParcial,
      jogou: capitao.jogou
    });

    // Melhor capitão
    if (capitao.pontuacao > melhorPontos) {
      melhorPontos = capitao.pontuacao;
      estatisticas.melhor_capitao = {
        rodada,
        atleta_id: capitao.capitao_id,
        atleta_nome: capitao.capitao_nome,
        pontuacao: capitao.pontuacao
      };
    }

    // Pior capitão
    if (capitao.pontuacao < piorPontos) {
      piorPontos = capitao.pontuacao;
      estatisticas.pior_capitao = {
        rodada,
        atleta_id: capitao.capitao_id,
        atleta_nome: capitao.capitao_nome,
        pontuacao: capitao.pontuacao
      };
    }
  }

  estatisticas.capitaes_distintos = capitaesUsados.size;
  estatisticas.media_capitao = estatisticas.rodadas_jogadas > 0
    ? estatisticas.pontuacao_total / estatisticas.rodadas_jogadas
    : 0;

  return estatisticas;
}

/**
 * Consolidar ranking de capitães (incremental ou fim de temporada)
 */
export async function consolidarRankingCapitao(ligaId, temporada, rodadaFinal = 38) {
  console.log(`${LOG_PREFIX} Consolidando ranking Capitão Luxo - Liga ${ligaId}, Temporada ${temporada}, até rodada ${rodadaFinal}`);

  // ✅ FIX: Garantir que ligaId é ObjectId para consistência no cache
  const ligaObjectId = typeof ligaId === 'string' ? new mongoose.Types.ObjectId(ligaId) : ligaId;

  const liga = await Liga.findById(ligaObjectId).lean();
  if (!liga || !liga.participantes) {
    throw new Error('Liga não encontrada');
  }

  // Detectar rodada em andamento e buscar pontuados UMA vez
  let pontuadosMap = null;
  let rodadaEmAndamento = null;
  try {
    const statusResp = await cartolaApiService.httpClient.get(
      `${cartolaApiService.baseUrl}/mercado/status`
    );
    const status = statusResp.data;
    const mercadoFechado = status.status_mercado === 2;
    if (mercadoFechado && status.rodada_atual === rodadaFinal) {
      rodadaEmAndamento = status.rodada_atual;
      console.log(`${LOG_PREFIX} Rodada ${rodadaEmAndamento} em andamento, buscando pontuados parciais...`);
      pontuadosMap = await buscarPontuadosRodada();
      const totalPontuados = Object.keys(pontuadosMap).length;
      console.log(`${LOG_PREFIX} ${totalPontuados} atletas pontuados encontrados`);
    }
  } catch (err) {
    console.warn(`${LOG_PREFIX} Erro ao detectar rodada em andamento:`, err.message);
  }

  const participantes = liga.participantes.filter(p => p.ativo !== false);
  const dadosCapitaes = [];

  for (const participante of participantes) {
    const stats = await calcularEstatisticasCapitao(
      ligaId,
      temporada,
      participante.time_id,
      rodadaFinal,
      pontuadosMap,
      rodadaEmAndamento
    );

    dadosCapitaes.push({
      ligaId: ligaObjectId,
      temporada,
      timeId: participante.time_id,
      nome_cartola: participante.nome_cartola,
      nome_time: participante.nome_time,
      escudo: participante.foto_time,
      clube_id: participante.clube_id,
      ...stats
    });
  }

  // Ordenar por pontuação (descendente)
  dadosCapitaes.sort((a, b) => b.pontuacao_total - a.pontuacao_total);

  // Atribuir posições e premiações
  const config = await import('../config/rules/capitao_luxo.json', { assert: { type: 'json' } });
  const premiacoes = config.default.premiacao;

  dadosCapitaes.forEach((dado, index) => {
    dado.posicao_final = index + 1;

    // Aplicar premiação
    if (index === 0) dado.premiacao_recebida = premiacoes.campeao.valor;
    else if (index === 1) dado.premiacao_recebida = premiacoes.vice.valor;
    else if (index === 2) dado.premiacao_recebida = premiacoes.terceiro.valor;
    else dado.premiacao_recebida = 0;
  });

  // Salvar no cache (usa ObjectId para consistência com buscarRanking)
  await CapitaoCaches.consolidarRanking(ligaObjectId, temporada, dadosCapitaes);

  console.log(`${LOG_PREFIX} ✅ Consolidado: ${dadosCapitaes.length} participantes`);
  return dadosCapitaes;
}

export default {
  buscarCapitaoRodada,
  calcularEstatisticasCapitao,
  consolidarRankingCapitao
};
