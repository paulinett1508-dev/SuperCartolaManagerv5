import express from "express";
import {
    salvarCacheMataMata,
    lerCacheMataMata,
    deletarCacheMataMata,
} from "../controllers/mataMataCacheController.js";

const router = express.Router();

// Rota: /api/mata-mata/cache/:ligaId/:edicao
router.post("/cache/:ligaId/:edicao", salvarCacheMataMata);
router.get("/cache/:ligaId/:edicao", lerCacheMataMata);
router.delete("/cache/:ligaId/:edicao", deletarCacheMataMata);

export default router;
