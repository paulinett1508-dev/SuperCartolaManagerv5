// routes/top10CacheRoutes.js
import express from "express";
import {
    salvarCacheTop10,
    lerCacheTop10,
} from "../controllers/top10CacheController.js";

const router = express.Router();

// Rotas para cache do Top 10
// Ex: POST /api/top10/cache/684d821cf1a7ae16d1f89572
router.post("/cache/:ligaId", salvarCacheTop10);

// Ex: GET /api/top10/cache/684d821cf1a7ae16d1f89572?rodada=5
router.get("/cache/:ligaId", lerCacheTop10);

export default router;
