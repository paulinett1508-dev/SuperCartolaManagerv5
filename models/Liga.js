import mongoose from "mongoose";
import { CURRENT_SEASON } from "../config/seasons.js";

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
        senha_acesso: { type: String, default: "" },
        ativo: { type: Boolean, default: true }, // ✅ NOVO: Controle de participante ativo/inativo
        contato: { type: String, default: "" }, // ✅ v2.12: WhatsApp/telefone para contato direto
        premium: { type: Boolean, default: false }, // ✅ v2.13: Acesso a recursos PRO (Cartola PRO)
    },
    { _id: false },
);

const ligaSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    descricao: { type: String, default: "" },
    tipo: { type: String, enum: ["publica", "privada"], default: "publica" },

    // ✅ MULTI-TENANT: Ownership da liga
    admin_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Admin",
        index: true,
        // required: true -> será obrigatório após migração completa
    },
    owner_email: {
        type: String,
        lowercase: true,
        trim: true,
    },

    // ✅ BLINDAGEM: Marca ligas com dados históricos protegidos
    blindado: { type: Boolean, default: false },
    blindado_em: { type: Date, default: null },

    // ✅ TEMPORADA - Segregação de dados por ano
    temporada: {
        type: Number,
        required: true,
        default: CURRENT_SEASON,
        index: true,
    },
    times: [{ type: Number }], // Array de IDs dos times da liga
    participantes: [participanteSchema],
    configuracoes: {
        // ✅ Ranking por posição na rodada (BANCO - bônus/ônus)
        ranking_rodada: { type: Object, default: {} },
        pontos_corridos: { type: Object, default: {} },
        mata_mata: { type: Object, default: {} },
        top10: { type: Object, default: {} },
        melhor_mes: { type: Object, default: {} },
        artilheiro: { type: Object, default: {} },
        luva_ouro: { type: Object, default: {} },
        // ✅ Cards desabilitados no frontend
        cards_desabilitados: { type: Array, default: [] },
        // ✅ Status da temporada
        temporada_2025: { type: Object, default: {} },
    },
    // ✅ Controle granular de módulos ativos
    modulos_ativos: {
        type: Object,
        default: {
            extrato: true,
            ranking: true,
            rodadas: true,
            top10: true,
            melhorMes: true,
            pontosCorridos: true,
            mataMata: true,
            artilheiro: true,
            luvaOuro: true,
        },
    },
    criadaEm: { type: Date, default: Date.now },
    atualizadaEm: { type: Date, default: Date.now },
});

const Liga = mongoose.model("Liga", ligaSchema);

export default Liga;
