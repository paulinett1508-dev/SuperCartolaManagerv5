// models/PontosCorridosCache.js
import mongoose from "mongoose";

const PontosCorridosCacheSchema = new mongoose.Schema(
    {
        liga_id: { type: String, required: true, index: true },
        rodada_consolidada: { type: Number, required: true },
        cache_permanente: { type: Boolean, default: false },

        // ✅ CONFRONTOS DA RODADA
        confrontos: [
            {
                time1: {
                    id: Number,
                    nome: String,
                    nome_cartola: String,
                    escudo: String,
                    pontos: Number,
                },
                time2: {
                    id: Number,
                    nome: String,
                    nome_cartola: String,
                    escudo: String,
                    pontos: Number,
                },
                diferenca: Number,
                valor: Number,
            },
        ],

        // ✅ CLASSIFICAÇÃO ACUMULADA ATÉ ESTA RODADA
        classificacao: [
            {
                posicao: Number,
                timeId: Number,
                nome: String,
                nome_cartola: String,
                escudo: String,
                pontos: Number,
                jogos: Number,
                vitorias: Number,
                empates: Number,
                derrotas: Number,
                gols_pro: Number,
                gols_contra: Number,
                saldo_gols: Number,
                financeiro: Number,
                pontosGoleada: Number,
            },
        ],

        ultima_atualizacao: { type: Date, default: Date.now },
    },
    { strict: false },
);

// Índice composto para busca rápida
PontosCorridosCacheSchema.index(
    { liga_id: 1, rodada_consolidada: 1 },
    { unique: true },
);

export default mongoose.model("PontosCorridosCache", PontosCorridosCacheSchema);
