
import mongoose from 'mongoose';

const RodadaSnapshotSchema = new mongoose.Schema({
    liga_id: { type: String, required: true, index: true },
    rodada: { type: Number, required: true, index: true },
    
    dados_consolidados: {
        ranking_geral: { type: Array, default: [] },
        times_stats: { type: Array, default: [] },
        confrontos_mata_mata: { type: Array, default: [] },
        confrontos_pontos_corridos: { type: Array, default: [] },
        tabela_pontos_corridos: { type: Array, default: [] },
        melhor_mes: { type: Object, default: {} },
        top10: { type: Array, default: [] },
        destaques: { type: Object, default: {} }
    },
    
    status_mercado: {
        rodada_atual: Number,
        mes_atual: Number,
        fecha_timezone: String,
        timestamp_consolidacao: Date
    },
    
    criado_em: { type: Date, default: Date.now },
    atualizado_em: { type: Date, default: Date.now }
});

RodadaSnapshotSchema.index({ liga_id: 1, rodada: 1 }, { unique: true });

export default mongoose.model('RodadaSnapshot', RodadaSnapshotSchema);
