import mongoose from "mongoose";

const MataMataCacheSchema = new mongoose.Schema(
    {
        liga_id: { type: String, required: true, index: true },
        edicao: { type: Number, required: true }, // 1, 2, 3...
        rodada_atual: { type: Number, required: true },

        // O estado completo do torneio (Fases, Confrontos, Vencedores)
        dados_torneio: { type: mongoose.Schema.Types.Mixed },

        ultima_atualizacao: { type: Date, default: Date.now },
    },
    { strict: false },
);

// Um cache por Liga + Edição
MataMataCacheSchema.index({ liga_id: 1, edicao: 1 }, { unique: true });

export default mongoose.model("MataMataCache", MataMataCacheSchema);
