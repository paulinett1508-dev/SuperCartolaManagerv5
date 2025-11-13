import express from "express";
import { obterTimePorId } from "../controllers/timeController.js";
import {
  inativarParticipante,
  reativarParticipante,
  buscarStatusParticipante,
} from "../controllers/participanteStatusController.js";
import Time from "../models/Time.js";

const router = express.Router();

// ==============================
// ROTA: Buscar múltiplos times de uma vez (OTIMIZAÇÃO)
// ==============================
router.post("/batch", async (req, res) => {
    try {
        const { ids } = req.body;
        
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ erro: "Lista de IDs inválida" });
        }

        console.log(`[TIMES] Buscando ${ids.length} times em lote`);
        
        const timeIds = ids.map(id => parseInt(id)).filter(id => !isNaN(id));
        const times = await Time.find({ id: { $in: timeIds } });
        
        console.log(`[TIMES] ${times.length} times encontrados em lote`);
        
        res.json(times);
    } catch (erro) {
        console.error(`[TIMES] Erro ao buscar times em lote:`, erro);
        res.status(500).json({ 
            erro: "Erro ao buscar times em lote", 
            detalhes: erro.message 
        });
    }
});

// ==============================
// ROTA: Buscar um time específico por ID
// ==============================
router.get("/:id", async (req, res) => {
    try {
        console.log(`[TIMES] Requisição GET /:id recebida para ID: ${req.params.id}`);

        const timeId = parseInt(req.params.id);

        if (isNaN(timeId)) {
            console.log(`[TIMES] ID inválido: ${req.params.id}`);
            return res.status(400).json({ erro: "ID do time inválido" });
        }

        console.log(`[TIMES] Buscando time com id: ${timeId}`);
        const time = await Time.findOne({ id: timeId });

        if (!time) {
            console.log(`[TIMES] Time não encontrado: ${timeId}`);
            return res.status(404).json({ erro: "Time não encontrado" });
        }

        console.log(`[TIMES] Time encontrado: ${time.nome_time || time.nome_cartoleiro}`);
        res.json(time);
    } catch (erro) {
        console.error(`[TIMES] Erro ao buscar time ${req.params.id}:`, erro);
        res.status(500).json({ 
            erro: "Erro ao buscar time", 
            detalhes: erro.message 
        });
    }
});

// ==============================
// ROTA: Buscar todos os times de uma liga
// ==============================
router.get("/liga/:ligaId", async (req, res) => {
    try {
        const { ligaId } = req.params;
        const times = await Time.find({ 
            liga_id: parseInt(ligaId), 
            ativo: true 
        });
        res.json(times);
    } catch (error) {
        console.error("[TIMES] Erro ao buscar times ativos:", error);
        res.status(500).json({ erro: "Erro ao buscar times ativos" });
    }
});

// ==============================
// ROTA: Gerenciar Senha do Participante
// ==============================
router.put("/:id/senha", async (req, res) => {
    try {
        const { id } = req.params;
        const { senha } = req.body;

        if (!senha || senha.trim().length < 4) {
            return res.status(400).json({ 
                erro: "Senha deve ter no mínimo 4 caracteres" 
            });
        }

        const time = await Time.findOne({ id: parseInt(id) });

        if (!time) {
            return res.status(404).json({ erro: "Time não encontrado" });
        }

        time.senha_acesso = senha.trim();
        await time.save();

        console.log(`✅ Senha atualizada para time ${id}`);

        res.json({ 
            success: true, 
            mensagem: "Senha atualizada com sucesso",
            time: {
                time_id: time.time_id,
                nome_cartoleiro: time.nome_cartoleiro
            }
        });

    } catch (error) {
        console.error("[TIMES] Erro ao salvar senha:", error);
        res.status(500).json({ erro: "Erro ao salvar senha" });
    }
});

// ==============================
// ROTAS DE STATUS
// ==============================
router.put("/:timeId/inativar", inativarParticipante);
router.put("/:timeId/reativar", reativarParticipante);
router.get("/:timeId/status", buscarStatusParticipante);

// ==============================
// ROTA: Inativar time (rota alternativa)
// ==============================
router.put("/:id/inativar", async (req, res) => {
    try {
        const { id } = req.params;
        const time = await Time.findOneAndUpdate(
            { id: parseInt(id) },
            { ativo: false },
            { new: true }
        );

        if (!time) {
            return res.status(404).json({ erro: "Time não encontrado" });
        }

        res.json({ success: true, time });
    } catch (error) {
        console.error("[TIMES] Erro ao inativar time:", error);
        res.status(500).json({ erro: "Erro ao inativar time" });
    }
});

// ==============================
// ROTA: Reativar time (rota alternativa)
// ==============================
router.put("/:id/reativar", async (req, res) => {
    try {
        const { id } = req.params;
        const time = await Time.findOneAndUpdate(
            { id: parseInt(id) },
            { ativo: true },
            { new: true }
        );

        if (!time) {
            return res.status(404).json({ erro: "Time não encontrado" });
        }

        res.json({ success: true, time });
    } catch (error) {
        console.error("[TIMES] Erro ao reativar time:", error);
        res.status(500).json({ erro: "Erro ao reativar time" });
    }
});

export default router;