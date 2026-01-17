// routes/live-results-routes.js
// Rotas para resultados ao vivo (Live Results)
import express from 'express';
import liveResultsController from '../controllers/liveResultsController.js';
import { verificarAdmin, validarLigaId } from '../middleware/auth.js';

const router = express.Router();

// GET /api/live-results?liga_id=XXX
// Listar todas as partidas ao vivo de uma liga
router.get('/', validarLigaId, liveResultsController.listarPartidasAoVivo);

// POST /api/live-results/update
// Atualizar/criar partida (admin only)
router.post('/update', verificarAdmin, validarLigaId, liveResultsController.atualizarPartida);

// GET /api/live-results/status?liga_id=XXX
// Obter status agregado das partidas
router.get('/status', validarLigaId, liveResultsController.obterStatus);

export default router;
