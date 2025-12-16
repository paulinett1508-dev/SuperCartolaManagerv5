import mongoose from "mongoose";
import { CURRENT_SEASON } from "../config/seasons.js";

const { Schema } = mongoose;

const FluxoFinanceiroCamposSchema = new Schema(
    {
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
        // ✅ TEMPORADA - Segregação de dados por ano
        temporada: {
            type: Number,
            required: true,
            default: CURRENT_SEASON,
            index: true,
        },
        campos: [
            {
                nome: {
                    type: String,
                    required: true,
                    default: function () {
                        const index = this.parent().campos.indexOf(this) + 1;
                        return `Campo ${index}`;
                    },
                },
                valor: {
                    type: Number,
                    required: true,
                    default: 0,
                },
            },
        ],
        updatedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    },
);

// Índice composto para busca rápida (incluindo temporada)
FluxoFinanceiroCamposSchema.index({ ligaId: 1, timeId: 1, temporada: 1 }, { unique: true });

// Garantir que sempre tenha 4 campos
FluxoFinanceiroCamposSchema.pre("save", function (next) {
    if (!this.campos || this.campos.length === 0) {
        this.campos = [
            { nome: "Campo 1", valor: 0 },
            { nome: "Campo 2", valor: 0 },
            { nome: "Campo 3", valor: 0 },
            { nome: "Campo 4", valor: 0 },
        ];
    }
    next();
});

const FluxoFinanceiroCampos = mongoose.model(
    "FluxoFinanceiroCampos",
    FluxoFinanceiroCamposSchema,
);

export default FluxoFinanceiroCampos;
