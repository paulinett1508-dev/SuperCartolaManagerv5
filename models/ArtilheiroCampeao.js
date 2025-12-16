import mongoose from "mongoose";
import { CURRENT_SEASON } from "../config/seasons.js";

const ArtilheiroCampeaoSchema = new mongoose.Schema(
  {
    ligaId: { type: String, required: true, index: true },
    rodadaAtual: { type: Number, required: true },
    // ✅ TEMPORADA - Segregação de dados por ano
    temporada: {
      type: Number,
      required: true,
      default: CURRENT_SEASON,
      index: true,
    },
    timestamp: { type: Date, default: Date.now },
    dados: [
      {
        timeId: { type: Number, required: true },
        nomeCartoleiro: { type: String, required: true },
        nomeTime: { type: String, required: true },
        escudo: { type: String },
        golsPro: { type: Number, default: 0 },
        golsContra: { type: Number, default: 0 },
        saldoGols: { type: Number, default: 0 },
        pontosRankingGeral: { type: Number, default: 0 },
        posicaoRanking: { type: Number, default: 999 },
        rodadasProcessadas: { type: Number, default: 0 },
        detalhePorRodada: {
          type: Map,
          of: {
            golsPro: { type: Number, default: 0 },
            golsContra: { type: Number, default: 0 },
            jogadores: [String], // Pode ser ajustado para um schema mais detalhado se necessário
          },
        },
      },
    ],
  },
  { timestamps: true },
);

// Índice único por liga e temporada
ArtilheiroCampeaoSchema.index({ ligaId: 1, temporada: 1 }, { unique: true });

const ArtilheiroCampeao = mongoose.model(
  "ArtilheiroCampeao",
  ArtilheiroCampeaoSchema,
);
export default ArtilheiroCampeao;
