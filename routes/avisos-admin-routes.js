/**
 * Rotas de Avisos - Interface Admin
 */

import express from 'express';
import { verificarAdmin } from '../middleware/auth.js';
import * as avisosAdminController from '../controllers/avisosAdminController.js';

const router = express.Router();

// ✅ Todas rotas protegidas com verificarAdmin
router.post('/criar', verificarAdmin, avisosAdminController.criarAviso);
router.get('/listar', verificarAdmin, avisosAdminController.listarAvisos);
router.patch('/:id/toggle', verificarAdmin, avisosAdminController.toggleAtivoAviso);
router.post('/:id/publicar', verificarAdmin, avisosAdminController.publicarAviso);
router.post('/:id/despublicar', verificarAdmin, avisosAdminController.despublicarAviso);
router.put('/:id/editar', verificarAdmin, avisosAdminController.editarAviso);
router.delete('/:id/deletar', verificarAdmin, avisosAdminController.deletarAviso);

console.log('[AVISOS-ADMIN-ROUTES] Rotas de avisos admin registradas');

export default router;
