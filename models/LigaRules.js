/**
 * Model: LigaRules
 *
 * Armazena regras configuráveis por liga e temporada.
 * Permite que cada liga tenha suas próprias configurações de inscrição,
 * taxas, prazos e permissões.
 *
 * @version 1.0.0
 * @since 2026-01-04
 */

import mongoose from "mongoose";
import { CURRENT_SEASON } from "../config/seasons.js";

const LigaRulesSchema = new mongoose.Schema({
    // Identificação
    liga_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Liga",
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
    // REGRAS DE INSCRIÇÃO
    // =========================================================================
    inscricao: {
        // Taxa de inscrição para a temporada (em R$)
        taxa: {
            type: Number,
            required: true,
            default: 0,
            min: 0
        },

        // Prazo limite para renovação/inscrição
        prazo_renovacao: {
            type: Date,
            required: true,
            default: () => new Date('2026-01-27T23:59:59') // 1 dia antes da 1ª rodada
        },

        // Permitir que devedores renovem (carregando a dívida)
        permitir_devedor_renovar: {
            type: Boolean,
            default: true
        },

        // Permitir aproveitar saldo positivo como crédito
        aproveitar_saldo_positivo: {
            type: Boolean,
            default: true
        },

        // Permitir parcelamento da taxa
        permitir_parcelamento: {
            type: Boolean,
            default: false
        },

        // Número máximo de parcelas (se parcelamento permitido)
        max_parcelas: {
            type: Number,
            default: 1,
            min: 1,
            max: 12
        }
    },

    // =========================================================================
    // STATUS DO PROCESSO DE RENOVAÇÃO
    // =========================================================================
    status: {
        type: String,
        enum: ['rascunho', 'aberto', 'encerrado'],
        default: 'rascunho'
    },

    // =========================================================================
    // MENSAGENS PERSONALIZADAS (opcional)
    // =========================================================================
    mensagens: {
        // Mensagem exibida no modal de renovação
        boas_vindas: {
            type: String,
            default: ''
        },
        // Aviso para devedores
        aviso_devedor: {
            type: String,
            default: ''
        },
        // Mensagem de confirmação
        confirmacao: {
            type: String,
            default: ''
        }
    },

    // =========================================================================
    // METADATA
    // =========================================================================
    criado_por: {
        type: String,
        default: 'sistema'
    },
    atualizado_por: {
        type: String,
        default: 'sistema'
    }
}, {
    timestamps: {
        createdAt: 'criado_em',
        updatedAt: 'atualizado_em'
    },
    collection: 'ligarules'
});

// =============================================================================
// ÍNDICES
// =============================================================================

// Índice composto único: apenas uma configuração por liga/temporada
LigaRulesSchema.index(
    { liga_id: 1, temporada: 1 },
    { unique: true }
);

// =============================================================================
// MÉTODOS ESTÁTICOS
// =============================================================================

/**
 * Busca regras de uma liga para uma temporada específica
 * @param {string|ObjectId} ligaId - ID da liga
 * @param {number} temporada - Temporada (default: CURRENT_SEASON)
 * @returns {Promise<Object|null>} Regras da liga ou null
 */
LigaRulesSchema.statics.buscarPorLiga = async function(ligaId, temporada = CURRENT_SEASON) {
    return this.findOne({
        liga_id: new mongoose.Types.ObjectId(ligaId),
        temporada: Number(temporada)
    }).lean();
};

/**
 * Cria ou atualiza regras de uma liga
 * @param {string|ObjectId} ligaId - ID da liga
 * @param {number} temporada - Temporada
 * @param {Object} dados - Dados das regras
 * @returns {Promise<Object>} Regras atualizadas
 */
LigaRulesSchema.statics.upsert = async function(ligaId, temporada, dados) {
    return this.findOneAndUpdate(
        {
            liga_id: new mongoose.Types.ObjectId(ligaId),
            temporada: Number(temporada)
        },
        { $set: dados },
        { upsert: true, new: true, runValidators: true }
    );
};

/**
 * Verifica se o prazo de renovação ainda está ativo
 * @param {string|ObjectId} ligaId - ID da liga
 * @param {number} temporada - Temporada
 * @returns {Promise<boolean>} true se ainda pode renovar
 */
LigaRulesSchema.statics.prazoAtivo = async function(ligaId, temporada = CURRENT_SEASON) {
    const rules = await this.buscarPorLiga(ligaId, temporada);
    if (!rules) return false;
    if (rules.status !== 'aberto') return false;

    const agora = new Date();
    const prazo = new Date(rules.inscricao.prazo_renovacao);
    return agora <= prazo;
};

// =============================================================================
// MÉTODOS DE INSTÂNCIA
// =============================================================================

/**
 * Verifica se permite renovação de devedores
 * @returns {boolean}
 */
LigaRulesSchema.methods.permiteDevedor = function() {
    return this.inscricao.permitir_devedor_renovar === true;
};

/**
 * Verifica se permite aproveitar crédito
 * @returns {boolean}
 */
LigaRulesSchema.methods.permiteAproveitarCredito = function() {
    return this.inscricao.aproveitar_saldo_positivo === true;
};

/**
 * Calcula valor a pagar considerando crédito/débito anterior
 * @param {number} saldoAnterior - Saldo da temporada anterior (positivo = crédito)
 * @param {Object} opcoes - Opções de cálculo
 * @param {boolean} opcoes.pagouInscricao - Se true, taxa não vira débito (default: true)
 * @param {boolean} opcoes.aproveitarCredito - Se false, não usa crédito mesmo se permitido
 * @returns {Object} { taxa, credito, divida, total, taxaComoDivida }
 */
LigaRulesSchema.methods.calcularValorInscricao = function(saldoAnterior = 0, opcoes = {}) {
    const taxa = this.inscricao.taxa || 0;
    const pagouInscricao = opcoes.pagouInscricao !== false; // default true
    const querAproveitarCredito = opcoes.aproveitarCredito !== false; // default true

    let credito = 0;
    let divida = 0;

    // Taxa só vira dívida se NÃO pagou
    const taxaComoDivida = pagouInscricao ? 0 : taxa;

    // Crédito só é aplicado se:
    // 1. Participante é credor (saldoAnterior > 0)
    // 2. Regra permite aproveitar saldo positivo
    // 3. Usuário optou por aproveitar (querAproveitarCredito)
    // 4. NÃO pagou a inscrição (se pagou, não precisa usar crédito)
    if (saldoAnterior > 0 && this.permiteAproveitarCredito() && querAproveitarCredito && !pagouInscricao) {
        // Credor: pode usar como crédito (máximo = taxa)
        credito = Math.min(saldoAnterior, taxa);
    } else if (saldoAnterior < 0 && this.permiteDevedor()) {
        // Devedor: carrega a dívida
        divida = Math.abs(saldoAnterior);
    }

    // Total = taxa (se não pagou) + dívida anterior - crédito usado
    const total = taxaComoDivida + divida - credito;

    return {
        taxa,
        taxaComoDivida,
        credito,
        divida,
        total,
        saldoAnterior,
        pagouInscricao
    };
};

// =============================================================================
// EXPORT
// =============================================================================

const LigaRules = mongoose.model("LigaRules", LigaRulesSchema);
export default LigaRules;
