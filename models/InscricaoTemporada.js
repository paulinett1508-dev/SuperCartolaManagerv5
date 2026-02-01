/**
 * Model: InscricaoTemporada
 *
 * Registra a decisão de cada participante sobre renovação para nova temporada.
 * Armazena histórico completo: status, saldos transferidos, aprovações.
 *
 * @version 1.0.0
 * @since 2026-01-04
 */

import mongoose from "mongoose";
import { CURRENT_SEASON } from "../config/seasons.js";

const InscricaoTemporadaSchema = new mongoose.Schema({
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
    // STATUS DA INSCRIÇÃO
    // =========================================================================
    status: {
        type: String,
        enum: ['pendente', 'renovado', 'nao_participa', 'novo'],
        default: 'pendente',
        index: true
    },

    // =========================================================================
    // DADOS DO PARTICIPANTE (Snapshot no momento da inscrição)
    // =========================================================================
    dados_participante: {
        nome_time: { type: String, default: '' },
        nome_cartoleiro: { type: String, default: '' },
        escudo: { type: String, default: '' },
        id_cartola_oficial: { type: Number } // Sempre o ID oficial da API Cartola
    },

    // =========================================================================
    // SITUAÇÃO FINANCEIRA DA TEMPORADA ANTERIOR
    // =========================================================================
    temporada_anterior: {
        temporada: { type: Number },
        saldo_final: { type: Number, default: 0 },
        status_quitacao: {
            type: String,
            enum: ['quitado', 'credor', 'devedor'],
            default: 'quitado'
        }
    },

    // =========================================================================
    // VALORES DE TRANSFERÊNCIA
    // =========================================================================

    // Crédito aproveitado da temporada anterior (positivo)
    saldo_transferido: {
        type: Number,
        default: 0
    },

    // Taxa de inscrição da nova temporada
    taxa_inscricao: {
        type: Number,
        default: 0
    },

    // Dívida carregada da temporada anterior (positivo = deve)
    divida_anterior: {
        type: Number,
        default: 0
    },

    // Saldo inicial na nova temporada
    // Fórmula: taxa_inscricao + divida_anterior - saldo_transferido (se não pagou inscrição)
    // Se pagou inscrição, taxa não entra no cálculo
    // Positivo = deve, Negativo = crédito
    saldo_inicial_temporada: {
        type: Number,
        default: 0
    },

    // Se a taxa de inscrição foi paga no ato da renovação
    // true = pagou (não vira débito no extrato, apenas registro)
    // false = não pagou (taxa vira débito no extrato)
    pagou_inscricao: {
        type: Boolean,
        default: true
    },

    // =========================================================================
    // ORIGEM E DECISÃO
    // =========================================================================
    origem: {
        type: String,
        enum: ['renovacao', 'novo_cadastro', 'cadastro_manual'],
        default: 'renovacao'
    },

    data_decisao: {
        type: Date
    },

    aprovado_por: {
        type: String,
        default: ''
    },

    observacoes: {
        type: String,
        default: ''
    },

    // =========================================================================
    // CONTROLE DE PROCESSAMENTO
    // =========================================================================

    // Se já foi processado (criou transações iniciais no extrato 2026)
    processado: {
        type: Boolean,
        default: false
    },

    data_processamento: {
        type: Date
    },

    // IDs das transações criadas (para auditoria)
    transacoes_criadas: [{
        tipo: String,       // 'INSCRICAO_TEMPORADA' | 'SALDO_TEMPORADA_ANTERIOR'
        valor: Number,
        ref_id: String      // ID do documento criado
    }],

    // =========================================================================
    // LEGADO MANUAL (Quitação pelo Admin)
    // =========================================================================
    // Quando admin usa "Quitar Dívida" na temporada anterior,
    // este campo armazena a decisão manual do legado
    legado_manual: {
        origem: {
            type: String,
            enum: ['quitacao_admin', 'acordo', 'decisao_unificada', null],  // null permitido
            default: undefined  // undefined não dispara validação
        },
        valor_original: { type: Number },      // Saldo original antes da quitação
        valor_definido: { type: Number },      // Valor que o admin definiu carregar
        tipo_quitacao: {
            type: String,
            enum: ['zerado', 'integral', 'customizado', null]
        },
        observacao: { type: String },
        admin_responsavel: { type: String },
        data_quitacao: { type: Date }
    }

}, {
    timestamps: {
        createdAt: 'criado_em',
        updatedAt: 'atualizado_em'
    },
    collection: 'inscricoestemporada'
});

// =============================================================================
// ÍNDICES
// =============================================================================

// Índice composto único: apenas uma inscrição por participante/liga/temporada
InscricaoTemporadaSchema.index(
    { liga_id: 1, time_id: 1, temporada: 1 },
    { unique: true }
);

// Índice para buscar por status
InscricaoTemporadaSchema.index({ liga_id: 1, temporada: 1, status: 1 });

// =============================================================================
// MÉTODOS ESTÁTICOS
// =============================================================================

/**
 * Busca inscrição de um participante
 * @param {string|ObjectId} ligaId - ID da liga
 * @param {number} timeId - ID do time
 * @param {number} temporada - Temporada
 * @returns {Promise<Object|null>}
 */
InscricaoTemporadaSchema.statics.buscarPorParticipante = async function(ligaId, timeId, temporada = CURRENT_SEASON) {
    return this.findOne({
        liga_id: new mongoose.Types.ObjectId(ligaId),
        time_id: Number(timeId),
        temporada: Number(temporada)
    }).lean();
};

/**
 * Lista todas as inscrições de uma liga/temporada
 * @param {string|ObjectId} ligaId - ID da liga
 * @param {number} temporada - Temporada
 * @param {string} status - Filtrar por status (opcional)
 * @returns {Promise<Array>}
 */
InscricaoTemporadaSchema.statics.listarPorLiga = async function(ligaId, temporada = CURRENT_SEASON, status = null) {
    const query = {
        liga_id: new mongoose.Types.ObjectId(ligaId),
        temporada: Number(temporada)
    };

    if (status) {
        query.status = status;
    }

    return this.find(query).sort({ 'dados_participante.nome_cartoleiro': 1 }).lean();
};

/**
 * Retorna estatísticas de inscrições da liga
 * @param {string|ObjectId} ligaId - ID da liga
 * @param {number} temporada - Temporada
 * @returns {Promise<Object>} { pendentes, renovados, naoParticipa, novos, total }
 */
InscricaoTemporadaSchema.statics.estatisticas = async function(ligaId, temporada = CURRENT_SEASON) {
    const resultado = await this.aggregate([
        {
            $match: {
                liga_id: new mongoose.Types.ObjectId(ligaId),
                temporada: Number(temporada)
            }
        },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);

    const stats = {
        pendentes: 0,
        renovados: 0,
        nao_participa: 0,
        novos: 0,
        total: 0
    };

    resultado.forEach(r => {
        if (r._id === 'pendente') stats.pendentes = r.count;
        else if (r._id === 'renovado') stats.renovados = r.count;
        else if (r._id === 'nao_participa') stats.nao_participa = r.count;
        else if (r._id === 'novo') stats.novos = r.count;
        stats.total += r.count;
    });

    return stats;
};

/**
 * Cria ou atualiza inscrição (upsert)
 * @param {Object} dados - Dados da inscrição
 * @returns {Promise<Object>}
 */
InscricaoTemporadaSchema.statics.upsert = async function(dados) {
    const { liga_id, time_id, temporada, ...resto } = dados;

    return this.findOneAndUpdate(
        {
            liga_id: new mongoose.Types.ObjectId(liga_id),
            time_id: Number(time_id),
            temporada: Number(temporada)
        },
        {
            $set: {
                liga_id: new mongoose.Types.ObjectId(liga_id),
                time_id: Number(time_id),
                temporada: Number(temporada),
                ...resto
            }
        },
        { upsert: true, new: true, runValidators: true }
    );
};

/**
 * Inicializa inscrições pendentes para todos os participantes de uma liga
 * Usado quando abre o período de renovação
 * @param {string|ObjectId} ligaId - ID da liga
 * @param {number} temporadaOrigem - Temporada de origem (para buscar participantes)
 * @param {number} temporadaDestino - Nova temporada
 * @returns {Promise<number>} Quantidade de inscrições criadas
 */
InscricaoTemporadaSchema.statics.inicializarParaLiga = async function(ligaId, temporadaOrigem, temporadaDestino) {
    const Liga = mongoose.model('Liga');
    const liga = await Liga.findById(ligaId).lean();

    if (!liga || !liga.participantes) return 0;

    const operacoes = liga.participantes
        .filter(p => p.ativo !== false)
        .map(p => ({
            updateOne: {
                filter: {
                    liga_id: new mongoose.Types.ObjectId(ligaId),
                    time_id: Number(p.time_id),
                    temporada: Number(temporadaDestino)
                },
                update: {
                    $setOnInsert: {
                        liga_id: new mongoose.Types.ObjectId(ligaId),
                        time_id: Number(p.time_id),
                        temporada: Number(temporadaDestino),
                        status: 'pendente',
                        origem: 'renovacao',
                        dados_participante: {
                            nome_time: p.nome_time || '',
                            nome_cartoleiro: p.nome_cartola || p.nome_cartoleiro || '',
                            escudo: p.escudo_url || p.foto_time || '',
                            id_cartola_oficial: Number(p.time_id)
                        },
                        temporada_anterior: {
                            temporada: temporadaOrigem
                        }
                    }
                },
                upsert: true
            }
        }));

    if (operacoes.length === 0) return 0;

    const resultado = await this.bulkWrite(operacoes);
    return resultado.upsertedCount || 0;
};

// =============================================================================
// MÉTODOS DE INSTÂNCIA
// =============================================================================

/**
 * Verifica se a inscrição está pendente
 * @returns {boolean}
 */
InscricaoTemporadaSchema.methods.isPendente = function() {
    return this.status === 'pendente';
};

/**
 * Verifica se o participante vai participar (renovado ou novo)
 * @returns {boolean}
 */
InscricaoTemporadaSchema.methods.vaiParticipar = function() {
    return this.status === 'renovado' || this.status === 'novo';
};

/**
 * Calcula o saldo inicial baseado nos valores
 * ✅ v2.0.0: Alinhado com LigaRules.calcularValorInscricao
 *
 * Lógica:
 * - Se pagou_inscricao = true → taxa NÃO vira débito
 * - Crédito (saldo_transferido) só abate a taxa se NÃO pagou inscrição
 *   e é limitado ao valor da taxa (não pode ter crédito > taxa)
 * - Dívida anterior sempre é carregada
 *
 * @returns {number} Saldo inicial (positivo = deve, negativo = crédito)
 */
InscricaoTemporadaSchema.methods.calcularSaldoInicial = function() {
    const taxa = this.taxa_inscricao || 0;
    const pagouInscricao = this.pagou_inscricao === true;
    const saldoTransferido = this.saldo_transferido || 0;
    const dividaAnterior = this.divida_anterior || 0;

    // Taxa só vira dívida se NÃO pagou
    const taxaComoDivida = pagouInscricao ? 0 : taxa;

    // Crédito: só aplica se NÃO pagou inscrição e tem saldo positivo
    // Limitado ao valor da taxa (alinhado com LigaRules)
    let credito = 0;
    if (saldoTransferido > 0 && !pagouInscricao) {
        credito = Math.min(saldoTransferido, taxa);
    }

    // Total = taxa (se não pagou) + dívida anterior - crédito usado
    return taxaComoDivida + dividaAnterior - credito;
};

/**
 * Marca como processado
 * @param {Array} transacoes - Array de transações criadas
 * @returns {Promise}
 */
InscricaoTemporadaSchema.methods.marcarProcessado = async function(transacoes = []) {
    this.processado = true;
    this.data_processamento = new Date();
    this.transacoes_criadas = transacoes;
    return this.save();
};

// =============================================================================
// VIRTUAL
// =============================================================================

/**
 * Nome formatado do participante
 */
InscricaoTemporadaSchema.virtual('nomeCompleto').get(function() {
    const nome = this.dados_participante?.nome_cartoleiro || '';
    const time = this.dados_participante?.nome_time || '';
    return nome ? `${nome} (${time})` : time;
});

// =============================================================================
// EXPORT
// =============================================================================

const InscricaoTemporada = mongoose.model("InscricaoTemporada", InscricaoTemporadaSchema);
export default InscricaoTemporada;
