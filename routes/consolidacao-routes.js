import express from "express";
import {
    consolidarRodada,
    consolidarTodasRodadasPassadas,
    buscarHistoricoCompleto,
    verificarStatusConsolidacao,
} from "../controllers/consolidacaoController.js";

const router = express.Router();

// Consolida uma rodada específica
router.post("/ligas/:ligaId/rodadas/:rodada/consolidar", consolidarRodada);

// Consolida múltiplas rodadas (script de recuperação)
router.post(
    "/ligas/:ligaId/consolidar-historico",
    consolidarTodasRodadasPassadas,
);

// 📊 Busca histórico completo consolidado
router.get("/ligas/:ligaId/historico-completo", buscarHistoricoCompleto);

// ✅ NOVO: Verificar status de consolidação da liga
router.get("/ligas/:ligaId/status", verificarStatusConsolidacao);

export default router;
