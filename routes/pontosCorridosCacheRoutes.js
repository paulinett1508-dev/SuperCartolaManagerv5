// routes/pontosCorridosCacheRoutes.js
import express from "express";
import {
    salvarCachePontosCorridos,
    lerCachePontosCorridos,
} from "../controllers/pontosCorridosCacheController.js";

const router = express.Router();

// Rota para SALVAR o snapshot (POST)
// Ex: POST /api/pontos-corridos/cache/684d821cf1a7ae16d1f89572
router.post("/cache/:ligaId", salvarCachePontosCorridos);

// Rota para LER o snapshot (GET)
// Ex: GET /api/pontos-corridos/cache/684d821cf1a7ae16d1f89572?rodada=5
router.get("/cache/:ligaId", lerCachePontosCorridos);

export default router;
