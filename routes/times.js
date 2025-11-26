import express from "express";
import { obterTimePorId } from "../controllers/timeController.js"; // ✅ Controller Inteligente
import {
    inativarParticipante,
    reativarParticipante,
    buscarStatusParticipante,
} from "../controllers/participanteStatusController.js";
import Time from "../models/Time.js";

const router = express.Router();

// ==============================================================================
// 1. ROTA INTELIGENTE (A CORREÇÃO)
// Substitui a lógica manual antiga.
// Se não achar no banco, o controller vai buscar na API da Globo e salvar.
// ==============================================================================
router.get(
    "/:id",
    (req, res, next) => {
        // Log para confirmar que a rota nova está ativa
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
// 2. Outras Rotas (Mantidas e Organizadas)
// ==============================================================================

// Buscar múltiplos times (Batch)
router.post("/batch", async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids))
            return res.status(400).json({ erro: "IDs inválidos" });

        const timeIds = ids
            .map((id) => parseInt(id))
            .filter((id) => !isNaN(id));
        const times = await Time.find({ id: { $in: timeIds } });
        res.json(times);
    } catch (erro) {
        res.status(500).json({ erro: "Erro no batch" });
    }
});

// Buscar status de múltiplos times (batch)
router.post("/batch/status", async (req, res) => {
    try {
        const { timeIds } = req.body;

        if (!Array.isArray(timeIds) || timeIds.length === 0) {
            return res.status(400).json({ erro: "timeIds deve ser um array não vazio" });
        }

        const times = await Time.find(
            { time_id: { $in: timeIds.map(id => Number(id)) } },
            { time_id: 1, ativo: 1, rodada_desistencia: 1, _id: 0 }
        ).lean();

        // Criar mapa para acesso rápido
        const statusMap = {};
        times.forEach(time => {
            statusMap[time.time_id] = {
                ativo: time.ativo !== false,
                rodada_desistencia: time.rodada_desistencia
            };
        });

        res.json({ success: true, status: statusMap });
    } catch (error) {
        console.error("[TIMES-BATCH] Erro:", error);
        res.status(500).json({ erro: "Erro ao buscar status dos times" });
    }
});

// Buscar times da liga
router.get("/liga/:ligaId", async (req, res) => {
    try {
        const times = await Time.find({
            liga_id: parseInt(req.params.ligaId),
            ativo: true,
        });
        res.json(times);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao buscar times" });
    }
});

// Gerenciar Senha
router.put("/:id/senha", async (req, res) => {
    try {
        const { senha } = req.body;
        if (!senha || senha.length < 4)
            return res.status(400).json({ erro: "Senha curta" });

        const time = await Time.findOneAndUpdate(
            { id: parseInt(req.params.id) },
            { senha_acesso: senha.trim() },
            { new: true },
        );

        if (!time) return res.status(404).json({ erro: "Time não encontrado" });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ erro: "Erro ao salvar senha" });
    }
});

// Status do Participante
router.put("/:timeId/inativar", inativarParticipante);
router.put("/:timeId/reativar", reativarParticipante);
router.get("/:timeId/status", buscarStatusParticipante);

// Rotas de compatibilidade (Legacy)
router.put("/:id/inativar", async (req, res) => {
    const time = await Time.findOneAndUpdate(
        { id: parseInt(req.params.id) },
        { ativo: false },
    );
    res.json({ success: !!time });
});

router.put("/:id/reativar", async (req, res) => {
    const time = await Time.findOneAndUpdate(
        { id: parseInt(req.params.id) },
        { ativo: true },
    );
    res.json({ success: !!time });
});

export default router;