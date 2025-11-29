// =====================================================================
// extratoFinanceiroCacheRoutes.js - Rotas de Cache com Limpeza
// Destino: /routes/extratoFinanceiroCacheRoutes.js
// =====================================================================

import express from "express";
import {
    getExtratoCache,
    salvarExtratoCache,
    verificarCacheValido,
    lerCacheExtratoFinanceiro,
    limparCacheLiga,
    limparCacheTime,
    limparCachesCorrompidos,
    limparTodosCaches,
    estatisticasCache,
} from "../controllers/extratoFinanceiroCacheController.js";

const router = express.Router();

// =====================================================================
// ROTAS DE LEITURA E ESCRITA (existentes)
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
// ROTAS DE ESTATÍSTICAS (novas)
// =====================================================================

// Estatísticas gerais de cache
router.get("/stats", estatisticasCache);

// Estatísticas de uma liga específica
router.get("/:ligaId/stats", estatisticasCache);

// =====================================================================
// ROTAS DE LIMPEZA (novas)
// =====================================================================

// ⚠️ Limpar TODOS os caches corrompidos (todas as ligas)
// DELETE /api/extrato-cache/corrompidos/limpar
router.delete("/corrompidos/limpar", limparCachesCorrompidos);

// ⚠️ Limpar TODOS os caches (requer ?confirmar=sim)
// DELETE /api/extrato-cache/todos/limpar?confirmar=sim
router.delete("/todos/limpar", limparTodosCaches);

// Limpar todos os caches de uma liga
// DELETE /api/extrato-cache/:ligaId/limpar
router.delete("/:ligaId/limpar", limparCacheLiga);

// Limpar caches corrompidos de uma liga
// DELETE /api/extrato-cache/:ligaId/corrompidos/limpar
router.delete("/:ligaId/corrompidos/limpar", limparCachesCorrompidos);

// Limpar cache de um time específico
// DELETE /api/extrato-cache/:ligaId/times/:timeId/limpar
router.delete("/:ligaId/times/:timeId/limpar", limparCacheTime);

export default router;
