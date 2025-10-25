import express from "express";
import { salvarTime, obterTimePorId } from "../controllers/timeController.js";
import { 
  inativarParticipante, 
  reativarParticipante, 
  buscarStatusParticipante 
} from "../controllers/participanteStatusController.js";

const router = express.Router();

// Rota para buscar time por ID
router.get("/:id", obterTimePorId);

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

export default router;
