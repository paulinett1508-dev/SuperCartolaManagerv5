/**
 * Model: ModuleConfig
 *
 * Armazena configuração de módulos por liga e temporada.
 * Permite que cada liga ative/desative módulos e customize valores.
 *
 * Diferença para LigaRules:
 * - LigaRules: regras gerais (inscrição, taxas)
 * - ModuleConfig: configuração específica de cada módulo (mata-mata, top10, etc.)
 *
 * @version 1.0.0
 * @since 2026-01-04
 */

import mongoose from "mongoose";
import { CURRENT_SEASON } from "../config/seasons.js";

// =============================================================================
// LISTA DE MÓDULOS DISPONÍVEIS
// =============================================================================

export const MODULOS_DISPONIVEIS = [
    'extrato',            // ✅ NOVO: Módulo base de extrato financeiro
    'ranking_geral',
    'ranking_rodada',
    'pontos_corridos',
    'mata_mata',
    'top_10',
    'melhor_mes',
    'turno_returno',
    'luva_ouro',
    'artilheiro',
    'capitao_luxo',
    'raio_x',
    'tiro_certo',
    'resta_um'
];

// =============================================================================
// SCHEMA
// =============================================================================

const ModuleConfigSchema = new mongoose.Schema({
    // =========================================================================
    // IDENTIFICAÇÃO
    // =========================================================================
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
    modulo: {
        type: String,
        required: true,
        enum: MODULOS_DISPONIVEIS,
        index: true
    },

    // =========================================================================
    // STATUS DO MÓDULO
    // =========================================================================
    ativo: {
        type: Boolean,
        default: true
    },

    // Data de ativação (quando foi ativado)
    ativado_em: {
        type: Date,
        default: null
    },

    // =========================================================================
    // OVERRIDE DE VALORES FINANCEIROS
    // =========================================================================
    // Se null, usa o default do JSON em config/rules/
    financeiro_override: {
        // Para módulos com valores por fase (mata-mata)
        valores_por_fase: {
            type: mongoose.Schema.Types.Mixed,
            default: null
            // Exemplo: { primeira: { vitoria: 15, derrota: -15 }, ... }
        },

        // Para módulos com valores por posição (top10, ranking)
        valores_por_posicao: {
            type: mongoose.Schema.Types.Mixed,
            default: null
            // Exemplo: { mitos: { 1: 50, 2: 40, ... }, micos: { 1: -50, ... } }
        },

        // Para módulos com valores simples
        valores_simples: {
            vitoria: { type: Number, default: null },
            derrota: { type: Number, default: null },
            empate: { type: Number, default: null }
        }
    },

    // =========================================================================
    // OVERRIDE DE CALENDÁRIO
    // =========================================================================
    // Para módulos que têm edições/fases (mata-mata, melhor_mes)
    calendario_override: [{
        edicao: Number,
        nome: String,
        rodada_inicial: Number,
        rodada_final: Number,
        rodada_definicao: Number, // Opcional: para mata-mata
        fases: mongoose.Schema.Types.Mixed // Opcional: mapping de fases
    }],

    // =========================================================================
    // REGRAS CUSTOMIZADAS
    // =========================================================================
    // Campo flexível para qualquer override específico do módulo
    regras_override: {
        type: mongoose.Schema.Types.Mixed,
        default: null
        // Exemplos:
        // top_10: { quantidade_mitos: 5, quantidade_micos: 5 }
        // mata_mata: { total_times: 16, formato: "1x16, 2x15, ..." }
        // pontos_corridos: { criterio_desempate: "patrimonio" }
    },

    // =========================================================================
    // RESPOSTAS DO WIZARD
    // =========================================================================
    // Armazena as respostas dadas no wizard de configuração
    wizard_respostas: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
        // Exemplo: { qtd_participantes: 10, valor_1o_lugar: 50, ... }
    },

    // =========================================================================
    // METADATA
    // =========================================================================
    configurado_por: {
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
    collection: 'moduleconfigs'
});

// =============================================================================
// ÍNDICES
// =============================================================================

// Índice composto único: apenas uma configuração por liga/temporada/modulo
ModuleConfigSchema.index(
    { liga_id: 1, temporada: 1, modulo: 1 },
    { unique: true }
);

// =============================================================================
// MÉTODOS ESTÁTICOS
// =============================================================================

/**
 * Busca configuração de um módulo específico para uma liga
 * @param {string|ObjectId} ligaId - ID da liga
 * @param {string} modulo - Nome do módulo (ex: 'mata_mata')
 * @param {number} temporada - Temporada (default: CURRENT_SEASON)
 * @returns {Promise<Object|null>} Configuração ou null
 */
ModuleConfigSchema.statics.buscarConfig = async function(ligaId, modulo, temporada = CURRENT_SEASON) {
    return this.findOne({
        liga_id: new mongoose.Types.ObjectId(ligaId),
        modulo: modulo,
        temporada: Number(temporada)
    }).lean();
};

/**
 * Lista todos os módulos ativos para uma liga
 * @param {string|ObjectId} ligaId - ID da liga
 * @param {number} temporada - Temporada (default: CURRENT_SEASON)
 * @returns {Promise<Array>} Lista de configurações de módulos ativos
 */
ModuleConfigSchema.statics.listarModulosAtivos = async function(ligaId, temporada = CURRENT_SEASON) {
    return this.find({
        liga_id: new mongoose.Types.ObjectId(ligaId),
        temporada: Number(temporada),
        ativo: true
    }).lean();
};

/**
 * Lista todos os módulos (ativos e inativos) para uma liga
 * @param {string|ObjectId} ligaId - ID da liga
 * @param {number} temporada - Temporada (default: CURRENT_SEASON)
 * @returns {Promise<Array>} Lista de todas as configurações
 */
ModuleConfigSchema.statics.listarTodosModulos = async function(ligaId, temporada = CURRENT_SEASON) {
    return this.find({
        liga_id: new mongoose.Types.ObjectId(ligaId),
        temporada: Number(temporada)
    }).lean();
};

/**
 * Ativa um módulo para uma liga
 * @param {string|ObjectId} ligaId - ID da liga
 * @param {string} modulo - Nome do módulo
 * @param {Object} config - Configurações do módulo
 * @param {string} usuario - Email do usuário que está ativando
 * @param {number} temporada - Temporada
 * @returns {Promise<Object>} Configuração criada/atualizada
 */
ModuleConfigSchema.statics.ativarModulo = async function(
    ligaId,
    modulo,
    config = {},
    usuario = 'sistema',
    temporada = CURRENT_SEASON
) {
    const dadosBase = {
        ativo: true,
        ativado_em: new Date(),
        configurado_por: usuario,
        atualizado_por: usuario
    };

    // Mescla configurações recebidas
    const dados = { ...dadosBase };

    if (config.financeiro_override) {
        dados.financeiro_override = config.financeiro_override;
    }
    if (config.calendario_override) {
        dados.calendario_override = config.calendario_override;
    }
    if (config.regras_override) {
        dados.regras_override = config.regras_override;
    }
    if (config.wizard_respostas) {
        dados.wizard_respostas = config.wizard_respostas;
    }

    return this.findOneAndUpdate(
        {
            liga_id: new mongoose.Types.ObjectId(ligaId),
            modulo: modulo,
            temporada: Number(temporada)
        },
        { $set: dados },
        { upsert: true, new: true, runValidators: true }
    );
};

/**
 * Desativa um módulo para uma liga
 * @param {string|ObjectId} ligaId - ID da liga
 * @param {string} modulo - Nome do módulo
 * @param {string} usuario - Email do usuário
 * @param {number} temporada - Temporada
 * @returns {Promise<Object>} Configuração atualizada
 */
ModuleConfigSchema.statics.desativarModulo = async function(
    ligaId,
    modulo,
    usuario = 'sistema',
    temporada = CURRENT_SEASON
) {
    return this.findOneAndUpdate(
        {
            liga_id: new mongoose.Types.ObjectId(ligaId),
            modulo: modulo,
            temporada: Number(temporada)
        },
        {
            $set: {
                ativo: false,
                atualizado_por: usuario
            }
        },
        { new: true }
    );
};

/**
 * Verifica se um módulo está ativo para uma liga
 * @param {string|ObjectId} ligaId - ID da liga
 * @param {string} modulo - Nome do módulo
 * @param {number} temporada - Temporada
 * @returns {Promise<boolean>} true se ativo
 */
ModuleConfigSchema.statics.isModuloAtivo = async function(ligaId, modulo, temporada = CURRENT_SEASON) {
    const config = await this.buscarConfig(ligaId, modulo, temporada);
    return config?.ativo === true;
};

/**
 * Atualiza respostas do wizard
 * @param {string|ObjectId} ligaId - ID da liga
 * @param {string} modulo - Nome do módulo
 * @param {Object} respostas - Respostas do wizard
 * @param {string} usuario - Email do usuário
 * @param {number} temporada - Temporada
 * @returns {Promise<Object>} Configuração atualizada
 */
ModuleConfigSchema.statics.salvarRespostasWizard = async function(
    ligaId,
    modulo,
    respostas,
    usuario = 'sistema',
    temporada = CURRENT_SEASON
) {
    // ✅ FIX: Adicionar upsert para criar documento se não existir
    // Quando usuário configura via modal sem ter ativado via toggle,
    // o documento não existe e o update falha silenciosamente.
    // Solução: criar com ativo=true automaticamente.
    return this.findOneAndUpdate(
        {
            liga_id: new mongoose.Types.ObjectId(ligaId),
            modulo: modulo,
            temporada: Number(temporada)
        },
        {
            $set: {
                wizard_respostas: respostas,
                atualizado_por: usuario,
                ativo: true, // ✅ Ativar módulo ao configurar
                ativado_em: new Date()
            }
        },
        {
            new: true,
            upsert: true, // ✅ Criar se não existir
            runValidators: true,
            setDefaultsOnInsert: true
        }
    );
};

// =============================================================================
// MÉTODOS DE INSTÂNCIA
// =============================================================================

/**
 * Retorna valor financeiro efetivo (override ou default do JSON)
 * @param {Object} defaultFromJson - Valor default do JSON
 * @returns {Object} Valor efetivo a usar
 */
ModuleConfigSchema.methods.getFinanceiroEfetivo = function(defaultFromJson) {
    // Se tem override, usa override
    if (this.financeiro_override) {
        const override = this.financeiro_override;

        // Mescla com defaults, override tem prioridade
        if (override.valores_por_fase) {
            return { ...defaultFromJson, ...override.valores_por_fase };
        }
        if (override.valores_por_posicao) {
            return { ...defaultFromJson, ...override.valores_por_posicao };
        }
        if (override.valores_simples) {
            const simples = {};
            if (override.valores_simples.vitoria !== null) {
                simples.vitoria = override.valores_simples.vitoria;
            }
            if (override.valores_simples.derrota !== null) {
                simples.derrota = override.valores_simples.derrota;
            }
            if (override.valores_simples.empate !== null) {
                simples.empate = override.valores_simples.empate;
            }
            return { ...defaultFromJson, ...simples };
        }
    }

    // Se não tem override, usa default do JSON
    return defaultFromJson;
};

/**
 * Retorna calendário efetivo (override ou default do JSON)
 * @param {Array} defaultFromJson - Calendário default do JSON
 * @returns {Array} Calendário efetivo a usar
 */
ModuleConfigSchema.methods.getCalendarioEfetivo = function(defaultFromJson) {
    if (this.calendario_override && this.calendario_override.length > 0) {
        return this.calendario_override;
    }
    return defaultFromJson;
};

// =============================================================================
// EXPORT
// =============================================================================

const ModuleConfig = mongoose.model("ModuleConfig", ModuleConfigSchema);
export default ModuleConfig;
