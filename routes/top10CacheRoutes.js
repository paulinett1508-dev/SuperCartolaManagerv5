// routes/top10CacheRoutes.js
import express from "express";
import {
    salvarCacheTop10,
    lerCacheTop10,
} from "../controllers/top10CacheController.js";

const router = express.Router();

router.post("/cache/:ligaId", salvarCacheTop10);
router.get("/cache/:ligaId", lerCacheTop10);

export default router;
