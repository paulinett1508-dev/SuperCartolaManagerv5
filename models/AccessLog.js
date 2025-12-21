/**
 * AccessLog Model v1.0
 * Registra histórico de acessos para análise de 30 dias
 *
 * Diferente do UserActivity (tempo real), este modelo:
 * - Mantém histórico de 30 dias (TTL)
 * - Registra 1 log por sessão única
 * - Permite análise de padrões de acesso
 */

import mongoose from 'mongoose';

const accessLogSchema = new mongoose.Schema({
    time_id: {
        type: Number,
        required: true,
        index: true
    },
    liga_id: {
        type: String,
        required: true,
        index: true
    },
    nome_time: {
        type: String,
        default: ''
    },
    nome_cartola: {
        type: String,
        default: ''
    },
    escudo: {
        type: String,
        default: ''
    },
    liga_nome: {
        type: String,
        default: ''
    },
    data_acesso: {
        type: Date,
        default: Date.now,
        index: true
    },
    session_id: {
        type: String,
        required: true
    },
    dispositivo: {
        type: String,
        enum: ['Mobile', 'Desktop', 'Tablet'],
        default: 'Mobile'
    },
    modulo_entrada: {
        type: String,
        default: 'home'
    }
});

// Index composto para evitar duplicatas na mesma sessão
accessLogSchema.index({ time_id: 1, session_id: 1 }, { unique: true });

// Index composto para queries de histórico por liga
accessLogSchema.index({ liga_id: 1, data_acesso: -1 });

// TTL Index: Remove documentos com mais de 30 dias
accessLogSchema.index({ data_acesso: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

/**
 * Registra acesso único por sessão (upsert)
 */
accessLogSchema.statics.registrarAcesso = async function(dados) {
    const { time_id, session_id, ...resto } = dados;

    try {
        return await this.findOneAndUpdate(
            { time_id, session_id },
            {
                $setOnInsert: {
                    time_id,
                    session_id,
                    data_acesso: new Date(),
                    ...resto
                }
            },
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true
            }
        );
    } catch (error) {
        // Ignorar erro de duplicata (já existe log para esta sessão)
        if (error.code === 11000) {
            return null;
        }
        throw error;
    }
};

/**
 * Busca histórico de acessos agrupado por usuário
 * @param {Object} filtros - { liga_id, dias }
 * @param {Object} paginacao - { page, limit }
 */
accessLogSchema.statics.getHistoricoAgrupado = async function(filtros = {}, paginacao = {}) {
    const { liga_id, dias = 30 } = filtros;
    const { page = 1, limit = 50 } = paginacao;

    const dataLimite = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);

    const matchStage = {
        data_acesso: { $gte: dataLimite }
    };

    if (liga_id) {
        matchStage.liga_id = liga_id;
    }

    const pipeline = [
        { $match: matchStage },
        {
            $group: {
                _id: { time_id: '$time_id', liga_id: '$liga_id' },
                nome_time: { $first: '$nome_time' },
                nome_cartola: { $first: '$nome_cartola' },
                escudo: { $first: '$escudo' },
                liga_nome: { $first: '$liga_nome' },
                total_acessos: { $sum: 1 },
                ultimo_acesso: { $max: '$data_acesso' },
                primeiro_acesso: { $min: '$data_acesso' },
                dispositivos: { $addToSet: '$dispositivo' }
            }
        },
        { $sort: { total_acessos: -1, ultimo_acesso: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit }
    ];

    const usuarios = await this.aggregate(pipeline);

    // Contar total de usuários únicos
    const totalPipeline = [
        { $match: matchStage },
        {
            $group: {
                _id: { time_id: '$time_id', liga_id: '$liga_id' }
            }
        },
        { $count: 'total' }
    ];

    const totalResult = await this.aggregate(totalPipeline);
    const totalUsuarios = totalResult[0]?.total || 0;

    // Contar total de acessos
    const acessosPipeline = [
        { $match: matchStage },
        { $count: 'total' }
    ];

    const acessosResult = await this.aggregate(acessosPipeline);
    const totalAcessos = acessosResult[0]?.total || 0;

    return {
        usuarios: usuarios.map(u => ({
            time_id: u._id.time_id,
            liga_id: u._id.liga_id,
            nome_time: u.nome_time || 'Time',
            nome_cartola: u.nome_cartola || '',
            escudo: u.escudo || '',
            liga_nome: u.liga_nome || 'Liga',
            total_acessos: u.total_acessos,
            ultimo_acesso: u.ultimo_acesso,
            primeiro_acesso: u.primeiro_acesso,
            dispositivos: u.dispositivos
        })),
        total_usuarios: totalUsuarios,
        total_acessos: totalAcessos,
        page,
        limit,
        has_more: (page * limit) < totalUsuarios
    };
};

/**
 * Lista ligas com acessos no período
 */
accessLogSchema.statics.getLigasComAcessos = async function(dias = 30) {
    const dataLimite = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);

    return this.aggregate([
        { $match: { data_acesso: { $gte: dataLimite } } },
        {
            $group: {
                _id: '$liga_id',
                liga_nome: { $first: '$liga_nome' },
                total_acessos: { $sum: 1 },
                usuarios_unicos: { $addToSet: '$time_id' }
            }
        },
        {
            $project: {
                liga_id: '$_id',
                liga_nome: 1,
                total_acessos: 1,
                usuarios_unicos: { $size: '$usuarios_unicos' }
            }
        },
        { $sort: { total_acessos: -1 } }
    ]);
};

const AccessLog = mongoose.model('AccessLog', accessLogSchema);

export default AccessLog;
