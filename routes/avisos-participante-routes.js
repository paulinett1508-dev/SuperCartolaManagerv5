/**
 * Rotas de Avisos - Interface Participante
 */

import express from 'express';
import * as avisosParticipanteController from '../controllers/avisosParticipanteController.js';

const router = express.Router();

// ✅ Rotas públicas (autenticação verificada via session no controller se necessário)
router.get('/', avisosParticipanteController.getAvisos);
router.post('/:id/marcar-lido', avisosParticipanteController.marcarComoLido);
router.get('/contador-nao-lidos', avisosParticipanteController.getContadorNaoLidos);

console.log('[AVISOS-PARTICIPANTE-ROUTES] Rotas de avisos participante registradas');

export default router;
