
import mongoose from "mongoose";

const extratoFinanceiroCacheSchema = new mongoose.Schema({
    ligaId: {
        type: String,
        required: true,
        index: true,
    },
    timeId: {
        type: String,
        required: true,
        index: true,
    },
    ultimaRodadaCalculada: {
        type: Number,
        required: true,
    },
    extrato: {
        rodadas: [
            {
                rodada: Number,
                posicao: Number,
                totalTimes: Number,
                bonusOnus: Number,
                pontosCorridos: Number,
                mataMata: Number,
                melhorMes: Number,
                top10: Number,
                top10Status: String,
                top10Posicao: Number,
                isMito: Boolean,
                isMico: Boolean,
                saldo: Number,
            },
        ],
        resumo: {
            totalGanhos: Number,
            totalPerdas: Number,
            bonus: Number,
            onus: Number,
            pontosCorridos: Number,
            mataMata: Number,
            melhorMes: Number,
            top10: Number,
            campo1: Number,
            campo2: Number,
            campo3: Number,
            campo4: Number,
            vezesMito: Number,
            vezesMico: Number,
            saldo: Number,
        },
        totalTimes: Number,
        camposEditaveis: {
            campo1: { nome: String, valor: Number },
            campo2: { nome: String, valor: Number },
            campo3: { nome: String, valor: Number },
            campo4: { nome: String, valor: Number },
        },
    },
    metadados: {
        versaoCalculo: {
            type: String,
            default: "1.0.0",
        },
        timestampCalculo: {
            type: Date,
            default: Date.now,
        },
        motivoRecalculo: String, // "nova_rodada", "admin_forcado", "campos_editados", etc
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

// Índice composto para busca rápida
extratoFinanceiroCacheSchema.index({ ligaId: 1, timeId: 1 }, { unique: true });

// Atualizar timestamp automaticamente
extratoFinanceiroCacheSchema.pre("save", function (next) {
    this.updatedAt = new Date();
    next();
});

const ExtratoFinanceiroCache = mongoose.model(
    "ExtratoFinanceiroCache",
    extratoFinanceiroCacheSchema,
);

export default ExtratoFinanceiroCache;
