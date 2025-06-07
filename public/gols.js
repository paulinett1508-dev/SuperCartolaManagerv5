import express from "express";
import {
  extrairGolsDaRodada,
  listarGols,
} from "../controllers/golsController.js";
import { listarArtilheiros } from "../controllers/artilheirosController.js";
const router = express.Router();

router.post("/extrair", extrairGolsDaRodada);
router.get("/listar", listarGols);
router.get("/artilheiros", listarArtilheiros);

export default router;
