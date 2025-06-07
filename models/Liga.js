import mongoose from "mongoose";

const ligaSchema = new mongoose.Schema({
  nome: { type: String, required: true, trim: true, index: true },
  times: [{ type: Number, ref: "Time" }],
  criadaEm: { type: Date, default: Date.now },
});

export default mongoose.model("Liga", ligaSchema);
