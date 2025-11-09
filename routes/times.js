import express from "express";
import {
    criarTime,
    buscarTimePorId,
    buscarTodosTimes,
    atualizarTime,
    excluirTime,
    buscarTimesAtivos,
    inativarTime,
    reativarTime,
} from "../controllers/timeController.js";
import Time from "../models/Time.js";

const router = express.Router();

router.post("/", criarTime);
router.get("/:id", buscarTimePorId);
router.get("/", buscarTodosTimes);
router.put("/:id", atualizarTime);
router.delete("/:id", excluirTime);
router.get("/ativos/:ligaId", buscarTimesAtivos);
router.put("/:id/inativar", inativarTime);
router.put("/:id/reativar", reativarTime);

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

export default router;