// routes/rodadas-routes.js
import express from "express";
import {
  buscarRodadas,
  popularRodadas,
} from "../controllers/rodadaController.js";

const router = express.Router();

router.get("/:ligaId/rodadas", buscarRodadas);
router.post("/:ligaId/rodadas", popularRodadas);

export default router;
