// models/PontosCorridosCache.js
import mongoose from 'mongoose';

const PontosCorridosCacheSchema = new mongoose.Schema(
    {
        liga_id: { type: String, required: true, index: true },
        rodada_consolidada: { type: Number, required: true },
        cache_permanente: { type: Boolean, default: false }, // ✅ NOVO: Flag de cache permanente

        classificacao: [
            {
                posicao: Number,
                timeId: Number,
                nome: String,
                escudo: String,
                pontos: Number,
                vitorias: Number,
                empates: Number,
                derrotas: Number,
                gols_pro: Number,
                gols_contra: Number,
                saldo_gols: Number,
            },
        ],

        ultima_atualizacao: { type: Date, default: Date.now },
    },
    { strict: false },
);

// Índice composto para busca rápida
PontosCorridosCacheSchema.index({ liga_id: 1, rodada_consolidada: 1 }, { unique: true });

export default mongoose.model('PontosCorridosCache', PontosCorridosCacheSchema);