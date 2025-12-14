/**
 * UserActivity Model v1.0
 * Rastreia atividade de usuários do app participante para monitoramento em tempo real
 */

import mongoose from 'mongoose';

const userActivitySchema = new mongoose.Schema({
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
    ultimo_acesso: {
        type: Date,
        default: Date.now,
        index: true
    },
    modulo_atual: {
        type: String,
        default: 'home'
    },
    dispositivo: {
        type: String,
        enum: ['Mobile', 'Desktop', 'Tablet'],
        default: 'Mobile'
    },
    user_agent: {
        type: String,
        default: ''
    },
    session_id: {
        type: String,
        default: ''
    }
}, {
    timestamps: {
        createdAt: 'criado_em',
        updatedAt: 'atualizado_em'
    }
});

// Index composto para busca por time_id + liga_id (upsert)
userActivitySchema.index({ time_id: 1, liga_id: 1 }, { unique: true });

// TTL Index: Remove documentos com mais de 24 horas de inatividade
userActivitySchema.index({ ultimo_acesso: 1 }, { expireAfterSeconds: 86400 });

// Método estático para buscar usuários online (últimos X minutos)
userActivitySchema.statics.getUsuariosOnline = async function(minutosAtras = 5) {
    const tempoLimite = new Date(Date.now() - minutosAtras * 60 * 1000);

    return this.find({
        ultimo_acesso: { $gte: tempoLimite }
    })
    .sort({ ultimo_acesso: -1 })
    .lean();
};

// Método estático para atualizar ou criar atividade
userActivitySchema.statics.registrarAtividade = async function(dados) {
    const { time_id, liga_id, ...resto } = dados;

    return this.findOneAndUpdate(
        { time_id, liga_id },
        {
            $set: {
                ...resto,
                ultimo_acesso: new Date()
            }
        },
        {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true
        }
    );
};

// Método estático para contar usuários online por liga
userActivitySchema.statics.contarOnlinePorLiga = async function(minutosAtras = 5) {
    const tempoLimite = new Date(Date.now() - minutosAtras * 60 * 1000);

    return this.aggregate([
        { $match: { ultimo_acesso: { $gte: tempoLimite } } },
        { $group: { _id: '$liga_id', count: { $sum: 1 }, liga_nome: { $first: '$liga_nome' } } },
        { $sort: { count: -1 } }
    ]);
};

const UserActivity = mongoose.model('UserActivity', userActivitySchema);

export default UserActivity;
