import express from "express";
import { salvarTime, obterTimePorId } from "../controllers/timeController.js";

const router = express.Router();

// Rota para buscar time por ID (NOVA)
router.get("/:id", obterTimePorId);

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
