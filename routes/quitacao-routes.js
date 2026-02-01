/**
 * Routes: Quitação de Temporada
 *
 * Endpoints para quitar saldos de temporada e definir legado.
 *
 * @version 1.0.0
 * @since 2026-01-10
 */

import express from "express";
import { verificarAdmin } from "../middleware/auth.js";
import {
    buscarDadosParaQuitacao,
    quitarTemporada,
    verificarStatusQuitacao
} from "../controllers/quitacaoController.js";

const router = express.Router();

// ✅ v2.0.0: Removido requireAdmin inline - usando verificarAdmin centralizado

/**
 * GET /api/quitacao/:ligaId/:timeId/dados
 * Busca dados do participante para exibir no modal de quitação
 * 🔒 ADMIN ONLY
 *
 * Query params:
 * - temporada: Temporada a consultar (default: temporada financeira ativa)
 */
router.get('/:ligaId/:timeId/dados', verificarAdmin, buscarDadosParaQuitacao);

/**
 * POST /api/quitacao/:ligaId/:timeId/quitar-temporada
 * Executa a quitação de uma temporada
 * 🔒 ADMIN ONLY
 *
 * Body:
 * - temporada_origem: Temporada sendo quitada (ex: 2025)
 * - temporada_destino: Próxima temporada (ex: 2026)
 * - saldo_original: Saldo calculado do sistema
 * - tipo_quitacao: 'zerado' | 'integral' | 'customizado'
 * - valor_legado: Valor a carregar para próxima temporada
 * - observacao: Texto obrigatório
 */
router.post('/:ligaId/:timeId/quitar-temporada', verificarAdmin, quitarTemporada);

/**
 * GET /api/quitacao/:ligaId/:timeId/status
 * Verifica se uma temporada já foi quitada
 * 🔒 ADMIN ONLY
 *
 * Query params:
 * - temporada: Temporada a verificar
 */
router.get('/:ligaId/:timeId/status', verificarAdmin, verificarStatusQuitacao);

export default router;
