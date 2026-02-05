// capitaoService.js - Lógica de negócio do Capitão de Luxo
import cartolaApiService from './cartolaApiService.js';
import CapitaoCaches from '../models/CapitaoCaches.js';
import Liga from '../models/Liga.js';

const LOG_PREFIX = '[CAPITAO-SERVICE]';

/**
 * Busca dados do capitão em uma rodada específica
 * @returns {Object} { capitao_id, capitao_nome, pontuacao }
 */
export async function buscarCapitaoRodada(timeId, rodada) {
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

    // Pontuação já vem dobrada pela API Cartola (capitão x2)
    return {
      capitao_id: capitaoId,
      capitao_nome: capitao.nome,
      pontuacao: capitao.pontos || 0
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Erro ao buscar capitão rodada ${rodada}:`, error);
    return { capitao_id: null, capitao_nome: null, pontuacao: 0 };
  }
}

/**
 * Calcula estatísticas de capitães para uma temporada
 * REUTILIZA parciaisRankingService.calcularPontuacaoTime (extrai capitao_id)
 */
export async function calcularEstatisticasCapitao(ligaId, temporada, timeId, rodadaFinal = 38) {
  const estatisticas = {
    pontuacao_total: 0,
    rodadas_jogadas: 0,
    melhor_capitao: null,
    pior_capitao: null,
    capitaes_distintos: 0
  };

  const capitaesUsados = new Set();
  let melhorPontos = -Infinity;
  let piorPontos = Infinity;

  // Buscar capitães de todas as rodadas
  for (let rodada = 1; rodada <= rodadaFinal; rodada++) {
    const capitao = await buscarCapitaoRodada(timeId, rodada);

    if (!capitao.capitao_id) continue; // Não escalou

    estatisticas.rodadas_jogadas++;
    estatisticas.pontuacao_total += capitao.pontuacao;
    capitaesUsados.add(capitao.capitao_id);

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
 * @param {string} ligaId - ID da liga
 * @param {number} temporada - Ano da temporada
 * @param {number} rodadaFinal - Rodada final a consolidar (default: 38)
 */
export async function consolidarRankingCapitao(ligaId, temporada, rodadaFinal = 38) {
  console.log(`${LOG_PREFIX} Consolidando ranking Capitão Luxo - Liga ${ligaId}, Temporada ${temporada}, até rodada ${rodadaFinal}`);

  const liga = await Liga.findById(ligaId).lean();
  if (!liga || !liga.participantes) {
    throw new Error('Liga não encontrada');
  }

  const participantes = liga.participantes.filter(p => p.ativo !== false);
  const dadosCapitaes = [];

  for (const participante of participantes) {
    const stats = await calcularEstatisticasCapitao(
      ligaId,
      temporada,
      participante.time_id,
      rodadaFinal
    );

    dadosCapitaes.push({
      ligaId,
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

  // Salvar no cache
  await CapitaoCaches.consolidarRanking(ligaId, temporada, dadosCapitaes);

  console.log(`${LOG_PREFIX} ✅ Consolidado: ${dadosCapitaes.length} participantes`);
  return dadosCapitaes;
}

export default {
  buscarCapitaoRodada,
  calcularEstatisticasCapitao,
  consolidarRankingCapitao
};
