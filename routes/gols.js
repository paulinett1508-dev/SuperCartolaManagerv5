import express from "express";
import Gols from "../models/Gols.js";

const router = express.Router();

// Rota para buscar todos os gols
router.get("/gols", async (req, res) => {
  try {
    const gols = await Gols.find().sort({ rodada: -1, G: -1 });
    res.json({
      success: true,
      data: gols,
      total: gols.length,
    });
  } catch (error) {
    console.error("Erro ao buscar gols:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar gols",
      error: error.message,
    });
  }
});

// Rota para buscar gols por rodada
router.get("/gols/rodada/:rodada", async (req, res) => {
  try {
    const { rodada } = req.params;
    const gols = await Gols.find({
      rodada: parseInt(rodada),
      G: { $gt: 0 },
    }).sort({ G: -1 });

    res.json({
      success: true,
      rodada: parseInt(rodada),
      data: gols,
      total: gols.length,
    });
  } catch (error) {
    console.error("Erro ao buscar gols por rodada:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar gols por rodada",
      error: error.message,
    });
  }
});

// Rota para buscar gols por time
router.get("/gols/time/:timeId", async (req, res) => {
  try {
    const { timeId } = req.params;
    const gols = await Gols.find({
      time_id: parseInt(timeId),
      G: { $gt: 0 },
    }).sort({ rodada: -1, G: -1 });

    res.json({
      success: true,
      timeId: parseInt(timeId),
      data: gols,
      total: gols.length,
    });
  } catch (error) {
    console.error("Erro ao buscar gols por time:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar gols por time",
      error: error.message,
    });
  }
});

// Rota para criar novos gols
router.post("/gols", async (req, res) => {
  try {
    const novoGol = new Gols(req.body);
    const golSalvo = await novoGol.save();

    res.status(201).json({
      success: true,
      message: "Gol criado com sucesso",
      data: golSalvo,
    });
  } catch (error) {
    console.error("Erro ao criar gol:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao criar gol",
      error: error.message,
    });
  }
});

// Rota para buscar estatísticas gerais de gols
router.get("/gols/estatisticas", async (req, res) => {
  try {
    const totalGols = await Gols.aggregate([
      { $match: { G: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: "$G" } } },
    ]);

    const golsPorRodada = await Gols.aggregate([
      { $match: { G: { $gt: 0 } } },
      { $group: { _id: "$rodada", total: { $sum: "$G" } } },
      { $sort: { _id: 1 } },
    ]);

    const artilheiroGeral = await Gols.aggregate([
      { $match: { G: { $gt: 0 } } },
      {
        $group: {
          _id: "$nome_cartola",
          totalGols: { $sum: "$G" },
          jogos: { $sum: 1 },
        },
      },
      { $sort: { totalGols: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      success: true,
      estatisticas: {
        totalGols: totalGols[0]?.total || 0,
        golsPorRodada: golsPorRodada,
        artilheiroGeral: artilheiroGeral,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar estatísticas de gols:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar estatísticas de gols",
      error: error.message,
    });
  }
});

export default router;
