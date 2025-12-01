// routes/rodadas-routes.js
import express from "express";
import {
  buscarRodadas,
  popularRodadas,
  criarIndiceUnico,
} from "../controllers/rodadaController.js";

// Importar o modelo Rodada para interagir com o banco de dados
import Rodada from "../models/Rodada.js"; // Assumindo que o modelo Rodada está em "../models/Rodada.js"


const router = express.Router();

// GET /api/ligas/:ligaId/rodadas - Buscar dados de uma rodada específica
router.get('/:ligaId/rodadas', async (req, res) => {
  try {
    const { ligaId } = req.params;
    const { rodada, inicio, fim } = req.query;

    // Suportar tanto ?rodada=X quanto ?inicio=X&fim=Y
    let rodadaNum;

    if (rodada !== undefined) {
      rodadaNum = parseInt(rodada);
      console.log(`Buscando dados da rodada específica: ${rodadaNum} para liga ${ligaId}`);
    } else if (inicio !== undefined && fim !== undefined) {
      const inicioNum = parseInt(inicio);
      const fimNum = parseInt(fim);

      if (inicioNum === fimNum) {
        rodadaNum = inicioNum;
        console.log(`Buscando dados da rodada específica: ${rodadaNum} (via inicio/fim) para liga ${ligaId}`);
      } else {
        // Se inicio != fim, retornar range
        console.log(`Buscando range de rodadas ${inicioNum}-${fimNum} para liga ${ligaId}`);
        const dadosRodada = await Rodada.find({
          ligaId: ligaId,
          rodada: { $gte: inicioNum, $lte: fimNum }
        });
        console.log(`Encontrados ${dadosRodada.length} documentos para rodadas ${inicioNum}-${fimNum}`);
        return res.json(dadosRodada);
      }
    } else {
      return res.status(400).json({ 
        erro: 'Parâmetro "rodada" ou "inicio/fim" é obrigatório',
        exemplo: '?rodada=1 ou ?inicio=1&fim=5'
      });
    }

    if (isNaN(rodadaNum)) {
      return res.status(400).json({ 
        erro: 'Rodada inválida',
        recebido: { rodada, inicio, fim }
      });
    }

    const query = {
      ligaId: ligaId,
      rodada: rodadaNum
    };

    console.log('Query para buscar dados da rodada:', query);

    const dadosRodada = await Rodada.find(query);
    console.log(`Encontrados ${dadosRodada.length} documentos para a rodada ${rodadaNum}`);

    // Se não encontrou dados, retornar array vazio mas com status 200
    if (dadosRodada.length === 0) {
      return res.json({
        success: true,
        message: `Rodada ${rodadaNum} ainda não possui dados`,
        data: []
      });
    }

    res.json(dadosRodada);
  } catch (error) {
    console.error('Erro ao buscar dados da rodada:', error);
    res.status(500).json({ 
      erro: 'Erro ao buscar dados da rodada',
      detalhes: error.message,
      parametros: { rodada, inicio, fim }
    });
  }
});

// Popular rodadas de uma liga (endpoint principal)
router.post('/:ligaId/rodadas', async (req, res) => {
    console.log('[RODADAS-ROUTES] POST /api/rodadas/:ligaId/popular chamado');
    console.log('[RODADAS-ROUTES] Params:', req.params);
    console.log('[RODADAS-ROUTES] Body:', req.body);
    popularRodadas(req, res);
});

// Rota para criar índice único (executar uma vez)
router.post('/criar-indice-unico', criarIndiceUnico);

export default router;