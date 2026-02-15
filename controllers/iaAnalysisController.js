/**
 * Controller de Análises IA - Interface Admin
 * Gerencia solicitação e histórico de análises via LLM (Claude)
 */

import { solicitarAnalise, limparCache, estatisticasCache } from '../services/llmService.js';
import AnalisesIA from '../models/AnalisesIA.js';

// ============================================
// SOLICITAR NOVA ANÁLISE
// ============================================
export async function solicitarNovaAnalise(req, res) {
  try {
    const { tipo, contexto, ligaId, timeId, useCache } = req.body;
    const adminEmail = req.session?.admin?.email || 'unknown';

    // Validações
    if (!tipo) {
      return res.status(400).json({
        success: false,
        error: 'Tipo de análise é obrigatório'
      });
    }

    const tiposValidos = [
      'financeiro-auditoria',
      'performance-participante',
      'comportamento-liga',
      'diagnostico-sistema',
      'generico'
    ];

    if (!tiposValidos.includes(tipo)) {
      return res.status(400).json({
        success: false,
        error: `Tipo inválido. Tipos válidos: ${tiposValidos.join(', ')}`
      });
    }

    if (!contexto || typeof contexto !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Contexto é obrigatório e deve ser um objeto'
      });
    }

    // Validar tamanho do contexto (evitar requests muito grandes)
    const contextoStr = JSON.stringify(contexto);
    if (contextoStr.length > 50000) { // ~50KB
      return res.status(400).json({
        success: false,
        error: 'Contexto muito grande (max 50KB)'
      });
    }

    console.log(`[IA-ANALYSIS] Nova solicitação de análise tipo: ${tipo} por ${adminEmail}`);

    // Solicitar análise via LLM Service
    const startTime = Date.now();
    let resultado;
    let analiseDoc;

    try {
      resultado = await solicitarAnalise({
        tipo,
        contexto,
        useCache: useCache !== false // Default true
      });

      // Salvar no MongoDB
      analiseDoc = new AnalisesIA({
        tipo,
        adminEmail,
        contexto,
        promptEnviado: '', // Opcionalmente pode salvar o prompt completo
        resposta: resultado.resposta,
        tokensUsados: resultado.tokensUsados,
        custoEstimado: resultado.custoEstimado,
        tempoResposta: resultado.tempoResposta,
        model: resultado.model,
        fromCache: resultado.fromCache,
        status: 'sucesso',
        ligaId: ligaId || null,
        timeId: timeId || null
      });

      await analiseDoc.save();

      console.log(`[IA-ANALYSIS] Análise concluída em ${Date.now() - startTime}ms`, {
        id: analiseDoc._id,
        tokens: resultado.tokensUsados.total,
        custo: resultado.custoEstimado,
        fromCache: resultado.fromCache
      });

      res.json({
        success: true,
        analise: {
          _id: analiseDoc._id,
          tipo,
          resposta: resultado.resposta,
          tokensUsados: resultado.tokensUsados,
          custoEstimado: resultado.custoEstimado,
          tempoResposta: resultado.tempoResposta,
          fromCache: resultado.fromCache,
          criadoEm: analiseDoc.criadoEm
        },
        rateLimitInfo: req.rateLimitInfo // Inclui info de rate limit
      });

    } catch (llmError) {
      // Erro ao solicitar análise (API falhou)
      console.error('[IA-ANALYSIS] Erro ao solicitar análise:', llmError);

      // Salvar erro no histórico
      analiseDoc = new AnalisesIA({
        tipo,
        adminEmail,
        contexto,
        resposta: '',
        status: 'erro',
        erro: {
          mensagem: llmError.message || 'Erro desconhecido',
          stack: llmError.stack || ''
        },
        ligaId: ligaId || null,
        timeId: timeId || null
      });

      await analiseDoc.save();

      return res.status(500).json({
        success: false,
        error: 'Erro ao processar análise',
        detalhes: llmError.message,
        _id: analiseDoc._id // Retorna ID mesmo com erro para auditoria
      });
    }

  } catch (error) {
    console.error('[IA-ANALYSIS] Erro geral ao solicitar análise:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno ao processar solicitação'
    });
  }
}

// ============================================
// LISTAR HISTÓRICO DE ANÁLISES
// ============================================
export async function listarAnalises(req, res) {
  try {
    const { tipo, adminEmail, ligaId, timeId, dataInicio, dataFim, page = 1, limit = 20 } = req.query;

    // Construir filtro
    const filtro = {};

    if (tipo) filtro.tipo = tipo;
    if (adminEmail) filtro.adminEmail = adminEmail;
    if (ligaId) filtro.ligaId = ligaId;
    if (timeId) filtro.timeId = timeId;

    if (dataInicio || dataFim) {
      filtro.criadoEm = {};
      if (dataInicio) filtro.criadoEm.$gte = new Date(dataInicio);
      if (dataFim) filtro.criadoEm.$lte = new Date(dataFim);
    }

    // Paginação
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [analises, total] = await Promise.all([
      AnalisesIA.find(filtro)
        .sort({ criadoEm: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-erro.stack -contexto') // Omitir stack trace e contexto completo
        .lean(),
      AnalisesIA.countDocuments(filtro)
    ]);

    res.json({
      success: true,
      analises,
      paginacao: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('[IA-ANALYSIS] Erro ao listar análises:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao listar análises'
    });
  }
}

// ============================================
// BUSCAR ANÁLISE POR ID
// ============================================
export async function buscarAnalisePorId(req, res) {
  try {
    const { id } = req.params;

    const analise = await AnalisesIA.findById(id).lean();

    if (!analise) {
      return res.status(404).json({
        success: false,
        error: 'Análise não encontrada'
      });
    }

    res.json({
      success: true,
      analise
    });

  } catch (error) {
    console.error('[IA-ANALYSIS] Erro ao buscar análise:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar análise'
    });
  }
}

// ============================================
// DELETAR ANÁLISE
// ============================================
export async function deletarAnalise(req, res) {
  try {
    const { id } = req.params;
    const adminEmail = req.session?.admin?.email;

    const analise = await AnalisesIA.findById(id);

    if (!analise) {
      return res.status(404).json({
        success: false,
        error: 'Análise não encontrada'
      });
    }

    // Apenas o admin que criou pode deletar (ou super admin)
    if (analise.adminEmail !== adminEmail && !req.session?.admin?.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Você não tem permissão para deletar esta análise'
      });
    }

    await AnalisesIA.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Análise deletada com sucesso'
    });

  } catch (error) {
    console.error('[IA-ANALYSIS] Erro ao deletar análise:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao deletar análise'
    });
  }
}

// ============================================
// AVALIAR ANÁLISE (Feedback)
// ============================================
export async function avaliarAnalise(req, res) {
  try {
    const { id } = req.params;
    const { util, comentario } = req.body;

    if (typeof util !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Campo "util" é obrigatório (boolean)'
      });
    }

    const analise = await AnalisesIA.findByIdAndUpdate(
      id,
      {
        $set: {
          'avaliacao.util': util,
          'avaliacao.comentario': comentario || '',
          'avaliacao.avaliadoEm': new Date()
        }
      },
      { new: true }
    );

    if (!analise) {
      return res.status(404).json({
        success: false,
        error: 'Análise não encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Avaliação registrada',
      avaliacao: analise.avaliacao
    });

  } catch (error) {
    console.error('[IA-ANALYSIS] Erro ao avaliar análise:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao avaliar análise'
    });
  }
}

// ============================================
// ESTATÍSTICAS DE USO
// ============================================
export async function obterEstatisticas(req, res) {
  try {
    const { dataInicio, dataFim } = req.query;

    const stats = await AnalisesIA.estatisticas(dataInicio, dataFim);
    const cacheStats = estatisticasCache();
    const rankingAdmins = await AnalisesIA.rankingAdmins(dataInicio, dataFim);

    res.json({
      success: true,
      estatisticas: {
        ...stats,
        cache: cacheStats,
        rankingAdmins
      }
    });

  } catch (error) {
    console.error('[IA-ANALYSIS] Erro ao obter estatísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao obter estatísticas'
    });
  }
}

// ============================================
// LIMPAR CACHE
// ============================================
export async function limparCacheAnalises(req, res) {
  try {
    const { tipo } = req.body;

    // Apenas super admins em produção
    if (process.env.NODE_ENV === 'production' && !req.session?.admin?.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Operação permitida apenas para super admins'
      });
    }

    limparCache(tipo || null);

    res.json({
      success: true,
      message: tipo ? `Cache limpo para tipo: ${tipo}` : 'Cache completamente limpo'
    });

  } catch (error) {
    console.error('[IA-ANALYSIS] Erro ao limpar cache:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao limpar cache'
    });
  }
}

export default {
  solicitarNovaAnalise,
  listarAnalises,
  buscarAnalisePorId,
  deletarAnalise,
  avaliarAnalise,
  obterEstatisticas,
  limparCacheAnalises
};
