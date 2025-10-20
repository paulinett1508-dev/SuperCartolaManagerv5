import express from "express";
import * as fluxoController from "../controllers/fluxoFinanceiroController.js";

const router = express.Router();

// Rotas para campos editáveis do fluxo financeiro

// Buscar campos de um time específico
router.get("/:ligaId/times/:timeId", fluxoController.getCampos);

// Buscar campos de todos os times de uma liga
router.get("/:ligaId", fluxoController.getCamposLiga);

// Salvar/atualizar todos os campos de um time
router.put("/:ligaId/times/:timeId", fluxoController.salvarCampos);

// Salvar campo individual (nome ou valor)
router.patch(
  "/:ligaId/times/:timeId/campo/:campoIndex",
  fluxoController.salvarCampo,
);

// Resetar campos para padrão
router.post("/:ligaId/times/:timeId/reset", fluxoController.resetarCampos);

// Deletar campos
router.delete("/:ligaId/times/:timeId", fluxoController.deletarCampos);

export default router;
