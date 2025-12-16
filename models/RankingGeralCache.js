
// models/RankingGeralCache.js
import mongoose from "mongoose";
import { CURRENT_SEASON } from "../config/seasons.js";

const RankingGeralCacheSchema = new mongoose.Schema({
  ligaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Liga",
    required: true
  },
  rodadaFinal: {
    type: Number,
    required: true
  },
  // ✅ TEMPORADA - Segregação de dados por ano
  temporada: {
    type: Number,
    required: true,
    default: CURRENT_SEASON,
    index: true,
  },
  ranking: [{
    timeId: { type: Number, required: true },
    nome_cartola: { type: String, default: "N/D" },
    nome_time: { type: String, default: "N/D" },
    escudo: { type: String, default: "" },
    clube_id: { type: Number },
    pontos_totais: { type: Number, default: 0 },
    rodadas_jogadas: { type: Number, default: 0 },
    posicao: { type: Number, required: true }
  }],
  atualizadoEm: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
});

// Índice composto para buscas rápidas (incluindo temporada)
RankingGeralCacheSchema.index({ ligaId: 1, rodadaFinal: 1, temporada: 1 }, { unique: true });

export default mongoose.model("RankingGeralCache", RankingGeralCacheSchema);
