
import express from 'express';
import { consolidarRodada, consolidarTodasRodadasPassadas } from '../controllers/consolidacaoController.js';

const router = express.Router();

// Consolida uma rodada específica
router.post('/ligas/:ligaId/rodadas/:rodada/consolidar', consolidarRodada);

// Consolida múltiplas rodadas (script de recuperação)
router.post('/ligas/:ligaId/consolidar-historico', consolidarTodasRodadasPassadas);

export default router;
