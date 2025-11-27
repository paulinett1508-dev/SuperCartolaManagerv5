
import express from 'express';
import { 
    consolidarRodada, 
    consolidarTodasRodadasPassadas,
    buscarHistoricoCompleto 
} from '../controllers/consolidacaoController.js';

const router = express.Router();

// Consolida uma rodada específica
router.post('/ligas/:ligaId/rodadas/:rodada/consolidar', consolidarRodada);

// Consolida múltiplas rodadas (script de recuperação)
router.post('/ligas/:ligaId/consolidar-historico', consolidarTodasRodadasPassadas);

// 📊 NOVO: Busca histórico completo consolidado (evita múltiplas requisições)
router.get('/ligas/:ligaId/historico-completo', buscarHistoricoCompleto);

export default router;
