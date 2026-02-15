/**
 * Model: AnalisesIA
 * Armazena histórico completo de análises solicitadas via LLM
 *
 * Propósito:
 * - Auditoria de uso da API (custos, frequência)
 * - Cache inteligente de análises similares
 * - Histórico para revisão e aprendizado
 */

import mongoose from 'mongoose';

const analisesIASchema = new mongoose.Schema({
  // Identificação
  tipo: {
    type: String,
    required: true,
    enum: [
      'financeiro-auditoria',
      'performance-participante',
      'comportamento-liga',
      'diagnostico-sistema',
      'generico'
    ],
    index: true
  },

  // Admin solicitante
  adminEmail: {
    type: String,
    required: true,
    index: true
  },

  // Contexto da análise (sanitizado)
  contexto: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },

  // Prompt enviado (para auditoria)
  promptEnviado: {
    type: String,
    default: ''
  },

  // Resposta do LLM
  resposta: {
    type: String,
    required: true
  },

  // Métricas de uso
  tokensUsados: {
    input: { type: Number, default: 0 },
    output: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },

  custoEstimado: {
    type: Number, // Em USD
    default: 0,
    index: true
  },

  tempoResposta: {
    type: Number, // Em milissegundos
    default: 0
  },

  // Modelo usado
  model: {
    type: String,
    default: 'claude-3-5-sonnet-20241022'
  },

  // Cache
  fromCache: {
    type: Boolean,
    default: false
  },

  // Status
  status: {
    type: String,
    enum: ['sucesso', 'erro', 'timeout'],
    default: 'sucesso'
  },

  // Erro (se houver)
  erro: {
    mensagem: { type: String, default: '' },
    stack: { type: String, default: '' }
  },

  // Metadados
  ligaId: {
    type: String,
    default: null,
    index: true
  },

  timeId: {
    type: String,
    default: null,
    index: true
  },

  // Avaliação (feedback do admin)
  avaliacao: {
    util: { type: Boolean, default: null },
    comentario: { type: String, default: '' },
    avaliadoEm: { type: Date, default: null }
  }

}, {
  timestamps: {
    createdAt: 'criadoEm',
    updatedAt: 'atualizadoEm'
  }
});

// Indexes para queries frequentes

// Buscar análises de um admin
analisesIASchema.index({ adminEmail: 1, criadoEm: -1 });

// Buscar por tipo e data
analisesIASchema.index({ tipo: 1, criadoEm: -1 });

// Buscar por liga/time
analisesIASchema.index({ ligaId: 1, criadoEm: -1 });
analisesIASchema.index({ timeId: 1, criadoEm: -1 });

// Análise de custos (aggregations)
analisesIASchema.index({ custoEstimado: -1, criadoEm: -1 });

// Método estático: buscar análises de um período
analisesIASchema.statics.buscarPorPeriodo = async function(dataInicio, dataFim, filtros = {}) {
  const query = {
    criadoEm: {
      $gte: new Date(dataInicio),
      $lte: new Date(dataFim)
    },
    ...filtros
  };

  return this.find(query)
    .sort({ criadoEm: -1 })
    .lean();
};

// Método estático: estatísticas de uso
analisesIASchema.statics.estatisticas = async function(dataInicio, dataFim) {
  const match = dataInicio && dataFim ? {
    criadoEm: {
      $gte: new Date(dataInicio),
      $lte: new Date(dataFim)
    }
  } : {};

  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalAnalises: { $sum: 1 },
        totalTokens: { $sum: '$tokensUsados.total' },
        custoTotal: { $sum: '$custoEstimado' },
        tempoMedio: { $avg: '$tempoResposta' },
        cachadas: {
          $sum: { $cond: ['$fromCache', 1, 0] }
        },
        sucesso: {
          $sum: { $cond: [{ $eq: ['$status', 'sucesso'] }, 1, 0] }
        },
        erro: {
          $sum: { $cond: [{ $eq: ['$status', 'erro'] }, 1, 0] }
        }
      }
    }
  ]);

  if (stats.length === 0) {
    return {
      totalAnalises: 0,
      totalTokens: 0,
      custoTotal: 0,
      tempoMedio: 0,
      cachadas: 0,
      sucesso: 0,
      erro: 0,
      taxaSucesso: 0,
      taxaCache: 0
    };
  }

  const result = stats[0];
  return {
    ...result,
    taxaSucesso: result.totalAnalises > 0 ? (result.sucesso / result.totalAnalises * 100).toFixed(2) : 0,
    taxaCache: result.totalAnalises > 0 ? (result.cachadas / result.totalAnalises * 100).toFixed(2) : 0,
    custoMedio: result.totalAnalises > 0 ? (result.custoTotal / result.totalAnalises).toFixed(4) : 0
  };
};

// Método estático: buscar análises similares (para cache)
analisesIASchema.statics.buscarSimilar = async function(tipo, contexto, maxIdade = 3600000) {
  const dataLimite = new Date(Date.now() - maxIdade); // 1 hora por padrão

  return this.findOne({
    tipo,
    contexto,
    status: 'sucesso',
    criadoEm: { $gte: dataLimite }
  })
  .sort({ criadoEm: -1 })
  .lean();
};

// Método estático: ranking de admins por uso
analisesIASchema.statics.rankingAdmins = async function(dataInicio, dataFim) {
  const match = dataInicio && dataFim ? {
    criadoEm: {
      $gte: new Date(dataInicio),
      $lte: new Date(dataFim)
    }
  } : {};

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$adminEmail',
        totalAnalises: { $sum: 1 },
        custoTotal: { $sum: '$custoEstimado' },
        tokensTotal: { $sum: '$tokensUsados.total' }
      }
    },
    { $sort: { totalAnalises: -1 } },
    { $limit: 10 }
  ]);
};

const AnalisesIA = mongoose.model('AnalisesIA', analisesIASchema);

export default AnalisesIA;
