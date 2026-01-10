/**
 * Routes: Quitação de Temporada
 *
 * Endpoints para quitar saldos de temporada e definir legado.
 *
 * @version 1.0.0
 * @since 2026-01-10
 */

import express from "express";
import {
    buscarDadosParaQuitacao,
    quitarTemporada,
    verificarStatusQuitacao
} from "../controllers/quitacaoController.js";

const router = express.Router();

/**
 * Middleware de autenticação admin
 */
function requireAdmin(req, res, next) {
    if (!req.session?.admin) {
        return res.status(401).json({
            success: false,
            error: 'Não autenticado'
        });
    }
    next();
}

/**
 * GET /api/quitacao/:ligaId/:timeId/dados
 * Busca dados do participante para exibir no modal de quitação
 *
 * Query params:
 * - temporada: Temporada a consultar (default: temporada financeira ativa)
 */
router.get('/:ligaId/:timeId/dados', requireAdmin, buscarDadosParaQuitacao);

/**
 * POST /api/quitacao/:ligaId/:timeId/quitar-temporada
 * Executa a quitação de uma temporada
 *
 * Body:
 * - temporada_origem: Temporada sendo quitada (ex: 2025)
 * - temporada_destino: Próxima temporada (ex: 2026)
 * - saldo_original: Saldo calculado do sistema
 * - tipo_quitacao: 'zerado' | 'integral' | 'customizado'
 * - valor_legado: Valor a carregar para próxima temporada
 * - observacao: Texto obrigatório
 */
router.post('/:ligaId/:timeId/quitar-temporada', requireAdmin, quitarTemporada);

/**
 * GET /api/quitacao/:ligaId/:timeId/status
 * Verifica se uma temporada já foi quitada
 *
 * Query params:
 * - temporada: Temporada a verificar
 */
router.get('/:ligaId/:timeId/status', requireAdmin, verificarStatusQuitacao);

export default router;
