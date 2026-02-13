/**
 * SCHEDULER STATE MODEL v1.0.0
 *
 * Persiste o estado do scheduler de consolidação no MongoDB.
 * Resolve o problema de perda de detecção de transição ao reiniciar o servidor
 * (ultimoStatusMercado era variável em memória).
 *
 * Collection: scheduler_states
 * Documento único por chave (upsert pattern)
 */

import mongoose from "mongoose";

const schedulerStateSchema = new mongoose.Schema({
    chave: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    status_mercado: {
        type: Number,
        default: null,
    },
    rodada_atual: {
        type: Number,
        default: null,
    },
    temporada: {
        type: Number,
        default: null,
    },
    atualizado_em: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
    collection: "scheduler_states",
});

// Helper estático: salvar estado do mercado
schedulerStateSchema.statics.salvarStatusMercado = async function(statusMercado) {
    if (!statusMercado) return null;

    return this.findOneAndUpdate(
        { chave: "ultimo_status_mercado" },
        {
            $set: {
                status_mercado: statusMercado.status_mercado,
                rodada_atual: statusMercado.rodada_atual,
                temporada: statusMercado.temporada,
                atualizado_em: new Date(),
            },
        },
        { upsert: true, new: true },
    );
};

// Helper estático: carregar último estado salvo
schedulerStateSchema.statics.carregarStatusMercado = async function() {
    const doc = await this.findOne({ chave: "ultimo_status_mercado" }).lean();
    if (!doc) return null;

    return {
        status_mercado: doc.status_mercado,
        rodada_atual: doc.rodada_atual,
        temporada: doc.temporada,
    };
};

const SchedulerState = mongoose.model("SchedulerState", schedulerStateSchema);

export default SchedulerState;
