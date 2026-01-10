/**
 * Rotas: Ajustes Financeiros
 *
 * API para gerenciar ajustes financeiros dinâmicos (temporada 2026+).
 *
 * @version 1.1.0
 * @since 2026-01-10
 */

import express from "express";
import { verificarAdmin } from "../middleware/auth.js";
import {
    listarAjustes,
    criarAjuste,
    atualizarAjuste,
    removerAjuste,
    obterAjuste,
    listarAjustesLiga
} from "../controllers/ajustesController.js";

const router = express.Router();

// =============================================================================
// ROTAS ESPECÍFICAS (devem vir ANTES das rotas com parâmetros genéricos)
// =============================================================================

/**
 * GET /api/ajustes/detalhe/:id
 * Obtém detalhes de um ajuste
 */
router.get("/detalhe/:id", obterAjuste);

/**
 * GET /api/ajustes/liga/:ligaId
 * Lista todos os ajustes da liga
 * Query: ?temporada=2026
 */
router.get("/liga/:ligaId", listarAjustesLiga);

// =============================================================================
// ROTAS DE AJUSTE INDIVIDUAL
// =============================================================================

/**
 * PATCH /api/ajustes/:id
 * Atualiza um ajuste
 * Body: { descricao?, valor? }
 */
router.patch("/:id", verificarAdmin, atualizarAjuste);

/**
 * DELETE /api/ajustes/:id
 * Remove um ajuste (soft delete)
 */
router.delete("/:id", verificarAdmin, removerAjuste);

// =============================================================================
// ROTAS DE PARTICIPANTE (parâmetros genéricos - vem por último)
// =============================================================================

/**
 * GET /api/ajustes/:ligaId/:timeId
 * Lista ajustes de um participante
 * Query: ?temporada=2026
 */
router.get("/:ligaId/:timeId", listarAjustes);

/**
 * POST /api/ajustes/:ligaId/:timeId
 * Cria novo ajuste
 * Body: { descricao, valor, temporada? }
 */
router.post("/:ligaId/:timeId", verificarAdmin, criarAjuste);

// =============================================================================
// EXPORT
// =============================================================================

console.log("[AJUSTES] Rotas carregadas (v1.1)");

export default router;
