// models/Rodada.js

import mongoose from "mongoose";
import { CURRENT_SEASON } from "../config/seasons.js";

const RodadaSchema = new mongoose.Schema({
  ligaId: { type: mongoose.Schema.Types.ObjectId, ref: "Liga", required: true },
  // ✅ TEMPORADA - Segregação de dados por ano
  temporada: {
    type: Number,
    required: true,
    default: CURRENT_SEASON,
    index: true,
  },
  rodada: { type: Number, required: true },
  timeId: { type: Number, required: true },
  nome_cartola: { type: String, default: "N/D" },
  nome_time: { type: String, default: "N/D" },
  escudo: { type: String, default: "" },
  clube_id: { type: Number }, // ID do clube do coração
  escudo_time_do_coracao: { type: String }, // URL do escudo 30x30
  pontos: { type: Number, default: 0 },
  rodadaNaoJogada: { type: Boolean, default: false },

  // ✅ NOVOS CAMPOS - Calculados pelo backend
  posicao: { type: Number }, // Posição no ranking (considerando ativos)
  valorFinanceiro: { type: Number, default: 0 }, // Valor de bônus/ônus
  totalParticipantesAtivos: { type: Number }, // Total de ativos nesta rodada

  // ✅ v3.1: Escalação completa para fallback offline (Campinho)
  atletas: [{
    atleta_id: { type: Number },
    apelido: { type: String },
    posicao_id: { type: Number },
    clube_id: { type: Number },
    pontos_num: { type: Number },
    status_id: { type: Number }, // 2 = reserva, outros = titular
  }],
  capitao_id: { type: Number },
  reserva_luxo_id: { type: Number },
});

// ✅ Índice composto único COM temporada (multi-temporada)
RodadaSchema.index({ ligaId: 1, rodada: 1, timeId: 1, temporada: 1 }, { unique: true });

export default mongoose.model("Rodada", RodadaSchema);
