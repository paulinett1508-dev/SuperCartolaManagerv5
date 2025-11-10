
import express from "express";
import {
    getExtratoCache,
    salvarExtratoCache,
    invalidarCacheTime,
    invalidarCacheLiga,
    verificarCacheValido,
} from "../controllers/extratoFinanceiroCacheController.js";

const router = express.Router();

// Buscar cache
router.get("/:ligaId/times/:timeId/cache", getExtratoCache);

// Verificar validade do cache
router.get("/:ligaId/times/:timeId/cache/valido", verificarCacheValido);

// Salvar/atualizar cache
router.post("/:ligaId/times/:timeId/cache", salvarExtratoCache);

// Invalidar cache de um time
router.delete("/:ligaId/times/:timeId/cache", invalidarCacheTime);

// Invalidar cache de toda a liga (admin)
router.delete("/:ligaId/cache", invalidarCacheLiga);

export default router;
