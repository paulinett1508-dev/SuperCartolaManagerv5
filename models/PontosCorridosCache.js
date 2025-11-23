// models/PontosCorridosCache.js
import mongoose from 'mongoose';

const PontosCorridosCacheSchema = new mongoose.Schema({
    liga_id: { type: String, required: true, index: true },
    rodada_consolidada: { type: Number, required: true }, // Até qual rodada este ranking vai

    // O "Retrato" da tabela prontinha
    classificacao: [{
        time_id: Number,
        nome_time: String,
        nome_cartola: String,
        slug_time: String,
        escudo_url: String,
        pontos_totais: Number,
        jogos_jogados: Number,
        media: Number,
        variacao: Number, // Posições que subiu/desceu
        posicao_atual: Number,
        posicao_anterior: Number,

        // Dados financeiros pré-calculados (opcional, mas ajuda muito)
        ganhos_acumulados: Number
    }],

    ultima_atualizacao: { type: Date, default: Date.now }
}, { strict: false }); // Strict false permite flexibilidade futura

// Índice composto para busca rápida
PontosCorridosCacheSchema.index({ liga_id: 1, rodada_consolidada: 1 }, { unique: true });

export default mongoose.model('PontosCorridosCache', PontosCorridosCacheSchema);