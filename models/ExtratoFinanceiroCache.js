import mongoose from "mongoose";
import { CURRENT_SEASON } from "../config/seasons.js";

const ExtratoFinanceiroCacheSchema = new mongoose.Schema(
    {
        // ✅ v6.0 FIX: Aceitar String ou ObjectId para compatibilidade
        // Dados históricos armazenados como String, novos podem ser ObjectId
        liga_id: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
            index: true,
        },
        time_id: { type: Number, required: true, index: true },
        // ✅ TEMPORADA - Segregação de dados por ano
        temporada: {
            type: Number,
            required: true,
            default: CURRENT_SEASON,
            index: true,
        },

        // Controle de Consolidação
        ultima_rodada_consolidada: { type: Number, default: 0 },
        data_ultima_atualizacao: { type: Date, default: Date.now },

        // Controle de Cache Permanente
        cache_permanente: { type: Boolean, default: false },
        versao_calculo: { type: String, default: "4.0.0" },
        rodadas_imutaveis: [Number],

        // Valores Consolidados
        saldo_consolidado: { type: Number, default: 0 },
        ganhos_consolidados: { type: Number, default: 0 },
        perdas_consolidadas: { type: Number, default: 0 },

        // ✅ CORRIGIDO: Histórico de Rodadas Consolidadas (formato do Admin)
        historico_transacoes: [
            {
                rodada: { type: Number, required: true },
                posicao: { type: Number, default: null },
                bonusOnus: { type: Number, default: 0 },
                pontosCorridos: { type: Number, default: 0 },
                mataMata: { type: Number, default: 0 },
                top10: { type: Number, default: 0 },
                saldo: { type: Number, default: 0 },
                saldoAcumulado: { type: Number, default: 0 },
                // Campos extras para UI
                isMito: { type: Boolean, default: false },
                isMico: { type: Boolean, default: false },
                top10Status: { type: String, default: null },
                top10Posicao: { type: Number, default: null },
                // Campos legados (para compatibilidade)
                tipo: { type: String },
                descricao: { type: String },
                valor: { type: Number },
                data: { type: Date },
            },
        ],

        // Metadados para debug e auditoria
        metadados: {
            versaoCalculo: String,
            timestampCalculo: Date,
            motivoRecalculo: String,
            origem: String,
        },

        // ✅ v6.0: Quitação de temporada (fecha extrato e define legado)
        quitacao: {
            quitado: { type: Boolean, default: false },
            data_quitacao: { type: Date },
            admin_responsavel: { type: String },
            saldo_no_momento: { type: Number },  // Snapshot do saldo antes de quitar
            tipo: {
                type: String,
                enum: ['zerado', 'integral', 'customizado'],
            },
            valor_legado: { type: Number, default: 0 },  // Valor a carregar para próxima temporada
            observacao: { type: String },
        },
    },
    {
        timestamps: {
            createdAt: 'criado_em',
            updatedAt: 'atualizado_em',
        },
        collection: 'extratofinanceirocaches',
    },
);

// Índice composto para busca rápida (incluindo temporada)
ExtratoFinanceiroCacheSchema.index(
    { liga_id: 1, time_id: 1, temporada: 1 },
    { unique: true },
);

const ExtratoFinanceiroCache =
    mongoose.models.ExtratoFinanceiroCache ||
    mongoose.model("ExtratoFinanceiroCache", ExtratoFinanceiroCacheSchema);

export default ExtratoFinanceiroCache;
