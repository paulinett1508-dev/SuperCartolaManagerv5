import express from "express";
import mongoose from "mongoose";
import {
  listarLigas,
  buscarLigaPorId,
  criarLiga,
  excluirLiga,
  atualizarTimesLiga,
  removerTimeDaLiga,
  atualizarFluxoFinanceiro,
  consultarFluxoFinanceiro,
  buscarTimesDaLiga,
  buscarRodadasDaLiga,
  buscarConfrontosPontosCorridos,
  buscarCartoleiroPorId,
  buscarModulosAtivos,
  atualizarModulosAtivos,
  sincronizarParticipantesLiga,
  sincronizarTodasLigas,
} from "../controllers/ligaController.js";

import { popularRodadas } from "../controllers/rodadaController.js";
import Liga from "../models/Liga.js";

const router = express.Router();

// ==============================
// ROTAS DE SINCRONIZAÇÃO (NOVAS)
// ==============================
router.post("/:id/sincronizar-participantes", sincronizarParticipantesLiga);
router.post("/sincronizar-todas", sincronizarTodasLigas);

// Rotas existentes
router.get("/", listarLigas);
router.get("/:id", buscarLigaPorId);
router.post("/", criarLiga);
router.delete("/:id", excluirLiga);
router.put("/:id/times", atualizarTimesLiga);
router.delete("/:id/times/:timeId", removerTimeDaLiga);
router.put("/:id/fluxo/:rodada", atualizarFluxoFinanceiro);
router.get("/:id/fluxo", consultarFluxoFinanceiro);
router.get("/:id/times", buscarTimesDaLiga);
router.get("/:id/rodadas", buscarRodadasDaLiga);

router.post("/:id/rodadas", (req, res) => {
  req.params.ligaId = req.params.id;
  delete req.params.id;
  popularRodadas(req, res);
});

// Rota para salvar senha de participante
router.put("/:ligaId/participante/:timeId/senha", async (req, res) => {
  try {
    const { ligaId, timeId } = req.params;
    const { senha } = req.body;

    if (!senha || senha.trim().length < 4) {
      return res.status(400).json({
        erro: "Senha deve ter no mínimo 4 caracteres",
      });
    }

    const liga = await Liga.findById(ligaId).select("+times +participantes");
    if (!liga) {
      return res.status(404).json({ erro: "Liga não encontrada" });
    }

    const timeIdNum = Number(timeId);

    if (!liga.times || !liga.times.includes(timeIdNum)) {
      return res.status(404).json({
        erro: "Time não encontrado nesta liga",
      });
    }

    if (!liga.participantes) {
      liga.participantes = [];
    }

    let participante = liga.participantes.find(
      (p) => Number(p.time_id) === timeIdNum,
    );

    const Time = (await import("../models/Time.js")).default;

    if (!participante) {
      const timeData = await Time.findOne({ time_id: timeIdNum });

      participante = {
        time_id: timeIdNum,
        nome_cartola: timeData?.nome_cartoleiro || "N/D",
        nome_time: timeData?.nome_time || "N/D",
        senha_acesso: senha.trim(),
      };
      liga.participantes.push(participante);
    } else {
      participante.senha_acesso = senha.trim();
    }

    await Time.findOneAndUpdate(
      { time_id: timeIdNum },
      { senha_acesso: senha.trim() },
      { new: true },
    );

    await liga.save();

    res.json({
      success: true,
      mensagem: "Senha atualizada com sucesso",
      participante: {
        time_id: participante.time_id,
        nome_cartola: participante.nome_cartola,
      },
    });
  } catch (error) {
    console.error("[LIGAS] Erro ao salvar senha:", error);
    res.status(500).json({ erro: "Erro ao salvar senha: " + error.message });
  }
});

// Rota: Buscar ranking da liga
router.get("/:id/ranking", async (req, res) => {
  const { id: ligaId } = req.params;

  try {
    const Rodada = (await import("../models/Rodada.js")).default;
    const rodadas = await Rodada.find({ ligaId }).lean();

    if (!rodadas || rodadas.length === 0) {
      return res.json([]);
    }

    const rankingMap = {};

    rodadas.forEach((rodada) => {
      const timeId = rodada.timeId;
      const pontos = parseFloat(rodada.pontos) || 0;

      if (!rankingMap[timeId]) {
        rankingMap[timeId] = {
          timeId,
          nome_time: rodada.nome_time || "N/D",
          nome_cartola: rodada.nome_cartola || "N/D",
          escudo: rodada.escudo || "",
          pontos_totais: 0,
          rodadas_jogadas: 0,
        };
      }

      rankingMap[timeId].pontos_totais += pontos;
      rankingMap[timeId].rodadas_jogadas++;
    });

    const ranking = Object.values(rankingMap)
      .sort((a, b) => b.pontos_totais - a.pontos_totais)
      .map((time, index) => ({
        ...time,
        posicao: index + 1,
        media:
          time.rodadas_jogadas > 0
            ? (time.pontos_totais / time.rodadas_jogadas).toFixed(2)
            : "0.00",
      }));

    res.json(ranking);
  } catch (error) {
    console.error(`[LIGAS] Erro ao buscar ranking:`, error);
    res.status(500).json({ erro: "Erro ao buscar ranking" });
  }
});

// Rota: Buscar rodadas de um time específico
router.get("/:id/rodadas/:timeId", async (req, res) => {
  const { id: ligaId, timeId } = req.params;

  try {
    const Rodada = (await import("../models/Rodada.js")).default;
    const rodadas = await Rodada.find({
      ligaId,
      timeId: parseInt(timeId),
    })
      .sort({ rodada: 1 })
      .lean();

    res.json(rodadas);
  } catch (error) {
    console.error(`[LIGAS] Erro ao buscar rodadas do time:`, error);
    res.status(500).json({ erro: "Erro ao buscar rodadas do time" });
  }
});

// Rota: Buscar Melhor Mês de TODOS os participantes (ranking mensal)
// IMPORTANTE: Esta rota DEVE vir ANTES de "/:id/melhor-mes/:timeId"
router.get("/:id/melhor-mes", async (req, res) => {
    const { id: ligaId } = req.params;

    try {
        const Rodada = (await import("../models/Rodada.js")).default;
        const Liga = (await import("../models/Liga.js")).default;

        // Buscar liga para pegar lista de times
        const liga = await Liga.findById(ligaId).lean();
        if (!liga) {
            return res.status(404).json({ erro: "Liga não encontrada" });
        }

        // Definição das edições mensais
        const edicoes = [
            { id: 1, nome: "Abril", rodadas: [1, 2, 3, 4] },
            { id: 2, nome: "Maio", rodadas: [5, 6, 7, 8, 9] },
            { id: 3, nome: "Junho", rodadas: [10, 11, 12, 13] },
            { id: 4, nome: "Julho", rodadas: [14, 15, 16, 17, 18] },
            { id: 5, nome: "Agosto", rodadas: [19, 20, 21, 22, 23] },
            { id: 6, nome: "Setembro", rodadas: [24, 25, 26, 27, 28] },
            { id: 7, nome: "Outubro", rodadas: [29, 30, 31, 32] },
            { id: 8, nome: "Novembro", rodadas: [33, 34, 35, 36, 37, 38] },
        ];

        // Buscar TODAS as rodadas da liga
        const todasRodadas = await Rodada.find({ ligaId }).lean();

        if (!todasRodadas || todasRodadas.length === 0) {
            return res.json({ edicoes: [], mensagem: "Nenhuma rodada encontrada" });
        }

        // Calcular ranking por mês
        const resultado = edicoes.map(edicao => {
            // Filtrar rodadas deste mês
            const rodadasDoMes = todasRodadas.filter(r => edicao.rodadas.includes(r.rodada));

            if (rodadasDoMes.length === 0) {
                return {
                    id: edicao.id,
                    nome: edicao.nome,
                    rodadas: edicao.rodadas,
                    ranking: [],
                    status: "pendente"
                };
            }

            // Agrupar por time
            const timesPontos = {};

            rodadasDoMes.forEach(r => {
                const timeId = r.timeId;
                if (!timesPontos[timeId]) {
                    timesPontos[timeId] = {
                        timeId: timeId,
                        nome_time: r.nome_time || r.nome || "N/D",
                        nome_cartola: r.nome_cartola || "",
                        pontos_total: 0,
                        rodadas_jogadas: 0
                    };
                }
                timesPontos[timeId].pontos_total += parseFloat(r.pontos) || 0;
                timesPontos[timeId].rodadas_jogadas++;
            });

            // Ordenar por pontos
            const ranking = Object.values(timesPontos)
                .sort((a, b) => b.pontos_total - a.pontos_total)
                .map((time, index) => ({
                    ...time,
                    posicao: index + 1,
                    media: time.rodadas_jogadas > 0
                        ? (time.pontos_total / time.rodadas_jogadas).toFixed(2)
                        : "0.00"
                }));

            // Verificar se mês está completo (todas as rodadas jogadas)
            const rodadasJogadas = new Set(rodadasDoMes.map(r => r.rodada));
            const mesCompleto = edicao.rodadas.every(r => rodadasJogadas.has(r));

            return {
                id: edicao.id,
                nome: edicao.nome,
                rodadas: edicao.rodadas,
                ranking: ranking,
                campeao: ranking.length > 0 ? ranking[0] : null,
                status: mesCompleto ? "concluido" : "em_andamento",
                totalParticipantes: ranking.length
            };
        });

        // Filtrar apenas meses que têm dados
        const edicoesComDados = resultado.filter(e => e.ranking.length > 0);

        res.json({
            edicoes: edicoesComDados,
            totalEdicoes: edicoesComDados.length,
            ligaId: ligaId
        });

    } catch (error) {
        console.error(`[LIGAS] Erro ao buscar Melhor Mês geral:`, error);
        res.status(500).json({ erro: "Erro ao buscar Melhor Mês" });
    }
});

// Rota: Buscar Melhor Mês de um participante específico
router.get("/:id/melhor-mes/:timeId", async (req, res) => {
  const { id: ligaId, timeId } = req.params;

  try {
    const Rodada = (await import("../models/Rodada.js")).default;

    const edicoes = [
      { id: 1, nome: "Abril", rodadas: [1, 2, 3, 4] },
      { id: 2, nome: "Maio", rodadas: [5, 6, 7, 8, 9] },
      { id: 3, nome: "Junho", rodadas: [10, 11, 12, 13] },
      { id: 4, nome: "Julho", rodadas: [14, 15, 16, 17, 18] },
      { id: 5, nome: "Agosto", rodadas: [19, 20, 21, 22, 23] },
      { id: 6, nome: "Setembro", rodadas: [24, 25, 26, 27, 28] },
      { id: 7, nome: "Outubro", rodadas: [29, 30, 31, 32] },
      { id: 8, nome: "Novembro", rodadas: [33, 34, 35, 36, 37, 38] },
    ];

    const resultado = [];

    for (const edicao of edicoes) {
      const dadosRodadas = await Rodada.find({
        ligaId,
        timeId: parseInt(timeId),
        rodada: { $in: edicao.rodadas },
      }).lean();

      if (dadosRodadas.length > 0) {
        const totalPontos = dadosRodadas.reduce(
          (sum, r) => sum + (parseFloat(r.pontos) || 0),
          0,
        );
        resultado.push({
          edicao: edicao.id,
          nome: edicao.nome,
          rodadas: edicao.rodadas,
          total_pontos: totalPontos,
          rodadas_jogadas: dadosRodadas.length,
        });
      }
    }

    res.json(resultado);
  } catch (error) {
    console.error(`[LIGAS] Erro ao buscar Melhor Mês:`, error);
    res.status(500).json({ erro: "Erro ao buscar Melhor Mês" });
  }
});

// Rota: Buscar Pontos Corridos (Classificação)
router.get("/:id/pontos-corridos", buscarConfrontosPontosCorridos);

// Rota: Buscar ranking de uma rodada específica
router.get("/:id/ranking/:rodada", async (req, res) => {
  const { id: ligaId, rodada } = req.params;

  try {
    const Rodada = (await import("../models/Rodada.js")).default;

    const rodadaNum = parseInt(rodada);
    if (isNaN(rodadaNum)) {
      return res.status(400).json({ erro: "Rodada inválida" });
    }

    const dados = await Rodada.find({
      ligaId,
      rodada: rodadaNum,
    }).lean();

    if (!dados || dados.length === 0) {
      return res.status(404).json({
        erro: `Dados da rodada ${rodada} não encontrados`,
        rodada: rodadaNum,
      });
    }

    const ranking = dados.sort((a, b) => (b.pontos || 0) - (a.pontos || 0));

    res.json(ranking);
  } catch (error) {
    console.error(`[LIGAS] Erro ao buscar ranking da rodada ${rodada}:`, error);
    res.status(500).json({ erro: "Erro ao buscar ranking da rodada" });
  }
});

// Rota: Buscar Mata-Mata para participante
router.get("/:id/mata-mata", async (req, res) => {
  const { id: ligaId } = req.params;

  try {
    let rodada_atual = 1;
    try {
      const resMercado = await fetch("/api/cartola/mercado/status");
      if (resMercado.ok) {
        rodada_atual = (await resMercado.json()).rodada_atual;
      }
    } catch (err) {
      // Silencioso
    }

    const edicoes = [
      {
        id: 1,
        nome: "1ª Edição",
        rodadaInicial: 2,
        rodadaFinal: 7,
        rodadaDefinicao: 2,
      },
      {
        id: 2,
        nome: "2ª Edição",
        rodadaInicial: 9,
        rodadaFinal: 14,
        rodadaDefinicao: 9,
      },
      {
        id: 3,
        nome: "3ª Edição",
        rodadaInicial: 15,
        rodadaFinal: 21,
        rodadaDefinicao: 15,
      },
      {
        id: 4,
        nome: "4ª Edição",
        rodadaInicial: 22,
        rodadaFinal: 26,
        rodadaDefinicao: 21,
      },
      {
        id: 5,
        nome: "5ª Edição",
        rodadaInicial: 31,
        rodadaFinal: 35,
        rodadaDefinicao: 30,
      },
    ];

    const edicoesAtivas = edicoes.filter(
      (e) => rodada_atual >= e.rodadaDefinicao,
    );

    if (edicoesAtivas.length === 0) {
      return res.json({
        edicoes: [],
        rodada_atual,
        mensagem: "Nenhuma edição iniciada ainda",
      });
    }

    const resultado = {
      edicoes: edicoesAtivas.map((e) => ({
        id: e.id,
        nome: e.nome,
        rodadaInicial: e.rodadaInicial,
        rodadaFinal: e.rodadaFinal,
        rodadaDefinicao: e.rodadaDefinicao,
        ativo: true,
      })),
      rodada_atual,
    };

    res.json(resultado);
  } catch (error) {
    console.error(`[LIGAS] Erro ao buscar Mata-Mata:`, error);
    res.status(500).json({ erro: "Erro ao buscar dados do Mata-Mata" });
  }
});

// Rota: Buscar TOP 10 da liga
router.get("/:id/top10", async (req, res) => {
  const { id: ligaId } = req.params;

  try {
    const Rodada = (await import("../models/Rodada.js")).default;

    const rodadas = await Rodada.find({ ligaId }).lean();

    if (!rodadas || rodadas.length === 0) {
      return res.json([]);
    }

    const rodadasAgrupadas = {};

    rodadas.forEach((r) => {
      if (!rodadasAgrupadas[r.rodada]) {
        rodadasAgrupadas[r.rodada] = [];
      }
      rodadasAgrupadas[r.rodada].push(r);
    });

    const top10PorRodada = {};

    Object.keys(rodadasAgrupadas).forEach((numRodada) => {
      const timesRodada = rodadasAgrupadas[numRodada];

      const top10 = timesRodada
        .sort(
          (a, b) => (parseFloat(b.pontos) || 0) - (parseFloat(a.pontos) || 0),
        )
        .slice(0, 10)
        .map((time, index) => ({
          posicao: index + 1,
          timeId: time.timeId,
          nome_time: time.nome_time || "N/D",
          nome_cartola: time.nome_cartola || "N/D",
          escudo: time.escudo || "",
          pontos: parseFloat(time.pontos) || 0,
        }));

      top10PorRodada[numRodada] = top10;
    });

    res.json(top10PorRodada);
  } catch (error) {
    console.error(`[LIGAS] Erro ao buscar TOP 10:`, error);
    res.status(500).json({ erro: "Erro ao buscar TOP 10" });
  }
});

// Rota de análise de performance
router.get("/:id/performance", async (req, res) => {
  res.status(501).json({ erro: "Em desenvolvimento" });
});

// Rotas de rodadas
router.get("/:id/rodadas", buscarRodadasDaLiga);
router.get("/:id/rodadas/:rodadaNum", buscarRodadasDaLiga);

// Rota de módulos ativos
router.get("/:id/modulos-ativos", buscarModulosAtivos);
router.put("/:id/modulos-ativos", atualizarModulosAtivos);

export default router;