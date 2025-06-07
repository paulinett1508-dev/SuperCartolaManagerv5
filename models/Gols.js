import mongoose from "mongoose";

const GolsSchema = new mongoose.Schema(
  {
    nome_cartola: { type: String, required: true },
    apelido: { type: String, required: true },
    G: { type: Number, required: true },
    rodada: { type: Number, required: true },
    time_id: { type: Number, required: true },
  },
  { timestamps: true },
);

const Gols = mongoose.model("Gols", GolsSchema);
export default Gols;
