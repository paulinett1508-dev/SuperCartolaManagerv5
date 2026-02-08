import mongoose from 'mongoose';

const regraModuloSchema = new mongoose.Schema({
    liga_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    modulo: {
        type: String,
        required: true,
        index: true
    },
    titulo: {
        type: String,
        required: true
    },
    conteudo_html: {
        type: String,
        default: ''
    },
    icone: {
        type: String,
        default: 'description'
    },
    cor: {
        type: String,
        default: '#ff5500'
    },
    ordem: {
        type: Number,
        default: 0
    },
    ativo: {
        type: Boolean,
        default: true
    },
    atualizado_em: {
        type: Date,
        default: Date.now
    },
    atualizado_por: {
        type: String,
        default: ''
    }
}, {
    timestamps: { createdAt: 'criado_em', updatedAt: 'atualizado_em' },
    collection: 'regrasmodulos'
});

regraModuloSchema.index({ liga_id: 1, modulo: 1 }, { unique: true });

const RegraModulo = mongoose.model('RegraModulo', regraModuloSchema);

export default RegraModulo;
