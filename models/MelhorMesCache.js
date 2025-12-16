// models/MelhorMesCache.js
import mongoose from "mongoose";
import { CURRENT_SEASON } from "../config/seasons.js";

const LOG_PREFIX = "[MELHOR-MES-CACHE]";

// =====================================================================
// CONFIGURAÇÃO DAS EDIÇÕES (fonte única de verdade)
// =====================================================================
export const MELHOR_MES_EDICOES = [
    { id: 1, nome: "Edição 01", inicio: 1, fim: 6 },
    { id: 2, nome: "Edição 02", inicio: 7, fim: 10 },
    { id: 3, nome: "Edição 03", inicio: 11, fim: 17 },
    { id: 4, nome: "Edição 04", inicio: 18, fim: 22 },
    { id: 5, nome: "Edição 05", inicio: 23, fim: 26 },
    { id: 6, nome: "Edição 06", inicio: 27, fim: 30 },
    { id: 7, nome: "Edição 07", inicio: 31, fim: 38 },
];

// =====================================================================
// SCHEMA DE PARTICIPANTE NO RANKING
// =====================================================================
const ParticipanteRankingSchema = new mongoose.Schema(
    {
        posicao: { type: Number, required: true },
        timeId: { type: Number, required: true },
        nome_time: { type: String, default: "N/D" },
        nome_cartola: { type: String, default: "N/D" },
        escudo: { type: String, default: "" },
        clube_id: { type: Number },
        pontos_total: { type: Number, default: 0 },
        rodadas_jogadas: { type: Number, default: 0 },
        media: { type: Number, default: 0 },
    },
    { _id: false },
);

// =====================================================================
// SCHEMA DE EDIÇÃO
// =====================================================================
const EdicaoSchema = new mongoose.Schema(
    {
        id: { type: Number, required: true },
        nome: { type: String, required: true },
        inicio: { type: Number, required: true },
        fim: { type: Number, required: true },

        // Status da edição
        status: {
            type: String,
            enum: ["pendente", "em_andamento", "consolidado"],
            default: "pendente",
        },

        // Rodada atual processada (para edições em andamento)
        rodada_atual: { type: Number, default: 0 },

        // Ranking completo
        ranking: [ParticipanteRankingSchema],

        // Campeão (primeiro lugar)
        campeao: {
            timeId: Number,
            nome_time: String,
            nome_cartola: String,
            pontos_total: Number,
        },

        // Estatísticas
        total_participantes: { type: Number, default: 0 },

        // Timestamps
        consolidado_em: { type: Date, default: null },
        atualizado_em: { type: Date, default: Date.now },
    },
    { _id: false },
);

// =====================================================================
// SCHEMA PRINCIPAL - CACHE POR LIGA
// =====================================================================
const MelhorMesCacheSchema = new mongoose.Schema(
    {
        ligaId: {
            type: mongoose.Schema.Types.ObjectId,
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

        // Array de edições
        edicoes: [EdicaoSchema],

        // Rodada geral do sistema quando foi atualizado
        rodada_sistema: { type: Number, default: 0 },

        // Flag para indicar se temporada está encerrada (todas edições consolidadas)
        temporada_encerrada: { type: Boolean, default: false },

        // Timestamps
        criado_em: { type: Date, default: Date.now },
        atualizado_em: { type: Date, default: Date.now },
    },
    {
        timestamps: false,
        collection: "melhor_mes_cache",
    },
);

// =====================================================================
// MÉTODOS ESTÁTICOS
// =====================================================================

/**
 * Retorna configuração de uma edição pelo ID
 */
MelhorMesCacheSchema.statics.getEdicaoConfig = function (edicaoId) {
    return MELHOR_MES_EDICOES.find((e) => e.id === edicaoId) || null;
};

/**
 * Retorna todas as configurações de edições
 */
MelhorMesCacheSchema.statics.getTodasEdicoes = function () {
    return MELHOR_MES_EDICOES;
};

/**
 * Verifica se uma edição está concluída baseado na rodada atual
 */
MelhorMesCacheSchema.statics.isEdicaoConcluida = function (
    edicaoId,
    rodadaAtual,
) {
    const config = MELHOR_MES_EDICOES.find((e) => e.id === edicaoId);
    if (!config) return false;
    return rodadaAtual >= config.fim;
};

/**
 * Verifica se uma edição já iniciou baseado na rodada atual
 */
MelhorMesCacheSchema.statics.isEdicaoIniciada = function (
    edicaoId,
    rodadaAtual,
) {
    const config = MELHOR_MES_EDICOES.find((e) => e.id === edicaoId);
    if (!config) return false;
    return rodadaAtual >= config.inicio;
};

/**
 * Retorna o status de uma edição baseado na rodada atual
 */
MelhorMesCacheSchema.statics.getStatusEdicao = function (
    edicaoId,
    rodadaAtual,
) {
    const config = MELHOR_MES_EDICOES.find((e) => e.id === edicaoId);
    if (!config) return "pendente";

    if (rodadaAtual < config.inicio) return "pendente";
    if (rodadaAtual >= config.fim) return "consolidado";
    return "em_andamento";
};

/**
 * Retorna a edição atual baseado na rodada
 */
MelhorMesCacheSchema.statics.getEdicaoAtual = function (rodadaAtual) {
    for (let i = MELHOR_MES_EDICOES.length - 1; i >= 0; i--) {
        if (rodadaAtual >= MELHOR_MES_EDICOES[i].inicio) {
            return MELHOR_MES_EDICOES[i];
        }
    }
    return MELHOR_MES_EDICOES[0];
};

// =====================================================================
// ÍNDICES
// =====================================================================
MelhorMesCacheSchema.index({ ligaId: 1, temporada: 1 }, { unique: true });
MelhorMesCacheSchema.index({ "edicoes.status": 1 });
MelhorMesCacheSchema.index({ temporada_encerrada: 1 });

// =====================================================================
// EXPORT
// =====================================================================
const MelhorMesCache = mongoose.model("MelhorMesCache", MelhorMesCacheSchema);

console.log(
    `${LOG_PREFIX} ✅ Model carregado - ${MELHOR_MES_EDICOES.length} edições configuradas`,
);

export default MelhorMesCache;
