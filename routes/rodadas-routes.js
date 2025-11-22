// routes/rodadas-routes.js
import express from "express";
import {
  buscarRodadas,
  popularRodadas,
} from "../controllers/rodadaController.js";

// Importar o modelo Rodada para interagir com o banco de dados
import Rodada from "../models/Rodada.js"; // Assumindo que o modelo Rodada está em "../models/Rodada.js"


const router = express.Router();

// GET /api/ligas/:ligaId/rodadas - Buscar dados de uma rodada específica
router.get('/:ligaId/rodadas', async (req, res) => {
  try {
    const { ligaId } = req.params;
    const { rodada } = req.query;

    console.log(`Buscando dados da rodada específica: ${rodada} para liga ${ligaId}`);

    const query = {
      ligaId: ligaId,
      rodada: parseInt(rodada)
    };

    console.log('Query para buscar dados da rodada:', query);

    const dadosRodada = await Rodada.find(query);
    console.log(`Encontrados ${dadosRodada.length} documentos para a rodada ${rodada}`);

    // Se não encontrou dados, retornar array vazio mas com status 200
    if (dadosRodada.length === 0) {
      return res.json({
        success: true,
        message: `Rodada ${rodada} ainda não possui dados`,
        data: []
      });
    }

    res.json(dadosRodada);
  } catch (error) {
    console.error('Erro ao buscar dados da rodada:', error);
    res.status(500).json({ 
      erro: 'Erro ao buscar dados da rodada',
      detalhes: error.message 
    });
  }
});

// POST /api/ligas/:ligaId/rodadas - Popular dados de uma rodada específica
router.post("/:ligaId/rodadas", popularRodadas);

export default router;