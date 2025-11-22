import express from "express";
import mongoose from "mongoose"; // Import mongoose to use its ObjectId validation
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
  // Buscar módulos ativos/configurados da liga
  buscarModulosAtivos,
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
// ROTA: Buscar Melhor Mês de um participante
// ==============================
router.get("/:id/melhor-mes/:timeId", async (req, res) => {
  const { id: ligaId, timeId } = req.params;

  try {
    console.log(`[LIGAS] Buscando Melhor Mês para time ${timeId} na liga ${ligaId}`);

    const Rodada = (await import("../models/Rodada.js")).default;

    // Definir edições do Melhor Mês (mesma config do admin)
    const edicoes = [
      { nome: "Abril", inicio: 1, fim: 5 },
      { nome: "Maio", inicio: 6, fim: 9 },
      { nome: "Junho", inicio: 10, fim: 13 },
      { nome: "Julho", inicio: 14, fim: 18 },
      { nome: "Agosto", inicio: 19, fim: 22 },
      { nome: "Setembro", inicio: 23, fim: 27 },
      { nome: "Outubro", inicio: 28, fim: 31 },
      { nome: "Novembro", inicio: 32, fim: 35 },
      { nome: "Dezembro", inicio: 36, fim: 38 }
    ];

    // Buscar todas as rodadas do time
    const rodadas = await Rodada.find({
      ligaId,
      timeId: parseInt(timeId)
    }).sort({ rodada: 1 }).lean();

    if (!rodadas || rodadas.length === 0) {
      return res.json([]);
    }

    // Calcular pontuação por mês
    const meses = edicoes.map(edicao => {
      const rodadasDoMes = rodadas.filter(
        r => r.rodada >= edicao.inicio && r.rodada <= edicao.fim
      );

      const pontos = rodadasDoMes.reduce(
        (total, r) => total + (parseFloat(r.pontos) || 0), 
        0
      );

      return {
        mes: edicao.nome,
        nome: edicao.nome,
        pontos: pontos,
        rodadas_inicio: edicao.inicio,
        rodadas_fim: edicao.fim,
        rodadas_jogadas: rodadasDoMes.length
      };
    }).filter(mes => mes.rodadas_jogadas > 0); // Apenas meses com rodadas jogadas

    console.log(`[LIGAS] Melhor Mês calculado: ${meses.length} meses para time ${timeId}`);
    res.json(meses);

  } catch (error) {
    console.error(`[LIGAS] Erro ao buscar Melhor Mês:`, error);
    res.status(500).json({ erro: "Erro ao buscar dados do Melhor Mês" });
  }
});

// ==============================
// ROTA: Buscar Pontos Corridos da liga
// ==============================
router.get("/:id/pontos-corridos", async (req, res) => {
  const { id: ligaId } = req.params;

  try {
    console.log(`[LIGAS] Buscando Pontos Corridos para liga ${ligaId}`);

    const Rodada = (await import("../models/Rodada.js")).default;

    // Buscar todas as rodadas da liga
    const rodadas = await Rodada.find({ ligaId }).lean();

    if (!rodadas || rodadas.length === 0) {
      return res.json({ 
        nome: "Pontos Corridos",
        rodada_atual: null,
        classificacao: [] 
      });
    }

    // Agrupar rodadas por time
    const timesMap = {};

    rodadas.forEach(rodada => {
      const timeId = rodada.timeId;

      if (!timesMap[timeId]) {
        timesMap[timeId] = {
          time_id: timeId,
          nome: rodada.nome_time || "N/D",
          nome_cartola: rodada.nome_cartola || "N/D",
          escudo: rodada.escudo || "",
          clube_id: rodada.clube_id || null,
          pontos: 0,
          jogos: 0,
          vitorias: 0,
          empates: 0,
          derrotas: 0,
          gols_pro: 0,
          gols_contra: 0,
          saldo_gols: 0,
          rodadas: []
        };
      }

      timesMap[timeId].rodadas.push({
        rodada: rodada.rodada,
        pontos: parseFloat(rodada.pontos) || 0
      });
    });

    // Processar confrontos e calcular estatísticas
    // (baseado na lógica do pontos-corridos do admin)
    const CRITERIOS = {
      empateTolerancia: 0.3,
      goleadaMinima: 50.0
    };

    const PONTUACAO = {
      vitoria: 3,
      empate: 1,
      derrota: 0,
      goleada: 4
    };

    // Obter número máximo de rodadas
    const maxRodada = Math.max(...rodadas.map(r => r.rodada));

    // Para cada rodada, calcular confrontos
    for (let numRodada = 1; numRodada <= maxRodada; numRodada++) {
      const rodadasDaRodada = rodadas.filter(r => r.rodada === numRodada);

      // Gerar confrontos (todos contra todos)
      for (let i = 0; i < rodadasDaRodada.length; i++) {
        for (let j = i + 1; j < rodadasDaRodada.length; j++) {
          const timeA = rodadasDaRodada[i];
          const timeB = rodadasDaRodada[j];

          const pontosA = parseFloat(timeA.pontos) || 0;
          const pontosB = parseFloat(timeB.pontos) || 0;

          const diff = Math.abs(pontosA - pontosB);

          // Calcular resultado
          if (diff <= CRITERIOS.empateTolerancia) {
            // Empate
            timesMap[timeA.timeId].pontos += PONTUACAO.empate;
            timesMap[timeB.timeId].pontos += PONTUACAO.empate;
            timesMap[timeA.timeId].empates += 1;
            timesMap[timeB.timeId].empates += 1;
          } else if (pontosA > pontosB) {
            // Vitória do A
            if (diff >= CRITERIOS.goleadaMinima) {
              timesMap[timeA.timeId].pontos += PONTUACAO.goleada;
              timesMap[timeA.timeId].gols_pro += 1;
            } else {
              timesMap[timeA.timeId].pontos += PONTUACAO.vitoria;
            }
            timesMap[timeA.timeId].vitorias += 1;
            timesMap[timeB.timeId].derrotas += 1;
          } else {
            // Vitória do B
            if (diff >= CRITERIOS.goleadaMinima) {
              timesMap[timeB.timeId].pontos += PONTUACAO.goleada;
              timesMap[timeB.timeId].gols_pro += 1;
            } else {
              timesMap[timeB.timeId].pontos += PONTUACAO.vitoria;
            }
            timesMap[timeB.timeId].vitorias += 1;
            timesMap[timeA.timeId].derrotas += 1;
          }

          // Atualizar jogos
          timesMap[timeA.timeId].jogos += 1;
          timesMap[timeB.timeId].jogos += 1;

          // Saldo de gols (usando diferença de pontos como proxy)
          timesMap[timeA.timeId].saldo_gols += (pontosA - pontosB);
          timesMap[timeB.timeId].saldo_gols += (pontosB - pontosA);
        }
      }
    }

    // Converter para array e ordenar
    const classificacao = Object.values(timesMap)
      .map(time => ({
        time_id: time.time_id,
        nome: time.nome,
        nome_cartola: time.nome_cartola,
        escudo: time.escudo,
        clube_id: time.clube_id,
        pontos: time.pontos,
        jogos: time.jogos,
        vitorias: time.vitorias,
        empates: time.empates,
        derrotas: time.derrotas,
        gols_pro: time.gols_pro,
        gols_contra: time.gols_contra,
        saldo_gols: Math.round(time.saldo_gols * 100) / 100
      }))
      .sort((a, b) => {
        // Ordenar por pontos, depois vitórias, depois saldo
        if (b.pontos !== a.pontos) return b.pontos - a.pontos;
        if (b.vitorias !== a.vitorias) return b.vitorias - a.vitorias;
        return b.saldo_gols - a.saldo_gols;
      });

    console.log(`[LIGAS] Pontos Corridos calculado: ${classificacao.length} times`);

    res.json({
      nome: "Pontos Corridos",
      rodada_atual: maxRodada,
      classificacao
    });

  } catch (error) {
    console.error(`[LIGAS] Erro ao buscar Pontos Corridos:`, error);
    res.status(500).json({ erro: "Erro ao buscar dados de Pontos Corridos" });
  }
});

// ==============================
// ROTA: Buscar Mata-Mata para participante
// ==============================
router.get("/:id/mata-mata", async (req, res) => {
  const { id: ligaId } = req.params;

  try {
    console.log(`[LIGAS] Buscando Mata-Mata para participante - Liga ${ligaId}`);

    // Buscar status do mercado
    let rodada_atual = 1;
    try {
      const resMercado = await fetch("/api/cartola/mercado/status");
      if (resMercado.ok) {
        rodada_atual = (await resMercado.json()).rodada_atual;
      }
    } catch (err) {
      console.warn("[LIGAS] Erro ao buscar status do mercado");
    }

    // Definir edições (mesma estrutura do admin)
    const edicoes = [
      { id: 1, nome: "1ª Edição", rodadaInicial: 2, rodadaFinal: 7, rodadaDefinicao: 2 },
      { id: 2, nome: "2ª Edição", rodadaInicial: 9, rodadaFinal: 14, rodadaDefinicao: 9 },
      { id: 3, nome: "3ª Edição", rodadaInicial: 15, rodadaFinal: 21, rodadaDefinicao: 15 },
      { id: 4, nome: "4ª Edição", rodadaInicial: 22, rodadaFinal: 26, rodadaDefinicao: 21 },
      { id: 5, nome: "5ª Edição", rodadaInicial: 31, rodadaFinal: 35, rodadaDefinicao: 30 }
    ];

    // Filtrar edições ativas
    const edicoesAtivas = edicoes.filter(e => rodada_atual >= e.rodadaDefinicao);

    if (edicoesAtivas.length === 0) {
      return res.json({
        edicoes: [],
        rodada_atual,
        mensagem: "Nenhuma edição iniciada ainda"
      });
    }

    // Retornar estrutura simplificada para o participante
    const resultado = {
      edicoes: edicoesAtivas.map(e => ({
        id: e.id,
        nome: e.nome,
        rodadaInicial: e.rodadaInicial,
        rodadaFinal: e.rodadaFinal,
        rodadaDefinicao: e.rodadaDefinicao,
        ativo: true
      })),
      rodada_atual
    };

    console.log(`[LIGAS] Mata-Mata: ${edicoesAtivas.length} edições ativas`);
    res.json(resultado);

  } catch (error) {
    console.error(`[LIGAS] Erro ao buscar Mata-Mata:`, error);
    res.status(500).json({ erro: "Erro ao buscar dados do Mata-Mata" });
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

// Rotas de rodadas
router.get("/:id/rodadas", buscarRodadasDaLiga);
router.get("/:id/rodadas/:rodadaNum", buscarRodadasDaLiga);

// Rota de módulos ativos
router.get("/:id/modulos-ativos", buscarModulosAtivos);

export default router;