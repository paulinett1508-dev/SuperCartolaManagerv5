/**
 * Admin Mobile Routes
 * Rotas para app mobile admin
 */

import express from 'express';
import { validateAdminToken } from '../middleware/adminMobileAuth.js';
import * as controller from '../controllers/adminMobileController.js';

const router = express.Router();

// ========== AUTENTICAÇÃO ========== //

/**
 * POST /api/admin/mobile/auth
 * Gera JWT token após autenticação via Replit Auth
 * Não requer JWT (usa session)
 */
router.post('/auth', controller.authenticate);

// ========== MIDDLEWARE DE AUTENTICAÇÃO JWT ========== //
// Todas as rotas abaixo requerem JWT válido
router.use(validateAdminToken);

// ========== DASHBOARD ========== //

/**
 * GET /api/admin/mobile/dashboard
 * Dashboard principal (ligas, health, últimas ações)
 */
router.get('/dashboard', controller.getDashboard);

// ========== LIGAS ========== //

/**
 * GET /api/admin/mobile/ligas
 * Lista todas as ligas gerenciadas
 * Query params: temporada, ativo
 */
router.get('/ligas', controller.getLigas);

/**
 * GET /api/admin/mobile/ligas/:ligaId
 * Detalhes de uma liga específica
 */
router.get('/ligas/:ligaId', controller.getLigaDetalhes);

// ========== CONSOLIDAÇÃO ========== //

/**
 * POST /api/admin/mobile/consolidacao
 * Inicia consolidação manual
 * Body: { ligaId, rodada }
 */
router.post('/consolidacao', controller.consolidarRodada);

/**
 * GET /api/admin/mobile/consolidacao/status/:jobId
 * Status em tempo real de consolidação
 */
router.get('/consolidacao/status/:jobId', controller.getConsolidacaoStatus);

/**
 * GET /api/admin/mobile/consolidacao/historico/:ligaId
 * Histórico de consolidações de uma liga
 * Query params: limit, temporada
 */
router.get('/consolidacao/historico/:ligaId', controller.getConsolidacaoHistorico);

// ========== ACERTOS FINANCEIROS ========== //

/**
 * POST /api/admin/mobile/acertos
 * Registra novo acerto financeiro
 * Body: { ligaId, timeId, tipo, valor, descricao, temporada }
 */
router.post('/acertos', controller.registrarAcerto);

/**
 * GET /api/admin/mobile/acertos/:ligaId
 * Histórico de acertos de uma liga
 * Query params: limit, temporada, timeId
 */
router.get('/acertos/:ligaId', controller.getAcertos);

/**
 * GET /api/admin/mobile/quitacoes/pendentes
 * Lista quitações pendentes de aprovação
 */
router.get('/quitacoes/pendentes', controller.getQuitacoesPendentes);

/**
 * PUT /api/admin/mobile/quitacoes/:id/aprovar
 * Aprova quitação pendente
 * Body: { observacao }
 */
router.put('/quitacoes/:id/aprovar', controller.aprovarQuitacao);

/**
 * PUT /api/admin/mobile/quitacoes/:id/recusar
 * Recusa quitação pendente
 * Body: { motivo }
 */
router.put('/quitacoes/:id/recusar', controller.recusarQuitacao);

// ========== DASHBOARD DE SAÚDE ========== //

/**
 * GET /api/admin/mobile/health
 * Dashboard de saúde adaptado para mobile
 */
router.get('/health', controller.getHealth);

export default router;
