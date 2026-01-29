// routes/capitao-routes.js
import express from 'express';
import capitaoController from '../controllers/capitaoController.js';
import { verificarAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/capitao/:ligaId/ranking
router.get('/:ligaId/ranking', capitaoController.getRankingCapitao);

// GET /api/capitao/:ligaId/ranking-live
router.get('/:ligaId/ranking-live', capitaoController.getRankingCapitaoLive);

// POST /api/capitao/:ligaId/consolidar (admin only)
router.post('/:ligaId/consolidar', verificarAdmin, capitaoController.consolidarCapitaoTemporada);

export default router;
