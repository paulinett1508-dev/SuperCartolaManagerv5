import express from "express";
import mongoose from "mongoose";
import { obterTimePorId } from "../controllers/timeController.js";
import {
    inativarParticipante,
    reativarParticipante,
    buscarStatusParticipante,
} from "../controllers/participanteStatusController.js";

const router = express.Router();

// ✅ CORREÇÃO: Função para obter o Model de forma segura
function getTimeModel() {
    // Tentar obter modelo existente primeiro
    if (mongoose.models.Time) {
        return mongoose.models.Time;
    }

    // Se não existir, criar o schema e modelo
    const TimeSchema = new mongoose.Schema({
        id: { type: Number, required: true, unique: true, index: true },
        nome_time: { type: String, required: true },
        nome_cartoleiro: { type: String, required: true },
        url_escudo_png: { type: String },
        clube_id: { type: Number },
        ativo: { type: Boolean, default: true },
        rodada_desistencia: { type: Number, default: null },
        data_desistencia: { type: Date, default: null },
        senha_acesso: { type: String, default: "" },
    });

    return mongoose.model("Time", TimeSchema);
}

// ==============================================================================
// 1. ROTA INTELIGENTE - Busca time por ID
// Se não achar no banco, o controller vai buscar na API da Globo e salvar.
// ==============================================================================
router.get(
    "/:id",
    (req, res, next) => {
        if (process.env.NODE_ENV !== "production") {
            console.log(
                `🔥 [ROTA INTELIGENTE] Buscando Time ID: ${req.params.id}`,
            );
        }
        next();
    },
    obterTimePorId,
);

// ==============================================================================
// 2. ROTAS DE BATCH
// ==============================================================================

// Buscar múltiplos times (Batch)
router.post("/batch", async (req, res) => {
    try {
        const Time = getTimeModel();
        // Aceitar tanto 'ids' quanto 'timeIds' para compatibilidade
        const ids = req.body.ids || req.body.timeIds;
        if (!Array.isArray(ids)) {
            return res.status(400).json({ erro: "IDs inválidos - envie 'ids' ou 'timeIds' como array" });
        }

        const timeIds = ids
            .map((id) => parseInt(id))
            .filter((id) => !isNaN(id));

        // ✅ CORREÇÃO: Buscar por 'id' (campo correto do schema)
        const times = await Time.find({ id: { $in: timeIds } });
        res.json(times);
    } catch (erro) {
        console.error("[BATCH] Erro:", erro);
        res.status(500).json({ erro: "Erro no batch" });
    }
});

// Buscar status de múltiplos times (batch) - OTIMIZADO
router.post("/batch/status", async (req, res) => {
    try {
        const Time = getTimeModel();
        const { timeIds } = req.body;

        if (!Array.isArray(timeIds) || timeIds.length === 0) {
            return res
                .status(400)
                .json({ erro: "timeIds deve ser um array não vazio" });
        }

        const idsNumericos = timeIds
            .map((id) => Number(id))
            .filter((id) => !isNaN(id));

        // ✅ CORREÇÃO: Buscar por 'id' (campo correto do schema)
        const times = await Time.find(
            { id: { $in: idsNumericos } },
            { id: 1, ativo: 1, rodada_desistencia: 1, _id: 0 },
        ).lean();

        // Criar mapa para acesso rápido
        const statusMap = {};

        // Primeiro, assumir todos como ativos (padrão)
        idsNumericos.forEach((id) => {
            statusMap[id] = {
                ativo: true,
                rodada_desistencia: null,
            };
        });

        // Depois, sobrescrever com dados reais do banco
        times.forEach((time) => {
            statusMap[time.id] = {
                ativo: time.ativo !== false,
                rodada_desistencia: time.rodada_desistencia || null,
            };
        });

        console.log(
            `[BATCH/STATUS] Consultado ${idsNumericos.length} times, ${times.length} encontrados no banco`,
        );

        res.json({ success: true, status: statusMap });
    } catch (error) {
        console.error("[BATCH/STATUS] Erro:", error);
        res.status(500).json({ erro: "Erro ao buscar status dos times" });
    }
});

// ==============================================================================
// 3. ROTAS DE LIGA
// ==============================================================================

// Buscar times de uma liga específica
router.get("/liga/:ligaId", async (req, res) => {
    try {
        const Time = getTimeModel();
        const ligaId = req.params.ligaId;

        // ✅ FIX: Buscar por Number ou ObjectId (liga_id é Mixed no schema)
        // Tenta primeiro como Number (mais comum), depois como ObjectId
        let times = await Time.find({
            liga_id: parseInt(ligaId),
            ativo: true,
        });

        // Fallback: tentar como ObjectId se não encontrou nada
        if (times.length === 0 && mongoose.Types.ObjectId.isValid(ligaId)) {
            times = await Time.find({
                liga_id: new mongoose.Types.ObjectId(ligaId),
                ativo: true,
            });
        }

        // Fallback: tentar como String
        if (times.length === 0) {
            times = await Time.find({
                liga_id: String(ligaId),
                ativo: true,
            });
        }

        res.json(times);
    } catch (error) {
        console.error("[TIMES/LIGA] Erro:", error);
        res.status(500).json({ erro: "Erro ao buscar times" });
    }
});

// ==============================================================================
// 4. GERENCIAMENTO DE SENHA
// ==============================================================================

router.put("/:id/senha", async (req, res) => {
    try {
        const Time = getTimeModel();
        const timeId = parseInt(req.params.id);
        if (isNaN(timeId)) {
            return res.status(400).json({ erro: "ID do time inválido" });
        }
        const { senha } = req.body;
        if (!senha || senha.length < 4) {
            return res
                .status(400)
                .json({ erro: "Senha deve ter no mínimo 4 caracteres" });
        }

        // ✅ Buscar por 'id' (campo correto do schema)
        const time = await Time.findOneAndUpdate(
            { id: timeId },
            { senha_acesso: senha.trim() },
            { new: true },
        );

        if (!time) {
            return res.status(404).json({ erro: "Time não encontrado" });
        }

        console.log(`[SENHA] Senha atualizada para time ${req.params.id}`);
        res.json({ success: true, mensagem: "Senha atualizada com sucesso" });
    } catch (error) {
        console.error("[SENHA] Erro:", error);
        res.status(500).json({ erro: "Erro ao salvar senha" });
    }
});

// ==============================================================================
// 5. STATUS DO PARTICIPANTE (Inativar/Reativar)
// ==============================================================================

router.put("/:timeId/inativar", inativarParticipante);
router.put("/:timeId/reativar", reativarParticipante);
router.get("/:timeId/status", buscarStatusParticipante);

export default router;
