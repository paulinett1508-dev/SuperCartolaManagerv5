
import mongoose from "mongoose";

const participanteSchema = new mongoose.Schema(
    {
        time_id: { type: Number, required: true },
        nome_cartola: { type: String, default: "" },
        nome_time: { type: String, default: "" },
        clube_id: { type: Number, default: null },
        foto_perfil: { type: String, default: "" },
        foto_time: { type: String, default: "" },
        assinante: { type: Boolean, default: false },
        rodada_time_id: { type: Number, default: null },
        senha_acesso: { type: String, default: "" }, // NOVA: Senha para acessar extrato
    },
    { _id: false }
);

const ligaSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    descricao: { type: String, default: "" },
    tipo: { type: String, enum: ["publica", "privada"], default: "publica" },
    times: [{ type: Number }], // Array de IDs dos times da liga
    participantes: [participanteSchema],
    configuracoes: {
        pontos_corridos: { type: Object, default: {} },
        mata_mata: { type: Object, default: {} },
    },
    criadaEm: { type: Date, default: Date.now },
    atualizadaEm: { type: Date, default: Date.now },
});

const Liga = mongoose.model("Liga", ligaSchema);

export default Liga;
