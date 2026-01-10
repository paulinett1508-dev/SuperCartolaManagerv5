/**
 * Model: AjusteFinanceiro
 *
 * Ajustes financeiros dinâmicos por participante/temporada.
 * Substituiu os 4 campos fixos de FluxoFinanceiroCampos a partir de 2026.
 *
 * Cada ajuste é um documento individual, permitindo:
 * - Quantidade ilimitada de ajustes por participante
 * - Auditoria completa (quem criou, quando)
 * - Soft delete para histórico
 *
 * @version 1.0.0
 * @since 2026-01-10
 */

import mongoose from "mongoose";
import { CURRENT_SEASON } from "../config/seasons.js";

const AjusteFinanceiroSchema = new mongoose.Schema({
    // =========================================================================
    // IDENTIFICAÇÃO
    // =========================================================================
    liga_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Liga",
        required: true,
        index: true
    },
    time_id: {
        type: Number,
        required: true,
        index: true
    },
    temporada: {
        type: Number,
        required: true,
        default: CURRENT_SEASON,
        index: true
    },

    // =========================================================================
    // DADOS DO AJUSTE
    // =========================================================================
    descricao: {
        type: String,
        required: [true, "Descrição é obrigatória"],
        maxlength: [100, "Descrição deve ter no máximo 100 caracteres"],
        trim: true
    },
    valor: {
        type: Number,
        required: [true, "Valor é obrigatório"],
        validate: {
            validator: function(v) {
                return v !== 0;
            },
            message: "Valor não pode ser zero"
        }
    },

    // =========================================================================
    // AUDITORIA
    // =========================================================================
    criado_por: {
        type: String,
        default: ''
    },
    atualizado_por: {
        type: String,
        default: ''
    },

    // =========================================================================
    // CONTROLE
    // =========================================================================
    ativo: {
        type: Boolean,
        default: true,
        index: true
    }

}, {
    timestamps: {
        createdAt: 'criado_em',
        updatedAt: 'atualizado_em'
    },
    collection: 'ajustesfinanceiros'
});

// =============================================================================
// ÍNDICES
// =============================================================================

// Índice composto para busca rápida de ajustes ativos por participante/temporada
AjusteFinanceiroSchema.index(
    { liga_id: 1, time_id: 1, temporada: 1, ativo: 1 }
);

// =============================================================================
// MÉTODOS ESTÁTICOS
// =============================================================================

/**
 * Lista ajustes ativos de um participante na temporada
 * @param {string|ObjectId} ligaId - ID da liga
 * @param {number} timeId - ID do time
 * @param {number} temporada - Temporada
 * @returns {Promise<Array>}
 */
AjusteFinanceiroSchema.statics.listarPorParticipante = async function(ligaId, timeId, temporada = CURRENT_SEASON) {
    return this.find({
        liga_id: new mongoose.Types.ObjectId(ligaId),
        time_id: Number(timeId),
        temporada: Number(temporada),
        ativo: true
    }).sort({ criado_em: -1 }).lean();
};

/**
 * Calcula soma total dos ajustes de um participante
 * @param {string|ObjectId} ligaId - ID da liga
 * @param {number} timeId - ID do time
 * @param {number} temporada - Temporada
 * @returns {Promise<Object>} { total, creditos, debitos, quantidade }
 */
AjusteFinanceiroSchema.statics.calcularTotal = async function(ligaId, timeId, temporada = CURRENT_SEASON) {
    const resultado = await this.aggregate([
        {
            $match: {
                liga_id: new mongoose.Types.ObjectId(ligaId),
                time_id: Number(timeId),
                temporada: Number(temporada),
                ativo: true
            }
        },
        {
            $group: {
                _id: null,
                total: { $sum: '$valor' },
                creditos: {
                    $sum: {
                        $cond: [{ $gt: ['$valor', 0] }, '$valor', 0]
                    }
                },
                debitos: {
                    $sum: {
                        $cond: [{ $lt: ['$valor', 0] }, '$valor', 0]
                    }
                },
                quantidade: { $sum: 1 }
            }
        }
    ]);

    if (resultado.length === 0) {
        return { total: 0, creditos: 0, debitos: 0, quantidade: 0 };
    }

    return {
        total: resultado[0].total || 0,
        creditos: resultado[0].creditos || 0,
        debitos: resultado[0].debitos || 0,
        quantidade: resultado[0].quantidade || 0
    };
};

/**
 * Cria novo ajuste
 * @param {Object} dados - Dados do ajuste
 * @returns {Promise<Object>}
 */
AjusteFinanceiroSchema.statics.criar = async function(dados) {
    const ajuste = new this({
        liga_id: new mongoose.Types.ObjectId(dados.liga_id),
        time_id: Number(dados.time_id),
        temporada: Number(dados.temporada || CURRENT_SEASON),
        descricao: dados.descricao,
        valor: Number(dados.valor),
        criado_por: dados.criado_por || ''
    });

    return ajuste.save();
};

/**
 * Atualiza ajuste existente
 * @param {string} ajusteId - ID do ajuste
 * @param {Object} dados - Dados a atualizar
 * @returns {Promise<Object|null>}
 */
AjusteFinanceiroSchema.statics.atualizar = async function(ajusteId, dados) {
    const updateData = {};

    if (dados.descricao !== undefined) {
        updateData.descricao = dados.descricao;
    }
    if (dados.valor !== undefined) {
        updateData.valor = Number(dados.valor);
    }
    if (dados.atualizado_por) {
        updateData.atualizado_por = dados.atualizado_por;
    }

    return this.findByIdAndUpdate(
        ajusteId,
        { $set: updateData },
        { new: true, runValidators: true }
    );
};

/**
 * Remove ajuste (soft delete)
 * @param {string} ajusteId - ID do ajuste
 * @param {string} removido_por - Email de quem removeu
 * @returns {Promise<Object|null>}
 */
AjusteFinanceiroSchema.statics.remover = async function(ajusteId, removido_por = '') {
    return this.findByIdAndUpdate(
        ajusteId,
        {
            $set: {
                ativo: false,
                atualizado_por: removido_por
            }
        },
        { new: true }
    );
};

/**
 * Lista todos os ajustes de uma liga/temporada (para relatórios)
 * @param {string|ObjectId} ligaId - ID da liga
 * @param {number} temporada - Temporada
 * @returns {Promise<Array>}
 */
AjusteFinanceiroSchema.statics.listarPorLiga = async function(ligaId, temporada = CURRENT_SEASON) {
    return this.find({
        liga_id: new mongoose.Types.ObjectId(ligaId),
        temporada: Number(temporada),
        ativo: true
    }).sort({ time_id: 1, criado_em: -1 }).lean();
};

// =============================================================================
// VIRTUALS
// =============================================================================

/**
 * Tipo do ajuste baseado no valor
 */
AjusteFinanceiroSchema.virtual('tipo').get(function() {
    if (this.valor > 0) return 'credito';
    if (this.valor < 0) return 'debito';
    return 'neutro';
});

// =============================================================================
// EXPORT
// =============================================================================

const AjusteFinanceiro = mongoose.model("AjusteFinanceiro", AjusteFinanceiroSchema);
export default AjusteFinanceiro;
