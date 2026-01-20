// =====================================================================
// extratoFinanceiroCacheRoutes.js v2.0 - REMOVIDO rotas de limpeza perigosas
// ✅ v2.0: REMOVIDO rotas limparCacheLiga, limparCacheTime, limparTodosCaches
//   - Causavam perda de dados IRRECUPERÁVEIS em temporadas históricas
//   - Mantido apenas limparCachesCorrompidos para manutenção técnica
// =====================================================================

import express from "express";
import {
    getExtratoCache,
    salvarExtratoCache,
    verificarCacheValido,
    lerCacheExtratoFinanceiro,
    limparCachesCorrompidos,
    estatisticasCache,
} from "../controllers/extratoFinanceiroCacheController.js";

const router = express.Router();

// =====================================================================
// ROTAS DE LEITURA E ESCRITA
// =====================================================================

// Obter cache de um time específico
router.get("/:ligaId/times/:timeId/cache", getExtratoCache);

// Salvar/atualizar cache de um time
router.post("/:ligaId/times/:timeId/cache", salvarExtratoCache);

// Verificar se cache é válido (validação inteligente)
router.get("/:ligaId/times/:timeId/cache/valido", verificarCacheValido);

// Ler cache com validação
router.get("/:ligaId/times/:timeId", lerCacheExtratoFinanceiro);

// =====================================================================
// ROTAS DE ESTATÍSTICAS
// =====================================================================

// Estatísticas gerais de cache
router.get("/stats", estatisticasCache);

// Estatísticas de uma liga específica
router.get("/:ligaId/stats", estatisticasCache);

// =====================================================================
// ROTAS DE MANUTENÇÃO (apenas para caches corrompidos)
// =====================================================================

// Limpar caches corrompidos (todas as ligas)
// DELETE /api/extrato-cache/corrompidos/limpar
router.delete("/corrompidos/limpar", limparCachesCorrompidos);

// Limpar caches corrompidos de uma liga específica
// DELETE /api/extrato-cache/:ligaId/corrompidos/limpar
router.delete("/:ligaId/corrompidos/limpar", limparCachesCorrompidos);

// =====================================================================
// ✅ v2.0: REMOVIDO - Rotas perigosas que causavam perda de dados
// As seguintes rotas foram REMOVIDAS por segurança:
// - DELETE /:ligaId/limpar (limparCacheLiga)
// - DELETE /:ligaId/times/:timeId/limpar (limparCacheTime)
// - DELETE /:ligaId/times/:timeId/cache (limparCacheTime)
// - DELETE /todos/limpar (limparTodosCaches)
// =====================================================================

export default router;
