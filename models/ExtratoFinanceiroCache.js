import mongoose from "mongoose";

const ExtratoFinanceiroCacheSchema = new mongoose.Schema(
  {
    liga_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Liga",
      required: true,
      index: true,
    },
    time_id: { type: Number, required: true, index: true }, // ID do time no Cartola

    // Controle de Consolidação
    ultima_rodada_consolidada: { type: Number, default: 0 }, // Até qual rodada os valores estão fechados
    data_ultima_atualizacao: { type: Date, default: Date.now },
    
    // ✅ NOVO: Controle de Cache Permanente
    cache_permanente: { type: Boolean, default: false }, // true = rodadas fechadas, nunca recalcular
    versao_calculo: { type: String, default: "3.0.0" }, // Versionamento para migração futura
    rodadas_imutaveis: [Number], // Array de rodadas que nunca mudam (1,2,3...N-1)

    // Valores Consolidados (Soma de tudo até a última rodada consolidada)
    saldo_consolidado: { type: Number, default: 0 },
    ganhos_consolidados: { type: Number, default: 0 },
    perdas_consolidadas: { type: Number, default: 0 },

    // Histórico de Transações (Json estático das rodadas já fechadas para exibição rápida)
    historico_transacoes: [
      {
        rodada: Number,
        tipo: String, // 'PREMIACAO', 'MULTA', 'MENSALIDADE'
        descricao: String,
        valor: Number,
        data: Date,
      },
    ],
    
    // ✅ NOVO: Metadados para debug e auditoria
    metadados: {
      versaoCalculo: String,
      timestampCalculo: Date,
      motivoRecalculo: String,
      origem: String, // 'admin', 'participante', 'cron'
    },
  },
  {
    timestamps: true,
  },
);

// Índice composto para busca rápida de um time específico em uma liga
ExtratoFinanceiroCacheSchema.index(
  { liga_id: 1, time_id: 1 },
  { unique: true },
);

const ExtratoFinanceiroCache =
  mongoose.models.ExtratoFinanceiroCache ||
  mongoose.model("ExtratoFinanceiroCache", ExtratoFinanceiroCacheSchema);

export default ExtratoFinanceiroCache;
