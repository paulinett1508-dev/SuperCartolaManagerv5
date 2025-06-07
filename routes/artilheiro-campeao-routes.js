import express from "express";
import {
  getArtilheiroCampeao,
  getRodadasDisponiveis,
  limparCacheArtilheiro,
  getArtilheiroCampeaoAcumulado,
  testeConectividade,
} from "../controllers/artilheiroCampeaoController.js";

const router = express.Router();

console.log("[ROUTES] artilheiro-campeao-routes.js carregado");

router.use((req, res, next) => {
  console.log(`[ROUTES MIDDLEWARE] ${req.method} ${req.originalUrl}`);
  next();
});

router.get("/artilheiro-campeao/teste", testeConectividade);

// Rotas para dados acumulados (devem vir antes das rotas de rodada específica)
router.get(
  "/artilheiro-campeao/:ligaId/acumulado",
  getArtilheiroCampeaoAcumulado,
);

router.get("/artilheiro-campeao/:ligaId/acumulado/force-update", (req, res) => {
  req.query.forceUpdate = "true"; // Adiciona o parâmetro para forçar a atualização
  getArtilheiroCampeaoAcumulado(req, res);
});

// Rotas para rodadas específicas
router.get("/artilheiro-campeao/:ligaId/rodadas", getRodadasDisponiveis);
router.get("/artilheiro-campeao/:ligaId/:rodada(\\d+)", getArtilheiroCampeao);

// Rotas de limpeza de cache
router.delete(
  "/artilheiro-campeao/:ligaId/limpar-cache",
  limparCacheArtilheiro,
);
router.delete("/artilheiro-campeao/limpar-cache", limparCacheArtilheiro);

// Rota de debug
router.get("/artilheiro-campeao/:ligaId/debug/:timeId", async (req, res) => {
  try {
    const { ligaId, timeId } = req.params;

    console.log(`[DEBUG] Analisando time ${timeId} em todas as rodadas`);

    const resultados = [];
    let totalGolsPro = 0;
    let totalGolsContra = 0;

    // Buscar dados de todas as rodadas para o time específico
    for (let rodada = 1; rodada <= 11; rodada++) {
      try {
        const url = `https://api.cartola.globo.com/time/id/${timeId}/${rodada}`;
        const response = await fetch(url);

        if (response.ok) {
          const data = await response.json();

          let golsPro = 0;
          let golsContra = 0;
          const jogadoresComGols = [];

          if (data.atletas && Array.isArray(data.atletas)) {
            data.atletas.forEach((atleta) => {
              if (atleta.scout) {
                const gols = parseInt(atleta.scout.G) || 0;
                if (gols > 0) {
                  golsPro += gols;
                  jogadoresComGols.push({
                    nome: atleta.apelido,
                    gols: gols,
                  });
                }

                if (atleta.posicao_id === 1) {
                  const gc = parseInt(atleta.scout.GC) || 0;
                  golsContra += gc;
                }
              }
            });
          }

          totalGolsPro += golsPro;
          totalGolsContra += golsContra;

          resultados.push({
            rodada,
            golsPro,
            golsContra,
            saldo: golsPro - golsContra,
            jogadores: jogadoresComGols,
            pontos: data.pontos || 0,
          });
        } else {
          resultados.push({
            rodada,
            erro: `HTTP ${response.status}`,
            golsPro: 0,
            golsContra: 0,
            saldo: 0,
          });
        }

        // Delay para não sobrecarregar
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        resultados.push({
          rodada,
          erro: error.message,
          golsPro: 0,
          golsContra: 0,
          saldo: 0,
        });
      }
    }

    res.json({
      success: true,
      timeId: parseInt(timeId),
      totalGolsPro,
      totalGolsContra,
      saldoTotal: totalGolsPro - totalGolsContra,
      rodadas: resultados,
    });
  } catch (error) {
    console.error("[DEBUG] Erro:", error);
    res.status(500).json({
      success: false,
      message: "Erro no debug",
      error: error.message,
    });
  }
});

export default router;
