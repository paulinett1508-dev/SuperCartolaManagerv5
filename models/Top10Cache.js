// models/Top10Cache.js
import mongoose from "mongoose";

const Top10CacheSchema = new mongoose.Schema(
    {
        liga_id: { type: String, required: true, index: true },
        rodada_consolidada: { type: Number, required: true }, // Cache válido até esta rodada
        cache_permanente: { type: Boolean, default: false }, // ✅ NOVO: Flag de cache permanente

        mitos: [
            {
                time_id: Number,
                nome_time: String,
                nome_cartola: String,
                slug_time: String,
                escudo_url: String,
                pontos: Number,
                rodada: Number,
                posicao: Number,
                valor: Number, // Valor do prêmio/bônus
            },
        ],

        micos: [
            {
                time_id: Number,
                nome_time: String,
                nome_cartola: String,
                slug_time: String,
                escudo_url: String,
                pontos: Number,
                rodada: Number,
                posicao: Number,
                valor: Number, // Valor do ônus
            },
        ],

        ultima_atualizacao: { type: Date, default: Date.now },
    },
    { strict: false },
);

// Índice único para garantir um cache por liga/rodada
Top10CacheSchema.index({ liga_id: 1, rodada_consolidada: 1 }, { unique: true });

export default mongoose.model("Top10Cache", Top10CacheSchema);
