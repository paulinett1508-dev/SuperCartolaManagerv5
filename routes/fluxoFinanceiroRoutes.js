import express from "express";
import { verificarAdmin } from "../middleware/auth.js";
import * as fluxoController from "../controllers/fluxoFinanceiroController.js";
import * as projecaoController from "../controllers/projecaoFinanceiraController.js";

const router = express.Router();

// === PROJEÇÃO FINANCEIRA EM TEMPO REAL (v1.0) ===
// Projeção efêmera durante rodada em andamento (status_mercado === 2)
// Retorna { projecao: false } quando mercado aberto (rodada finalizada)
// ✅ GET público - participante pode ver projeção da sua rodada
router.get("/:ligaId/projecao/:timeId", projecaoController.getProjecaoTime);

// Projeção de todos os participantes (admin/tesouraria)
// ✅ GET público - usado pelo admin para visão geral
router.get("/:ligaId/projecao", projecaoController.getProjecaoLiga);

// === ROTA PRINCIPAL (EXTRATO FINANCEIRO) ===
// Esta é a rota que o frontend novo vai chamar para pegar o JSON consolidado
// ✅ GET público - participante pode ver seu próprio extrato
router.get("/:ligaId/extrato/:timeId", fluxoController.getExtratoFinanceiro);

// === ROTAS DE CAMPOS EDITÁVEIS (MANUAIS) ===

// Buscar campos de um time específico (corrigido para coincidir com frontend)
// ✅ GET público - participante pode ver seus campos
router.get("/:ligaId/times/:timeId", fluxoController.getCampos);

// IMPORTANTE: Esta rota funciona em /api/fluxo-financeiro/:ligaId/times/:timeId

// Buscar campos de todos os times de uma liga
// ✅ GET público - usado pelo admin mas não precisa proteger leitura
router.get("/:ligaId", fluxoController.getCamposLiga);

// Salvar/atualizar todos os campos de um time
// 🔒 ADMIN ONLY - escrita requer autenticação
router.put("/:ligaId/times/:timeId", verificarAdmin, fluxoController.salvarCampos);

// Salvar campo individual (nome ou valor) - Rota mais usada pelo frontend novo
// 🔒 ADMIN ONLY - escrita requer autenticação
router.patch(
  "/:ligaId/times/:timeId/campo/:campoIndex",
  verificarAdmin,
  fluxoController.salvarCampo,
);

// Resetar campos para padrão
// 🔒 ADMIN ONLY - escrita requer autenticação
router.post("/:ligaId/times/:timeId/reset", verificarAdmin, fluxoController.resetarCampos);

// Deletar campos
// 🔒 ADMIN ONLY - escrita requer autenticação
router.delete("/:ligaId/times/:timeId", verificarAdmin, fluxoController.deletarCampos);

export default router;
