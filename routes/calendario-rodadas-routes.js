// =====================================================================
// CALENDARIO RODADAS ROUTES - v1.0
// Rotas para gerenciar calendário de jogos por rodada
// =====================================================================

import express from 'express';
import calendarioController from '../controllers/calendarioRodadasController.js';
import { verificarAdmin } from '../middleware/auth.js';

const router = express.Router();

// =====================================================================
// ROTAS PÚBLICAS (Participantes)
// =====================================================================

// GET /api/calendario-rodadas/:temporada/:rodada
// Buscar calendário completo de uma rodada
router.get('/:temporada/:rodada', calendarioController.buscarCalendario);

// GET /api/calendario-rodadas/:temporada/:rodada/status
// Verificar apenas status (lightweight)
router.get('/:temporada/:rodada/status', calendarioController.verificarStatus);

// =====================================================================
// ROTAS ADMIN
// =====================================================================

// POST /api/calendario-rodadas/:temporada/:rodada
// Criar ou atualizar calendário completo
router.post('/:temporada/:rodada', verificarAdmin, calendarioController.salvarCalendario);

// PUT /api/calendario-rodadas/:temporada/:rodada/partida/:index/status
// Atualizar status de uma partida específica
router.put(
    '/:temporada/:rodada/partida/:index/status',
    verificarAdmin,
    calendarioController.atualizarStatusPartida
);

export default router;
