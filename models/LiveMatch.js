// models/LiveMatch.js
// Model para partidas ao vivo (Live Results)
import mongoose from 'mongoose';

const LiveMatchSchema = new mongoose.Schema({
  liga_id: { type: String, required: true, index: true },
  matchId: { type: String, required: true, index: true },
  timeCasa: { type: String, required: true },
  timeFora: { type: String, required: true },
  placarCasa: { type: Number, default: 0 },
  placarFora: { type: Number, default: 0 },
  status: { type: String, enum: ['nao-iniciado', 'em-andamento', 'finalizado'], default: 'nao-iniciado' },
  eventos: [{
    minuto: Number,
    tipo: String, // gol, cartao, substituicao, etc
    descricao: String,
    jogador: String
  }],
  atualizadoEm: { type: Date, default: Date.now }
}, { timestamps: true });

LiveMatchSchema.index({ liga_id: 1, matchId: 1 }, { unique: true });

const LiveMatch = mongoose.model('LiveMatch', LiveMatchSchema);
export default LiveMatch;
