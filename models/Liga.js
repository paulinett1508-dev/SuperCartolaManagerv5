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
        cartolaAuth: { // ✅ v2.14: Metadados de autenticacao Cartola (tokens ficam na sessao)
            type: new mongoose.Schema({
                email: { type: String, default: null },
                method: { type: String, enum: ['direct', 'oauth', 'capture', null], default: null },
                lastAuthAt: { type: Date, default: null }
            }, { _id: false }),
            default: null
        }
    },
    { _id: false },
);

const ligaSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    descricao: { type: String, default: "" },
    tipo: { type: String, enum: ["publica", "privada"], default: "publica" },

    // ✅ BRANDING: Logo da liga (path relativo)
    logo: { type: String, default: null },

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

    // ✅ STATUS DA LIGA - Controle de ligas ativas/aposentadas
    ativa: {
        type: Boolean,
        default: true,
        index: true,
    },
    status: {
        type: String,
        enum: ['ativa', 'aposentada', 'suspensa', null],
        default: null,
    },
    aposentada_em: { type: Date, default: null },
    aposentada_motivo: { type: String, default: null },

    // ✅ HISTÓRICO - Dados de temporadas anteriores
    historico: { type: Object, default: {} },
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
    // Módulos BASE (sempre ativos) vs OPCIONAIS (admin configura)
    modulos_ativos: {
        type: Object,
        default: {
            // Módulos BASE - sempre habilitados
            extrato: true,
            ranking: true,
            rodadas: true,
            historico: true,
            // Módulos OPCIONAIS - admin habilita conforme necessário
            top10: false,
            melhorMes: false,
            pontosCorridos: false,
            mataMata: false,
            artilheiro: false,
            luvaOuro: false,
            campinho: false,
            dicas: false,
        },
    },
    criadaEm: { type: Date, default: Date.now },
    atualizadaEm: { type: Date, default: Date.now },
});

const Liga = mongoose.model("Liga", ligaSchema);

export default Liga;
