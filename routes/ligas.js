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

// Importar o modelo Liga para manipulação de senhas
import Liga from "../models/Liga.js"; // Assumindo que o modelo Liga está em ../models/Liga.js

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

// Rota para salvar senha de participante
router.put("/:ligaId/participante/:timeId/senha", async (req, res) => {
    try {
        const { ligaId, timeId } = req.params;
        const { senha } = req.body;

        console.log(`[LIGAS] Salvando senha para time ${timeId} na liga ${ligaId}`);

        if (!senha || senha.trim().length < 4) {
            return res.status(400).json({
                erro: "Senha deve ter no mínimo 4 caracteres"
            });
        }

        const liga = await Liga.findById(ligaId).select('+times +participantes');
        if (!liga) {
            console.log(`[LIGAS] Liga ${ligaId} não encontrada`);
            return res.status(404).json({ erro: "Liga não encontrada" });
        }

        console.log(`[LIGAS] Liga carregada:`, {
            id: liga._id,
            nome: liga.nome,
            temCampoTimes: !!liga.times,
            quantidadeTimes: liga.times?.length,
            primeirosTimes: liga.times?.slice(0, 3)
        });

        // Verificar se o time está na lista de times da liga
        const timeIdNum = Number(timeId);
        console.log(`[LIGAS] Verificando time ${timeId} (convertido: ${timeIdNum})`);
        console.log(`[LIGAS] Times na liga:`, liga.times);
        console.log(`[LIGAS] Includes result:`, liga.times?.includes(timeIdNum));

        if (!liga.times || !liga.times.includes(timeIdNum)) {
            console.log(`[LIGAS] ❌ Time ${timeId} (${timeIdNum}) não está na liga ${ligaId}`);
            console.log(`[LIGAS] Lista de times:`, liga.times);
            return res.status(404).json({
                erro: "Time não encontrado nesta liga"
            });
        }

        console.log(`[LIGAS] ✅ Time ${timeIdNum} encontrado na liga`);

        // Inicializar array de participantes se não existir
        if (!liga.participantes) {
            liga.participantes = [];
        }

        // Buscar ou criar participante
        let participante = liga.participantes.find(
            p => Number(p.time_id) === timeIdNum
        );

        const Time = (await import("../models/Time.js")).default;

        if (!participante) {
            // Buscar dados do time para criar participante
            const timeData = await Time.findOne({ time_id: timeIdNum });

            participante = {
                time_id: timeIdNum,
                nome_cartola: timeData?.nome_cartoleiro || "N/D",
                nome_time: timeData?.nome_time || "N/D",
                senha_acesso: senha.trim()
            };
            liga.participantes.push(participante);
            console.log(`[LIGAS] Criado novo participante para time ${timeId}`);
        } else {
            participante.senha_acesso = senha.trim();
            console.log(`[LIGAS] Atualizada senha do participante ${timeId}`);
        }

        // ✅ SALVAR TAMBÉM NA COLEÇÃO TIMES
        await Time.findOneAndUpdate(
            { time_id: timeIdNum },
            { senha_acesso: senha.trim() },
            { new: true }
        );
        console.log(`[LIGAS] ✅ Senha sincronizada na coleção Times`);

        await liga.save();

        res.json({
            success: true,
            mensagem: "Senha atualizada com sucesso",
            participante: {
                time_id: participante.time_id,
                nome_cartola: participante.nome_cartola
            }
        });

    } catch (error) {
        console.error("[LIGAS] Erro ao salvar senha:", error);
        res.status(500).json({ erro: "Erro ao salvar senha: " + error.message });
    }
});

// ==============================
// ROTA: Buscar ranking da liga
// ==============================
router.get("/:id/ranking", async (req, res) => {
  const { id: ligaId } = req.params;

  try {
    console.log(`[LIGAS] Buscando ranking para liga ${ligaId}`);

    // Buscar todas as rodadas da liga
    const Rodada = (await import("../models/Rodada.js")).default;
    const rodadas = await Rodada.find({ ligaId }).lean();

    if (!rodadas || rodadas.length === 0) {
      return res.json([]);
    }

    // Calcular pontuação total por time
    const rankingMap = {};

    rodadas.forEach(rodada => {
      const timeId = rodada.timeId;
      const pontos = parseFloat(rodada.pontos) || 0;

      if (!rankingMap[timeId]) {
        rankingMap[timeId] = {
          timeId,
          nome_time: rodada.nome_time || "N/D",
          nome_cartola: rodada.nome_cartola || "N/D",
          escudo: rodada.escudo || "",
          pontos_totais: 0,
          rodadas_jogadas: 0
        };
      }

      rankingMap[timeId].pontos_totais += pontos;
      rankingMap[timeId].rodadas_jogadas++;
    });

    // Converter para array e ordenar
    const ranking = Object.values(rankingMap)
      .sort((a, b) => b.pontos_totais - a.pontos_totais)
      .map((time, index) => ({
        ...time,
        posicao: index + 1,
        media: time.rodadas_jogadas > 0
          ? (time.pontos_totais / time.rodadas_jogadas).toFixed(2)
          : "0.00"
      }));

    console.log(`[LIGAS] Ranking calculado: ${ranking.length} times`);
    res.json(ranking);

  } catch (error) {
    console.error(`[LIGAS] Erro ao buscar ranking:`, error);
    res.status(500).json({ erro: "Erro ao buscar ranking" });
  }
});

// ==============================
// ROTA: Buscar rodadas de um time específico
// ==============================
router.get("/:id/rodadas/:timeId", async (req, res) => {
  const { id: ligaId, timeId } = req.params;

  try {
    console.log(`[LIGAS] Buscando rodadas do time ${timeId} na liga ${ligaId}`);

    const Rodada = (await import("../models/Rodada.js")).default;
    const rodadas = await Rodada.find({
      ligaId,
      timeId: parseInt(timeId)
    })
    .sort({ rodada: 1 })
    .lean();

    console.log(`[LIGAS] Encontradas ${rodadas.length} rodadas para o time ${timeId}`);
    res.json(rodadas);

  } catch (error) {
    console.error(`[LIGAS] Erro ao buscar rodadas do time:`, error);
    res.status(500).json({ erro: "Erro ao buscar rodadas do time" });
  }
});

// ==============================
// ROTA: Buscar TOP 10 da liga
// ==============================
router.get("/:id/top10", async (req, res) => {
  const { id: ligaId } = req.params;

  try {
    console.log(`[LIGAS] Buscando TOP 10 para liga ${ligaId}`);

    const Rodada = (await import("../models/Rodada.js")).default;

    // Buscar todas as rodadas
    const rodadas = await Rodada.find({ ligaId }).lean();

    if (!rodadas || rodadas.length === 0) {
      return res.json([]);
    }

    // Agrupar por rodada e encontrar os 10 melhores de cada
    const rodadasAgrupadas = {};

    rodadas.forEach(r => {
      if (!rodadasAgrupadas[r.rodada]) {
        rodadasAgrupadas[r.rodada] = [];
      }
      rodadasAgrupadas[r.rodada].push(r);
    });

    const top10PorRodada = {};

    Object.keys(rodadasAgrupadas).forEach(numRodada => {
      const timesRodada = rodadasAgrupadas[numRodada];

      // Ordenar por pontos e pegar os 10 melhores
      const top10 = timesRodada
        .sort((a, b) => (parseFloat(b.pontos) || 0) - (parseFloat(a.pontos) || 0))
        .slice(0, 10)
        .map((time, index) => ({
          posicao: index + 1,
          timeId: time.timeId,
          nome_time: time.nome_time || "N/D",
          nome_cartola: time.nome_cartola || "N/D",
          escudo: time.escudo || "",
          pontos: parseFloat(time.pontos) || 0
        }));

      top10PorRodada[numRodada] = top10;
    });

    console.log(`[LIGAS] TOP 10 calculado para ${Object.keys(top10PorRodada).length} rodadas`);
    res.json(top10PorRodada);

  } catch (error) {
    console.error(`[LIGAS] Erro ao buscar TOP 10:`, error);
    res.status(500).json({ erro: "Erro ao buscar TOP 10" });
  }
});

// Rota de análise de performance
router.get("/:id/performance", async (req, res) => {
  // O restante do código original permanece inalterado aqui.
  // Este é apenas um placeholder para indicar onde o código original continuaria.
});

export default router;