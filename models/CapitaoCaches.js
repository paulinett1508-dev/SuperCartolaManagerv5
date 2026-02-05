// CapitaoCaches.js - Schema de cache consolidado do ranking de capitães
import mongoose from 'mongoose';

const capitaoCachesSchema = new mongoose.Schema({
  ligaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Liga', required: true, index: true },
  temporada: { type: Number, required: true, index: true },
  timeId: { type: Number, required: true, index: true },

  // Dados do participante
  nome_cartola: String,
  nome_time: String,
  escudo: String,
  clube_id: Number,

  // Estatísticas de capitães
  pontuacao_total: { type: Number, default: 0 },
  rodadas_jogadas: { type: Number, default: 0 },
  media_capitao: { type: Number, default: 0 },

  melhor_capitao: {
    rodada: Number,
    atleta_id: Number,
    atleta_nome: String,
    pontuacao: Number
  },

  pior_capitao: {
    rodada: Number,
    atleta_id: Number,
    atleta_nome: String,
    pontuacao: Number
  },

  capitaes_distintos: { type: Number, default: 0 },

  // Histórico por rodada
  historico_rodadas: [{
    rodada: Number,
    atleta_nome: String,
    pontuacao: Number,
    parcial: { type: Boolean, default: false },
    jogou: { type: Boolean, default: null }
  }],

  // Posição final
  posicao_final: Number,
  premiacao_recebida: { type: Number, default: 0 },

  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Índice composto para query rápida
capitaoCachesSchema.index({ ligaId: 1, temporada: 1, timeId: 1 }, { unique: true });
capitaoCachesSchema.index({ ligaId: 1, temporada: 1, pontuacao_total: -1 }); // Ranking

// Métodos estáticos
capitaoCachesSchema.statics.buscarRanking = async function(ligaId, temporada) {
  return this.find({ ligaId, temporada })
    .sort({ pontuacao_total: -1 })
    .lean();
};

capitaoCachesSchema.statics.consolidarRanking = async function(ligaId, temporada, dadosCapitaes) {
  // Atualizar ou criar documentos
  const bulkOps = dadosCapitaes.map(dado => ({
    updateOne: {
      filter: { ligaId, temporada, timeId: dado.timeId },
      update: { $set: { ...dado, updatedAt: new Date() } },
      upsert: true
    }
  }));

  if (bulkOps.length > 0) {
    await this.bulkWrite(bulkOps);
  }

  return this.buscarRanking(ligaId, temporada);
};

export default mongoose.model('CapitaoCaches', capitaoCachesSchema);
