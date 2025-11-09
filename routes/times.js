import express from "express";
import { salvarTime, obterTimePorId } from "../controllers/timeController.js";
import { 
  inativarParticipante, 
  reativarParticipante, 
  buscarStatusParticipante 
} from "../controllers/participanteStatusController.js";
import Time from "../models/Time.js"; // Assumindo que Time.js é o modelo

const router = express.Router();

// Rota para buscar time por ID
// GET /api/time/:timeId - Buscar dados de um time específico
router.get('/:timeId', async (req, res) => {
    try {
        const { timeId } = req.params;
        const time = await Time.findOne({ id: parseInt(timeId) });

        if (!time) {
            return res.status(404).json({ erro: 'Time não encontrado' });
        }

        // Garantir que campos de status estejam presentes
        const timeData = time.toObject();
        if (timeData.ativo === undefined) {
            timeData.ativo = true;
        }

        res.json(timeData);
    } catch (erro) {
        console.error('Erro ao buscar time:', erro);
        res.status(500).json({ erro: 'Erro ao buscar time' });
    }
});

// Rotas de gerenciamento de status
router.get("/:timeId/status", buscarStatusParticipante);
router.put("/:timeId/inativar", inativarParticipante);
router.put("/:timeId/reativar", reativarParticipante);

// Rota para salvar um time (pode ser chamada internamente, mas está disponível para testes)
router.post("/:id", async (req, res) => {
  try {
    const time = await salvarTime(req.params.id);
    res.json(time);
  } catch (err) {
    res.status(500).json({ erro: `Erro ao salvar time: ${err.message}` });
  }
});

// Atualizar senha de acesso do participante
router.put("/:timeId/senha", async (req, res) => {
    try {
        const { timeId } = req.params;
        const { senha } = req.body;

        if (!senha || senha.length < 4) {
            return res.status(400).json({ 
                erro: "Senha deve ter no mínimo 4 caracteres" 
            });
        }

        // Buscar participante em todas as ligas
        const ligas = await Liga.find({});
        let participanteAtualizado = false;

        for (const liga of ligas) {
            const participante = liga.participantes.find(
                p => String(p.time_id) === String(timeId)
            );

            if (participante) {
                participante.senha_acesso = senha;
                await liga.save();
                participanteAtualizado = true;
                break;
            }
        }

        if (!participanteAtualizado) {
            return res.status(404).json({ 
                erro: "Participante não encontrado" 
            });
        }

        res.json({
            sucesso: true,
            mensagem: "Senha atualizada com sucesso"
        });

    } catch (error) {
        console.error("[TIMES] Erro ao atualizar senha:", error);
        res.status(500).json({ 
            erro: "Erro ao atualizar senha",
            detalhes: error.message 
        });
    }
});

export default router;