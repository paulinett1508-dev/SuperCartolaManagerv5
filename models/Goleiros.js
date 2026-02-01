// models/Goleiros.js - VERSÃO CORRIGIDA
import mongoose from "mongoose";
import { CURRENT_SEASON } from "../config/seasons.js";

const goleirosSchema = new mongoose.Schema(
  {
    ligaId: {
      type: String,
      required: true,
      index: true,
    },
    // ✅ TEMPORADA - Segregação de dados por ano
    temporada: {
      type: Number,
      required: true,
      default: CURRENT_SEASON,
      index: true,
    },
    participanteId: {
      type: Number,
      required: true,
      index: true,
    },
    participanteNome: {
      type: String,
      required: true,
    },
    rodada: {
      type: Number,
      required: true,
      index: true,
    },
    goleiroId: {
      type: Number,
      required: false, // ← MUDANÇA: permite null quando sem goleiro
      default: null,
    },
    goleiroNome: {
      type: String,
      required: true,
      default: "Sem goleiro",
    },
    goleiroClube: {
      type: String,
      required: true,
      default: "-",
    },
    pontos: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: ["escalado", "banco", "sem_goleiro"],
      default: "sem_goleiro",
    },
    dataColeta: {
      type: Date,
      default: Date.now,
    },
    rodadaConcluida: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

// Índices compostos para otimização
goleirosSchema.index({ ligaId: 1, temporada: 1, rodada: 1 });
goleirosSchema.index({ ligaId: 1, participanteId: 1, rodada: 1 });
goleirosSchema.index({ ligaId: 1, temporada: 1, rodadaConcluida: 1 });

// Método estático para buscar ranking (v3.0: filtro temporada obrigatório)
goleirosSchema.statics.buscarRanking = async function (
  ligaId,
  rodadaInicio = 1,
  rodadaFim = null,
  temporada = null,
) {
  const matchQuery = {
    ligaId,
    temporada: temporada || CURRENT_SEASON,
    rodadaConcluida: true,
    rodada: { $gte: rodadaInicio },
  };

  if (rodadaFim) {
    matchQuery.rodada.$lte = rodadaFim;
  }

  return await this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: {
          participanteId: "$participanteId",
          participanteNome: "$participanteNome",
        },
        pontosTotais: { $sum: "$pontos" },
        rodadasJogadas: { $sum: 1 },
        mediaPontos: { $avg: "$pontos" },
        melhorRodada: { $max: "$pontos" },
        piorRodada: { $min: "$pontos" },
        ultimaRodada: { $last: "$$ROOT" },
      },
    },
    {
      $project: {
        _id: 0,
        participanteId: "$_id.participanteId",
        participanteNome: "$_id.participanteNome",
        pontosTotais: { $round: ["$pontosTotais", 2] },
        mediaPontos: { $round: ["$mediaPontos", 2] },
        rodadasJogadas: 1,
        melhorRodada: 1,
        piorRodada: 1,
        ultimaRodada: {
          rodada: "$ultimaRodada.rodada",
          goleiroNome: "$ultimaRodada.goleiroNome",
          goleiroClube: "$ultimaRodada.goleiroClube",
          pontos: "$ultimaRodada.pontos",
        },
      },
    },
    { $sort: { pontosTotais: -1 } },
  ]);
};

// Método estático para obter última rodada concluída (v3.0: filtro temporada)
goleirosSchema.statics.obterUltimaRodadaConcluida = async function (ligaId, temporada = null) {
  const resultado = await this.findOne({
    ligaId,
    temporada: temporada || CURRENT_SEASON,
    rodadaConcluida: true,
  })
    .sort({ rodada: -1 })
    .select("rodada");

  return resultado ? resultado.rodada : 0;
};

// Método estático para verificar se dados existem
goleirosSchema.statics.verificarDadosExistentes = async function (
  ligaId,
  participanteId,
  rodada,
) {
  return await this.findOne({ ligaId, participanteId, rodada });
};

export default mongoose.model("Goleiros", goleirosSchema);
