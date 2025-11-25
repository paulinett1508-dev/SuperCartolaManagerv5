import express from "express";
import * as fluxoController from "../controllers/fluxoFinanceiroController.js";

const router = express.Router();

// === ROTA PRINCIPAL (EXTRATO FINANCEIRO) ===
// Esta é a rota que o frontend novo vai chamar para pegar o JSON consolidado
router.get("/:ligaId/extrato/:timeId", fluxoController.getExtratoFinanceiro);

// === ROTAS DE CAMPOS EDITÁVEIS (MANUAIS) ===

// Buscar campos de um time específico (corrigido para coincidir com frontend)
router.get("/:ligaId/times/:timeId", fluxoController.getCampos);

// IMPORTANTE: Esta rota funciona em /api/fluxo-financeiro/:ligaId/times/:timeId

// Buscar campos de todos os times de uma liga
router.get("/:ligaId", fluxoController.getCamposLiga);

// Salvar/atualizar todos os campos de um time
router.put("/:ligaId/times/:timeId", fluxoController.salvarCampos);

// Salvar campo individual (nome ou valor) - Rota mais usada pelo frontend novo
router.patch(
  "/:ligaId/times/:timeId/campo/:campoIndex",
  fluxoController.salvarCampo,
);

// Resetar campos para padrão
router.post("/:ligaId/times/:timeId/reset", fluxoController.resetarCampos);

// Deletar campos
router.delete("/:ligaId/times/:timeId", fluxoController.deletarCampos);

export default router;
