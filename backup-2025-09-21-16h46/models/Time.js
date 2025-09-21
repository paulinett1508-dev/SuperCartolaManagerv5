import mongoose from "mongoose";

// Definir o schema do Time
const TimeSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  nome_time: { type: String, required: true },
  nome_cartoleiro: { type: String, required: true },
  url_escudo_png: { type: String },
  clube_id: { type: Number },
});

// Exportar o modelo usando um padrão singleton
const Time = mongoose.models.Time || mongoose.model("Time", TimeSchema);

export default Time;
