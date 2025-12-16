// ✅ models/Time.js - Schema Mongoose para Times
import mongoose from "mongoose";
import { CURRENT_SEASON } from "../config/seasons.js";

const timeSchema = new mongoose.Schema(
  {
    // ID do time no Cartola FC (número único)
    id: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },

    // Nome do time
    nome_time: {
      type: String,
      required: true,
    },

    // Nome do cartoleiro (dono do time)
    nome_cartoleiro: {
      type: String,
      default: "",
    },

    // Aliases para compatibilidade
    nome: {
      type: String,
      default: "",
    },

    nome_cartola: {
      type: String,
      default: "",
    },

    // URL do escudo
    url_escudo_png: {
      type: String,
      default: "",
    },

    // URL do escudo (campo alternativo)
    escudo: {
      type: String,
      default: "",
    },

    // Slug do time
    slug: {
      type: String,
      default: "",
    },

    // ID da liga (se associado)
    liga_id: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // Status do participante
    ativo: {
      type: Boolean,
      default: true,
    },

    // Rodada em que desistiu (se inativo)
    rodada_desistencia: {
      type: Number,
      default: null,
    },

    // Senha de acesso (para funcionalidades específicas)
    senha_acesso: {
      type: String,
      default: null,
    },

    // Assinante Cartola PRO
    assinante: {
      type: Boolean,
      default: false,
    },

    // Foto do perfil
    foto_perfil: {
      type: String,
      default: "",
    },

    // Dados extras do Cartola (flexível)
    dados_cartola: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // ✅ TEMPORADA - Segregação de dados por ano
    temporada: {
      type: Number,
      required: true,
      default: CURRENT_SEASON,
      index: true,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt automáticos
    collection: "times", // Nome da coleção no MongoDB
  },
);

// ✅ Índices para performance
timeSchema.index({ liga_id: 1 });
timeSchema.index({ ativo: 1 });
timeSchema.index({ id: 1, liga_id: 1 });

// ✅ Virtual para compatibilidade
timeSchema.virtual("time_id").get(function () {
  return this.id;
});

// ✅ Virtuals de nome para compatibilidade bidirecional
timeSchema.virtual("nome_cartola_compat").get(function () {
  return this.nome_cartoleiro || this.nome_cartola;
});

timeSchema.virtual("nome_compat").get(function () {
  return this.nome_time || this.nome;
});

// ✅ Garantir que virtuals apareçam no JSON
timeSchema.set("toJSON", { virtuals: true });
timeSchema.set("toObject", { virtuals: true });

const Time = mongoose.model("Time", timeSchema);

export default Time;
