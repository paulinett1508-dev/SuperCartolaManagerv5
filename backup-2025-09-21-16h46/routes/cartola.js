import express from "express";
import {
  listarClubes,
  obterTimePorId,
  obterPontuacao,
  obterEscalacao,
  getMercadoStatus,
  getParciais,
  getClubes,
} from "../controllers/cartolaController.js";

const router = express.Router();

router.get("/clubes", listarClubes);
router.get("/time/:id", obterTimePorId);
router.get("/time/:id/:rodada", obterPontuacao);
router.get("/time/:id/:rodada/escalacao", obterEscalacao);
router.get("/mercado/status", getMercadoStatus);
router.get("/mercado/selecao/parciais", getParciais);
router.get("/version", (req, res) =>
  res.status(200).json({ version: "1.0.0" }),
);

export default router;
