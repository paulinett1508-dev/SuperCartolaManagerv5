// ✅ models/CartolaOficialDump.js - Data Lake dos Participantes
// O "Cofre" que armazena payloads completos da API Cartola FC sem filtros
import mongoose from "mongoose";
import { CURRENT_SEASON } from "../config/seasons.js";

/**
 * CartolaOficialDump Schema
 *
 * Objetivo: Armazenar o payload EXATO recebido da API da Globo, sem filtros.
 * Este é o nosso "Data Lake" para backup histórico completo de cada time.
 *
 * Regras:
 * - NUNCA filtrar dados antes de salvar
 * - SEMPRE armazenar o JSON completo em raw_json
 * - Manter histórico perpétuo (não deletar dumps antigos)
 */
const CartolaOficialDumpSchema = new mongoose.Schema(
  {
    // ID do time no Cartola FC (número único da Globo)
    time_id: {
      type: Number,
      required: true,
      index: true,
    },

    // Temporada da coleta (2025, 2026, etc.)
    temporada: {
      type: Number,
      required: true,
      default: CURRENT_SEASON,
      index: true,
    },

    // Rodada em que foi coletado (opcional, para dumps de rodada específica)
    rodada: {
      type: Number,
      default: null,
      index: true,
    },

    // Tipo de endpoint da API que originou o dump
    tipo_coleta: {
      type: String,
      enum: [
        'time_info',          // /time/id/{id} - Info básica do time
        'time_rodada',        // /time/id/{id}/{rodada} - Escalação + atletas
        'time_pontuacao',     // /time/mercado/{id}/pontuacao/{rodada}
        'busca_times',        // /times?q={query} - Resultado de busca
        'mercado_selecao',    // /mercado/selecao - Mercado atual
        'parciais',           // /mercado/selecao/parciais
        'outros'              // Qualquer outro endpoint
      ],
      default: 'time_info',
    },

    // Data/hora exata da coleta
    data_coleta: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // ⭐ O PAYLOAD COMPLETO - Aceita QUALQUER estrutura
    raw_json: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    // Metadados adicionais da coleta
    meta: {
      // URL original da requisição
      url_origem: { type: String, default: '' },

      // Status HTTP da resposta
      http_status: { type: Number, default: 200 },

      // Tamanho aproximado do payload (bytes)
      payload_size: { type: Number, default: 0 },

      // Quem/O que disparou a coleta
      origem_trigger: {
        type: String,
        enum: ['manual', 'sync_automatico', 'processamento_rodada', 'admin_panel'],
        default: 'manual'
      },

      // ID da liga associada (se aplicável)
      liga_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Liga', default: null },
    },
  },
  {
    timestamps: true,
    collection: "cartola_oficial_dumps", // Nome explícito da collection
    strict: false, // ⚠️ CRÍTICO: Permite campos extras em raw_json
  }
);

// =============================================================================
// ÍNDICES COMPOSTOS PARA QUERIES OTIMIZADAS
// =============================================================================

// Buscar todos os dumps de um time em uma temporada
CartolaOficialDumpSchema.index({ time_id: 1, temporada: 1 });

// Buscar dump mais recente de um time
CartolaOficialDumpSchema.index({ time_id: 1, data_coleta: -1 });

// Buscar dumps por tipo e temporada
CartolaOficialDumpSchema.index({ tipo_coleta: 1, temporada: 1 });

// Buscar dumps de uma rodada específica
CartolaOficialDumpSchema.index({ temporada: 1, rodada: 1, data_coleta: -1 });

// =============================================================================
// MÉTODOS ESTÁTICOS
// =============================================================================

/**
 * Busca o dump mais recente de um time
 * @param {number} timeId - ID do time
 * @param {number} temporada - Temporada (opcional, default: atual)
 * @returns {Promise<Document|null>}
 */
CartolaOficialDumpSchema.statics.buscarMaisRecente = async function(timeId, temporada = CURRENT_SEASON) {
  return this.findOne({
    time_id: timeId,
    temporada
  }).sort({ data_coleta: -1 }).lean();
};

/**
 * Busca todos os dumps de um time (histórico completo)
 * @param {number} timeId - ID do time
 * @param {object} opcoes - Opções { limit, temporada }
 * @returns {Promise<Document[]>}
 */
CartolaOficialDumpSchema.statics.buscarHistorico = async function(timeId, opcoes = {}) {
  const query = { time_id: timeId };

  if (opcoes.temporada) {
    query.temporada = opcoes.temporada;
  }

  return this.find(query)
    .sort({ data_coleta: -1 })
    .limit(opcoes.limit || 50)
    .lean();
};

/**
 * Salva um novo dump (com cálculo automático de tamanho)
 * @param {object} dados - { time_id, raw_json, tipo_coleta, ... }
 * @returns {Promise<Document>}
 */
CartolaOficialDumpSchema.statics.salvarDump = async function(dados) {
  // Calcular tamanho do payload
  const payloadSize = JSON.stringify(dados.raw_json).length;

  const dump = new this({
    ...dados,
    meta: {
      ...dados.meta,
      payload_size: payloadSize,
    }
  });

  return dump.save();
};

/**
 * Conta dumps por temporada (para estatísticas)
 * @param {number} temporada
 * @returns {Promise<object>}
 */
CartolaOficialDumpSchema.statics.estatisticas = async function(temporada = CURRENT_SEASON) {
  const [total, porTipo, timesUnicos] = await Promise.all([
    this.countDocuments({ temporada }),
    this.aggregate([
      { $match: { temporada } },
      { $group: { _id: '$tipo_coleta', count: { $sum: 1 } } }
    ]),
    this.distinct('time_id', { temporada })
  ]);

  return {
    temporada,
    total_dumps: total,
    times_unicos: timesUnicos.length,
    por_tipo: porTipo.reduce((acc, { _id, count }) => {
      acc[_id] = count;
      return acc;
    }, {})
  };
};

// =============================================================================
// EXPORT
// =============================================================================
const CartolaOficialDump = mongoose.model("CartolaOficialDump", CartolaOficialDumpSchema);

export default CartolaOficialDump;
