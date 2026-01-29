// capitaoController.js - Controller do módulo Capitão de Luxo
import capitaoService from '../services/capitaoService.js';
import CapitaoCaches from '../models/CapitaoCaches.js';
import { buscarRankingParcial } from '../services/parciaisRankingService.js';

/**
 * GET /api/capitao/:ligaId/ranking
 * Retorna ranking consolidado de capitães
 */
export async function getRankingCapitao(req, res) {
  try {
    const { ligaId } = req.params;
    const temporada = parseInt(req.query.temporada) || new Date().getFullYear();

    if (!ligaId) {
      return res.status(400).json({ success: false, error: 'ligaId obrigatório' });
    }

    const ranking = await CapitaoCaches.buscarRanking(ligaId, temporada);

    res.json({
      success: true,
      ranking,
      temporada,
      total: ranking.length
    });
  } catch (error) {
    console.error('[CAPITAO-CONTROLLER] Erro getRankingCapitao:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/capitao/:ligaId/ranking-live
 * Retorna ranking de capitães em tempo real (parciais)
 * REUTILIZA parciaisRankingService
 */
export async function getRankingCapitaoLive(req, res) {
  try {
    const { ligaId } = req.params;

    if (!ligaId) {
      return res.status(400).json({ success: false, error: 'ligaId obrigatório' });
    }

    // Buscar parciais (já inclui capitao_id)
    const parciais = await buscarRankingParcial(ligaId);

    if (!parciais || !parciais.disponivel) {
      return res.json({
        success: false,
        disponivel: false,
        motivo: parciais?.motivo || 'sem_dados'
      });
    }

    // Extrair pontuação dos capitães (já vem dobrada)
    const rankingCapitaes = parciais.ranking.map(time => ({
      timeId: time.timeId,
      nome_cartola: time.nome_cartola,
      nome_time: time.nome_time,
      escudo: time.escudo,
      pontos_capitao: time.pontos, // Simplificado: usar pontos totais parciais
      // TODO: Calcular APENAS pontos do capitão (requer detalhamento)
    }));

    // Ordenar por pontos de capitão
    rankingCapitaes.sort((a, b) => b.pontos_capitao - a.pontos_capitao);

    res.json({
      success: true,
      disponivel: true,
      ranking: rankingCapitaes,
      rodada: parciais.rodada,
      atualizado_em: parciais.atualizado_em
    });
  } catch (error) {
    console.error('[CAPITAO-CONTROLLER] Erro getRankingCapitaoLive:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/capitao/:ligaId/consolidar
 * Consolidar ranking de capitães (admin only - fim temporada)
 */
export async function consolidarCapitaoTemporada(req, res) {
  try {
    const { ligaId } = req.params;
    const temporada = parseInt(req.body.temporada) || new Date().getFullYear();

    if (!ligaId) {
      return res.status(400).json({ success: false, error: 'ligaId obrigatório' });
    }

    const ranking = await capitaoService.consolidarRankingCapitao(ligaId, temporada);

    res.json({
      success: true,
      message: 'Ranking consolidado com sucesso',
      ranking,
      temporada
    });
  } catch (error) {
    console.error('[CAPITAO-CONTROLLER] Erro consolidarCapitaoTemporada:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export default {
  getRankingCapitao,
  getRankingCapitaoLive,
  consolidarCapitaoTemporada
};
