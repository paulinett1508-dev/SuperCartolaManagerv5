// ✅ routes/data-lake-routes.js - Rotas do Data Lake dos Participantes
import express from "express";
import { verificarAdmin } from "../middleware/auth.js";
import {
  httpSincronizarComGlobo,
  httpSincronizarPorId,
  httpBuscarDadosRaw,
  httpEstatisticas,
} from "../controllers/dataLakeController.js";

const router = express.Router();

// =============================================================================
// ROTAS DE SINCRONIZAÇÃO
// =============================================================================

/**
 * POST /api/data-lake/sincronizar
 *
 * Sincroniza um time com a API Globo por NOME
 *
 * Body:
 * {
 *   "nome_time": "Nome do Time",    // Obrigatório
 *   "liga_id": "ObjectId",           // Opcional
 *   "rodada": 10                     // Opcional - busca escalação da rodada
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "time": { ... },
 *   "dump": { "_id", "tipo_coleta", "data_coleta", "payload_size" },
 *   "message": "..."
 * }
 */
router.post("/sincronizar", verificarAdmin, httpSincronizarComGlobo);

/**
 * POST /api/data-lake/sincronizar/:id
 *
 * Sincroniza um time com a API Globo por ID (direto)
 *
 * Params:
 *   :id - ID numérico do time no Cartola FC
 *
 * Body:
 * {
 *   "liga_id": "ObjectId",    // Opcional
 *   "rodada": 10              // Opcional
 * }
 */
router.post("/sincronizar/:id", verificarAdmin, httpSincronizarPorId);

// =============================================================================
// ROTAS DE ACESSO AOS DADOS RAW
// =============================================================================

/**
 * GET /api/data-lake/raw/:id
 *
 * Retorna o dump completo (dados raw) de um participante
 *
 * Params:
 *   :id - ID numérico do time
 *
 * Query:
 *   ?temporada=2025         // Opcional (default: temporada atual)
 *   ?historico=true         // Opcional - inclui lista de dumps anteriores
 *   ?limit=10               // Opcional - limite do histórico
 *
 * Response:
 * {
 *   "success": true,
 *   "time_id": 123456,
 *   "temporada": 2025,
 *   "dump_atual": {
 *     "_id": "...",
 *     "tipo_coleta": "time_info",
 *     "rodada": null,
 *     "data_coleta": "2025-...",
 *     "raw_json": { ... },    // ⭐ O JSON COMPLETO DA API GLOBO
 *     "meta": { ... }
 *   },
 *   "historico": [ ... ]      // Se ?historico=true
 * }
 */
router.get("/raw/:id", httpBuscarDadosRaw);

// =============================================================================
// ROTAS DE ESTATÍSTICAS
// =============================================================================

/**
 * GET /api/data-lake/estatisticas
 *
 * Retorna estatísticas do Data Lake
 *
 * Query:
 *   ?temporada=2025    // Opcional
 *
 * Response:
 * {
 *   "temporada": 2025,
 *   "total_dumps": 1234,
 *   "times_unicos": 150,
 *   "por_tipo": {
 *     "time_info": 500,
 *     "time_rodada": 700,
 *     ...
 *   }
 * }
 */
router.get("/estatisticas", httpEstatisticas);

// =============================================================================
// ROTA DE HEALTH CHECK
// =============================================================================

/**
 * GET /api/data-lake/health
 *
 * Verifica se o Data Lake está operacional
 */
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Data Lake dos Participantes",
    timestamp: new Date().toISOString(),
  });
});

export default router;
