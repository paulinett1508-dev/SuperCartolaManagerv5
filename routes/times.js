import express from "express";
import { obterTimePorId } from "../controllers/timeController.js";
import Time from "../models/Time.js";

const router = express.Router();

// Rota para obter time por ID (do controller)
router.get("/:id", async (req, res) => {
  try {
    const timeId = req.params.id;
    const time = await Time.findOne({ time_id: parseInt(timeId) });

    if (!time) {
      return res.status(404).json({ erro: 'Time não encontrado' });
    }

    // Garantir que senha_acesso seja incluída na resposta
    const timeData = time.toObject();
    timeData.senha_acesso = time.senha_acesso || '';

    res.json(timeData);
  } catch (error) {
    console.error('[TIMES] Erro ao buscar time:', error);
    res.status(500).json({ erro: 'Erro ao buscar time' });
  }
});

// Rota para buscar todos os times
router.get("/", async (req, res) => {
    try {
        const times = await Time.find();
        res.json(times);
    } catch (error) {
        console.error("[TIMES] Erro ao buscar times:", error);
        res.status(500).json({ erro: "Erro ao buscar times" });
    }
});

// Rota para buscar times ativos de uma liga
router.get("/ativos/:ligaId", async (req, res) => {
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

// Rota para salvar senha de acesso do participante
router.put("/:id/senha", async (req, res) => {
    try {
        const { id } = req.params;
        const { senha } = req.body;

        if (!senha || senha.trim().length < 4) {
            return res.status(400).json({ 
                erro: "Senha deve ter no mínimo 4 caracteres" 
            });
        }

        const time = await Time.findOne({ time_id: parseInt(id) });

        if (!time) {
            return res.status(404).json({ erro: "Time não encontrado" });
        }

        time.senha_acesso = senha.trim();
        await time.save();

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

// Rota para inativar time
router.put("/:id/inativar", async (req, res) => {
    try {
        const { id } = req.params;
        const time = await Time.findOneAndUpdate(
            { time_id: parseInt(id) },
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

// Rota para reativar time
router.put("/:id/reativar", async (req, res) => {
    try {
        const { id } = req.params;
        const time = await Time.findOneAndUpdate(
            { time_id: parseInt(id) },
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