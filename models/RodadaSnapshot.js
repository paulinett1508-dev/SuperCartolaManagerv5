import mongoose from "mongoose";
import { CURRENT_SEASON } from "../config/seasons.js";

const RodadaSnapshotSchema = new mongoose.Schema({
    liga_id: { type: String, required: true, index: true },
    rodada: { type: Number, required: true, index: true },
    // ✅ TEMPORADA - Segregação de dados por ano
    temporada: {
        type: Number,
        required: true,
        default: CURRENT_SEASON,
        index: true,
    },

    // ✅ NOVO: Status da rodada para controle de consolidação
    status: {
        type: String,
        enum: ["aberta", "consolidada"],
        default: "aberta",
        index: true,
    },

    dados_consolidados: {
        // Ranking geral acumulado até esta rodada
        ranking_geral: { type: Array, default: [] },

        // ✅ NOVO: Ranking específico DESTA rodada
        ranking_rodada: { type: Array, default: [] },

        // Estatísticas financeiras por time (resumo)
        times_stats: { type: Array, default: [] },

        // ✅ NOVO: Extrato financeiro detalhado por participante
        extratos_financeiros: { type: Array, default: [] },

        // Confrontos dos módulos
        confrontos_mata_mata: { type: Array, default: [] },
        confrontos_pontos_corridos: { type: Array, default: [] },
        tabela_pontos_corridos: { type: Array, default: [] },

        // Top 10 Mitos e Micos
        top10: {
            type: Object,
            default: { mitos: [], micos: [] },
        },

        // ✅ NOVO: Artilheiro e Campeão da rodada
        artilheiro_campeao: {
            type: Object,
            default: { artilheiro: null, campeao_rodada: null },
        },

        // ✅ NOVO: Luva de Ouro (ranking goleiros - Liga 02)
        luva_de_ouro: {
            type: Object,
            default: { ranking: [], melhor_goleiro_rodada: null },
        },

        // Melhor do Mês
        melhor_mes: { type: Object, default: {} },

        // Destaques gerais
        destaques: { type: Object, default: {} },
    },

    // ✅ NOVO: Data exata da consolidação
    data_consolidacao: { type: Date, default: null },

    // ✅ NOVO: Versão do schema para migrações futuras
    versao_schema: { type: Number, default: 2 },

    status_mercado: {
        rodada_atual: Number,
        mes_atual: Number,
        fecha_timezone: String,
        timestamp_consolidacao: Date,
    },

    criado_em: { type: Date, default: Date.now },
    atualizado_em: { type: Date, default: Date.now },
});

RodadaSnapshotSchema.index({ liga_id: 1, rodada: 1, temporada: 1 }, { unique: true });
RodadaSnapshotSchema.index({ liga_id: 1, status: 1 }); // ✅ NOVO índice

export default mongoose.model("RodadaSnapshot", RodadaSnapshotSchema);
