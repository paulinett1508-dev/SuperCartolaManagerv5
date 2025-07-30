// models/Rodada.js - VERSÃO OTIMIZADA
import mongoose from "mongoose";

const RodadaSchema = new mongoose.Schema({
  ligaId: { type: mongoose.Schema.Types.ObjectId, ref: "Liga", required: true },
  rodada: { type: Number, required: true },
  timeId: { type: Number, required: true },
  nome_cartola: { type: String, default: "N/D" },
  nome_time: { type: String, default: "N/D" },
  escudo: { type: String, default: "" },
  clube_id: { type: Number },
  escudo_time_do_coracao: { type: String },
  pontos: { type: Number, default: 0 },
  rodadaNaoJogada: { type: Boolean, default: false },
});

// ⚡ ÍNDICES ESSENCIAIS PARA PERFORMANCE
RodadaSchema.index({ ligaId: 1, rodada: 1 }, { background: true });
RodadaSchema.index({ ligaId: 1, timeId: 1 }, { background: true });
RodadaSchema.index({ ligaId: 1, rodada: 1, timeId: 1 }, { background: true, unique: true });
RodadaSchema.index({ pontos: -1 }, { background: true }); // Para rankings

export default mongoose.model("Rodada", RodadaSchema);

// ==========================================

// models/Liga.js - VERSÃO OTIMIZADA
import mongoose from "mongoose";

// Validador para limitar array de times
function arrayLimit(val) {
  return val.length <= 100; // Limite razoável para escalabilidade
}

const ligaSchema = new mongoose.Schema({
  nome: { 
    type: String, 
    required: true, 
    trim: true, 
    index: true,
    maxlength: [100, 'Nome da liga não pode exceder 100 caracteres']
  },
  times: { 
    type: [{ type: Number, ref: "Time" }],
    validate: [arrayLimit, 'Liga não pode ter mais de 100 times'],
    default: []
  },
  criadaEm: { type: Date, default: Date.now },
  ativa: { type: Boolean, default: true }, // Para soft delete
}, {
  timestamps: true // Adiciona createdAt e updatedAt automaticamente
});

// ⚡ ÍNDICES PARA PERFORMANCE
ligaSchema.index({ nome: 1 }, { background: true });
ligaSchema.index({ ativa: 1 }, { background: true });
ligaSchema.index({ criadaEm: -1 }, { background: true });

export default mongoose.model("Liga", ligaSchema);

// ==========================================

// models/Time.js - VERSÃO OTIMIZADA
import mongoose from "mongoose";

const TimeSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  nome_time: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: [100, 'Nome do time não pode exceder 100 caracteres']
  },
  nome_cartoleiro: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: [100, 'Nome do cartoleiro não pode exceder 100 caracteres']
  },
  url_escudo_png: { type: String, trim: true },
  clube_id: { type: Number },
  ativo: { type: Boolean, default: true }, // Para soft delete
}, {
  timestamps: true
});

// ⚡ ÍNDICES PARA PERFORMANCE
TimeSchema.index({ id: 1 }, { unique: true, background: true });
TimeSchema.index({ nome_time: 1 }, { background: true });
TimeSchema.index({ nome_cartoleiro: 1 }, { background: true });
TimeSchema.index({ clube_id: 1 }, { background: true });
TimeSchema.index({ ativo: 1 }, { background: true });

// Exportar o modelo usando singleton pattern (mantém lógica original)
const Time = mongoose.models.Time || mongoose.model("Time", TimeSchema);

export default Time;

// ==========================================

// config/database.js - VERSÃO OTIMIZADA
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Configurações modernas do Mongoose com connection pooling
const connectDB = async () => {
  try {
    // Configurações otimizadas para produção
    mongoose.set('strictQuery', false);

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // ⚡ CONNECTION POOLING PARA ESCALABILIDADE
      maxPoolSize: 10,        // Máximo 10 conexões simultâneas
      minPoolSize: 2,         // Mínimo 2 conexões mantidas
      maxIdleTimeMS: 30000,   // Fechar conexões ociosas após 30s
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,

      // Configurações para produção
      bufferMaxEntries: 0,
      bufferCommands: false,
    });

    console.log(`MongoDB conectado: ${conn.connection.host}`);

    // Event listeners para monitoramento da conexão
    mongoose.connection.on('connected', () => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Mongoose conectado ao MongoDB');
      }
    });

    mongoose.connection.on('error', (err) => {
      console.error('Erro na conexão MongoDB:', err);
    });

    mongoose.connection.on('disconnected', () => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Mongoose desconectado do MongoDB');
      }
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('Conexão MongoDB fechada devido ao encerramento da aplicação');
      process.exit(0);
    });

    return conn;
  } catch (error) {
    console.error('Erro ao conectar ao MongoDB:', error.message);
    process.exit(1);
  }
};

export default connectDB;