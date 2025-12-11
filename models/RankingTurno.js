// models/RankingTurno.js
// ✅ v2.0: Adicionado suporte a participantes inativos
import mongoose from "mongoose";

const RankingTurnoSchema = new mongoose.Schema(
    {
        ligaId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Liga",
            required: true,
        },
        turno: {
            type: String,
            enum: ["1", "2", "geral"],
            required: true,
        },
        status: {
            type: String,
            enum: ["em_andamento", "consolidado"],
            default: "em_andamento",
        },
        rodada_inicio: {
            type: Number,
            required: true,
        },
        rodada_fim: {
            type: Number,
            required: true,
        },
        rodada_atual: {
            type: Number,
            default: 0,
        },
        ranking: [
            {
                posicao: { type: Number, required: true },
                posicao_grupo: { type: Number }, // ✅ v2.0: Posição dentro do grupo (ativos ou inativos)
                timeId: { type: Number, required: true },
                nome_cartola: { type: String, default: "N/D" },
                nome_time: { type: String, default: "N/D" },
                escudo: { type: String, default: "" },
                clube_id: { type: Number },
                pontos: { type: Number, default: 0 },
                rodadas_jogadas: { type: Number, default: 0 },
                // ✅ v2.0: Campos de status do participante
                ativo: { type: Boolean, default: true },
                inativo: { type: Boolean, default: false },
                rodada_desistencia: { type: Number, default: null },
            },
        ],
        consolidado_em: {
            type: Date,
            default: null,
        },
        atualizado_em: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    },
);

// Índice composto para buscas rápidas
RankingTurnoSchema.index({ ligaId: 1, turno: 1 }, { unique: true });

// Método estático para definir rodadas por turno
RankingTurnoSchema.statics.getRodadasTurno = function (turno) {
    switch (turno) {
        case "1":
            return { inicio: 1, fim: 19 };
        case "2":
            return { inicio: 20, fim: 38 };
        case "geral":
        default:
            return { inicio: 1, fim: 38 };
    }
};

export default mongoose.model("RankingTurno", RankingTurnoSchema);
