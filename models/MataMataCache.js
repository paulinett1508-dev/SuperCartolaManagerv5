import mongoose from "mongoose";
import { CURRENT_SEASON } from "../config/seasons.js";

const MataMataCacheSchema = new mongoose.Schema(
    {
        liga_id: { type: String, required: true, index: true },
        edicao: { type: Number, required: true }, // 1, 2, 3...
        rodada_atual: { type: Number, required: true },
        // ✅ TEMPORADA - Segregação de dados por ano
        temporada: {
            type: Number,
            required: true,
            default: CURRENT_SEASON,
            index: true,
        },

        // ✅ Tamanho real calculado do torneio (8, 16, 32, 64)
        tamanhoTorneio: {
            type: Number,
            required: false,
            default: 32,
            min: 4,
            max: 64,
        },

        // ✅ Número de participantes ativos no momento do cálculo
        participantesAtivos: {
            type: Number,
            required: false,
        },

        // O estado completo do torneio (Fases, Confrontos, Vencedores)
        dados_torneio: { type: mongoose.Schema.Types.Mixed },

        ultima_atualizacao: { type: Date, default: Date.now },
    },
    { strict: false },
);

// Um cache por Liga + Edição + Temporada
MataMataCacheSchema.index({ liga_id: 1, edicao: 1, temporada: 1 }, { unique: true });

export default mongoose.model("MataMataCache", MataMataCacheSchema);
