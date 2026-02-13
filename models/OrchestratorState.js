/**
 * ORCHESTRATOR STATE MODEL v1.0.0
 *
 * Persiste o estado completo do Round-Market Orchestrator no MongoDB.
 * Sobrevive a restarts do servidor, permitindo retomar o ciclo
 * exatamente de onde parou.
 *
 * Collection: orchestrator_states
 */

import mongoose from "mongoose";

const eventLogSchema = new mongoose.Schema({
    tipo: { type: String, required: true },
    de: { type: Number, default: null },
    para: { type: Number, default: null },
    rodada: { type: Number, default: null },
    detalhes: { type: mongoose.Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now },
}, { _id: false });

const managerStatusSchema = new mongoose.Schema({
    managerId: { type: String, required: true },
    status: {
        type: String,
        enum: ["idle", "coletando", "processando", "consolidando", "erro", "concluido"],
        default: "idle",
    },
    ultimaExecucao: { type: Date, default: null },
    ultimoErro: { type: String, default: null },
    dadosColetados: { type: Number, default: 0 },
}, { _id: false });

const orchestratorStateSchema = new mongoose.Schema({
    chave: {
        type: String,
        required: true,
        unique: true,
        index: true,
        default: "round_market_orchestrator",
    },

    // Estado do mercado
    status_mercado: { type: Number, default: null },
    status_mercado_anterior: { type: Number, default: null },
    rodada_atual: { type: Number, default: null },
    temporada: { type: Number, default: null },

    // Fase do ciclo de vida da rodada
    fase_rodada: {
        type: String,
        enum: [
            "aguardando",         // Mercado aberto, aguardando fechar
            "coletando_dados",    // Mercado fechou, coletando dados dos módulos
            "atualizando_live",   // Atualizando parciais em tempo real
            "finalizando",        // Rodada acabou, processando resultados
            "consolidando",       // Consolidando dados de todos os módulos
            "concluida",          // Tudo processado para esta rodada
            "erro",               // Erro durante processamento
        ],
        default: "aguardando",
    },

    // Status dos managers
    managers: [managerStatusSchema],

    // Log de eventos (últimos 50)
    eventos: [eventLogSchema],

    // Controle de polling
    polling_ativo: { type: Boolean, default: false },
    polling_intervalo_ms: { type: Number, default: 120000 }, // 2 min
    ultimo_poll: { type: Date, default: null },

    // Controle de consolidação
    consolidacao_em_andamento: { type: Boolean, default: false },
    ultima_consolidacao: { type: Date, default: null },
    rodadas_consolidadas: [{ type: Number }],

    // Métricas
    total_transicoes: { type: Number, default: 0 },
    total_consolidacoes: { type: Number, default: 0 },
    total_erros: { type: Number, default: 0 },
    uptime_inicio: { type: Date, default: Date.now },

    atualizado_em: { type: Date, default: Date.now },
}, {
    timestamps: true,
    collection: "orchestrator_states",
});

// Salvar/atualizar estado do orquestrador
orchestratorStateSchema.statics.salvar = async function(dados) {
    const update = {
        $set: {
            ...dados,
            atualizado_em: new Date(),
        },
    };

    return this.findOneAndUpdate(
        { chave: "round_market_orchestrator" },
        update,
        { upsert: true, new: true },
    );
};

// Carregar estado
orchestratorStateSchema.statics.carregar = async function() {
    return this.findOne({ chave: "round_market_orchestrator" }).lean();
};

// Registrar evento (manter últimos 50)
orchestratorStateSchema.statics.registrarEvento = async function(evento) {
    return this.findOneAndUpdate(
        { chave: "round_market_orchestrator" },
        {
            $push: {
                eventos: {
                    $each: [{ ...evento, timestamp: new Date() }],
                    $slice: -50,
                },
            },
            $set: { atualizado_em: new Date() },
        },
        { upsert: true, new: true },
    );
};

// Atualizar status de um manager
orchestratorStateSchema.statics.atualizarManager = async function(managerId, status) {
    const doc = await this.findOne({ chave: "round_market_orchestrator" });
    if (!doc) return null;

    const idx = doc.managers.findIndex(m => m.managerId === managerId);
    if (idx >= 0) {
        doc.managers[idx] = { ...doc.managers[idx].toObject(), ...status, managerId };
    } else {
        doc.managers.push({ managerId, ...status });
    }

    doc.atualizado_em = new Date();
    return doc.save();
};

const OrchestratorState = mongoose.model("OrchestratorState", orchestratorStateSchema);

export default OrchestratorState;
