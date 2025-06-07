import express from "express";
import {
  listarLigas,
  buscarLigaPorId,
  criarLiga,
  excluirLiga,
  atualizarTimesLiga,
  removerTimeDaLiga,
  atualizarFluxoFinanceiro,
  consultarFluxoFinanceiro,
  buscarTimesDaLiga, // novo controlador
  buscarRodadasDaLiga, // novo controlador
} from "../controllers/ligaController.js";

// Importar o controlador de rodadas para popular rodadas
import { popularRodadas } from "../controllers/rodadaController.js";

const router = express.Router();

// Rotas existentes
router.get("/", listarLigas);
router.get("/:id", buscarLigaPorId);
router.post("/", criarLiga);
router.delete("/:id", excluirLiga);
router.put("/:id/times", atualizarTimesLiga);
router.delete("/:id/times/:timeId", removerTimeDaLiga);
router.put("/:id/fluxo/:rodada", atualizarFluxoFinanceiro);
router.get("/:id/fluxo", consultarFluxoFinanceiro);
// Novas rotas para a Liga Pontos Corridos
router.get("/:id/times", buscarTimesDaLiga); // Busca todos os times da liga
router.get("/:id/rodadas", buscarRodadasDaLiga); // Busca rodadas com filtro opcional

// Adicionar rota para popular rodadas (para compatibilidade com o frontend)
router.post("/:id/rodadas", (req, res) => {
  // Redirecionar para o controlador correto, ajustando o parâmetro
  req.params.ligaId = req.params.id;
  delete req.params.id;
  popularRodadas(req, res);
});

export default router;
