// models/Rodada.js

import mongoose from "mongoose";

const RodadaSchema = new mongoose.Schema({
  ligaId: { type: mongoose.Schema.Types.ObjectId, ref: "Liga", required: true },
  rodada: { type: Number, required: true },
  timeId: { type: Number, required: true },
  nome_cartola: { type: String, default: "N/D" },
  nome_time: { type: String, default: "N/D" },
  escudo: { type: String, default: "" },
  clube_id: { type: Number }, // ID do clube do coração
  escudo_time_do_coracao: { type: String }, // URL do escudo 30x30
  pontos: { type: Number, default: 0 },
  rodadaNaoJogada: { type: Boolean, default: false },
});

export default mongoose.model("Rodada", RodadaSchema);
