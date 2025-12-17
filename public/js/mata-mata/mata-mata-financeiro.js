// MATA-MATA FINANCEIRO - Cálculos e Resultados Financeiros
// Responsável por: cálculos de premiação, consolidação de resultados, fluxo financeiro

import { edicoes, getLigaId } from "./mata-mata-config.js";
import {
  getPontosDaRodada,
  montarConfrontosPrimeiraFase,
  montarConfrontosFase,
} from "./mata-mata-confrontos.js";

// Cache para getRankingRodadaEspecifica
let getRankingRodadaEspecifica = null;

// Função para definir dependência externa
export function setRankingFunction(func) {
  getRankingRodadaEspecifica = func;
}

// Função para obter resultados financeiros do mata-mata
export async function getResultadosMataMata() {
  console.log("[MATA-FINANCEIRO] Iniciando cálculo financeiro...");

  if (!getRankingRodadaEspecifica) {
    console.error(
      "[MATA-FINANCEIRO] Função getRankingRodadaEspecifica não disponível.",
    );
    return [];
  }

  const ligaId = getLigaId();
  if (!ligaId) {
    console.error("[MATA-FINANCEIRO] ID da Liga não encontrado.");
    return [];
  }

  let rodada_atual = 1;
  try {
    const resMercado = await fetch("/api/cartola/mercado/status");
    if (resMercado.ok) {
      rodada_atual = (await resMercado.json()).rodada_atual;
    }
  } catch (err) {
    console.warn(
      "[MATA-FINANCEIRO] Não foi possível buscar status do mercado.",
    );
  }

  const edicoesAtivas = edicoes.filter(
    (e) => rodada_atual >= e.rodadaDefinicao,
  );
  if (edicoesAtivas.length === 0) {
    console.log("[MATA-FINANCEIRO] Nenhuma edição ativa encontrada.");
    return [];
  }

  const edicaoAtiva = edicoesAtivas[edicoesAtivas.length - 1];
  console.log(
    `[MATA-FINANCEIRO] Usando edição ${edicaoAtiva.id} (${edicaoAtiva.nome}) para cálculos financeiros.`,
  );

  const resultadosFinanceiros = [];
  const fases = ["primeira", "oitavas", "quartas", "semis", "final"];

  try {
    const rodadaDefinicao = edicaoAtiva.rodadaDefinicao;
    const rankingBase = await getRankingRodadaEspecifica(
      ligaId,
      rodadaDefinicao,
    );
    if (!Array.isArray(rankingBase) || rankingBase.length < 32) {
      throw new Error(`Ranking base da Rodada ${rodadaDefinicao} inválido.`);
    }

    // Rodadas de cada fase baseadas no rodadaInicial (já corrigido no config)
    // Estrutura: 1ªFase=R[inicial], Oitavas=R[inicial+1], Quartas=R[inicial+2], Semis=R[inicial+3], Final=R[inicial+4]
    const rodadasFases = {
      primeira: edicaoAtiva.rodadaInicial,
      oitavas: edicaoAtiva.rodadaInicial + 1,
      quartas: edicaoAtiva.rodadaInicial + 2,
      semis: edicaoAtiva.rodadaInicial + 3,
      final: edicaoAtiva.rodadaInicial + 4,
    };

    let vencedoresAnteriores = rankingBase;
    for (const fase of fases) {
      const rodadaPontosNum = rodadasFases[fase];
      const numJogos =
        fase === "primeira"
          ? 16
          : fase === "oitavas"
            ? 8
            : fase === "quartas"
              ? 4
              : fase === "semis"
                ? 2
                : 1;

      if (rodadaPontosNum > rodada_atual - 1) {
        console.log(
          `[MATA-FINANCEIRO] Rodada ${rodadaPontosNum} (Fase ${fase}) ainda não concluída.`,
        );
        break;
      }

      const pontosDaRodadaAtual = await getPontosDaRodada(
        ligaId,
        rodadaPontosNum,
      );
      const confrontosFase =
        fase === "primeira"
          ? montarConfrontosPrimeiraFase(rankingBase, pontosDaRodadaAtual)
          : montarConfrontosFase(
              vencedoresAnteriores,
              pontosDaRodadaAtual,
              numJogos,
            );

      const proximosVencedores = [];
      confrontosFase.forEach((c) => {
        let vencedor = null;
        let perdedor = null;

        const pontosAValidos = typeof c.timeA.pontos === "number";
        const pontosBValidos = typeof c.timeB.pontos === "number";

        if (pontosAValidos && pontosBValidos) {
          if (c.timeA.pontos > c.timeB.pontos) {
            vencedor = c.timeA;
            perdedor = c.timeB;
          } else if (c.timeB.pontos > c.timeA.pontos) {
            vencedor = c.timeB;
            perdedor = c.timeA;
          } else {
            if (c.timeA.rankR2 < c.timeB.rankR2) {
              vencedor = c.timeA;
              perdedor = c.timeB;
            } else {
              vencedor = c.timeB;
              perdedor = c.timeA;
            }
          }
        } else {
          if (c.timeA.rankR2 < c.timeB.rankR2) {
            vencedor = c.timeA;
            perdedor = c.timeB;
          } else {
            vencedor = c.timeB;
            perdedor = c.timeA;
          }
        }

        if (vencedor) {
          resultadosFinanceiros.push({
            timeId: String(vencedor.timeId || vencedor.id),
            fase: fase,
            rodadaPontos: rodadaPontosNum,
            valor: 10.0,
          });
          resultadosFinanceiros.push({
            timeId: String(perdedor.timeId || perdedor.id),
            fase: fase,
            rodadaPontos: rodadaPontosNum,
            valor: -10.0,
          });
          vencedor.jogoAnterior = c.jogo;
          proximosVencedores.push(vencedor);
        }
      });
      vencedoresAnteriores = proximosVencedores;
    }

    console.log(
      `[MATA-FINANCEIRO] Cálculo financeiro concluído. ${resultadosFinanceiros.length} registros gerados.`,
    );
    return resultadosFinanceiros;
  } catch (error) {
    console.error(
      "[MATA-FINANCEIRO] Erro ao calcular resultados financeiros:",
      error,
    );
    return [];
  }
}

// Função para obter resultados consolidados para fluxo financeiro
export async function getResultadosMataMataFluxo(ligaIdParam = null) {
  console.log('[MATA-FINANCEIRO] Calculando TODAS as edições concluídas...');

  // ✅ USAR A FUNÇÃO INJETADA, NÃO A GLOBAL
  if (!getRankingRodadaEspecifica) {
    console.error('[MATA-FINANCEIRO] ❌ Função getRankingRodadaEspecifica não foi injetada via setRankingFunction()');
    return {
      participantes: [],
      totalArrecadado: 0,
      totalPago: 0,
      saldoFinal: 0,
      edicoes: [],
    };
  }

  try {
    // ✅ USAR O PARÂMETRO PASSADO OU FALLBACK
    const ligaId = ligaIdParam || getLigaId();
    if (!ligaId) {
      console.error("[MATA-FINANCEIRO] ID da Liga não encontrado.");
      return {
        participantes: [],
        totalArrecadado: 0,
        totalPago: 0,
        saldoFinal: 0,
        edicoes: [],
      };
    }
    
    console.log(`[MATA-FINANCEIRO] Processando liga: ${ligaId}`);

    let rodada_atual = 1;
    try {
      const resMercado = await fetch("/api/cartola/mercado/status");
      if (resMercado.ok) {
        rodada_atual = (await resMercado.json()).rodada_atual;
      }
    } catch (err) {
      console.warn("[MATA-FINANCEIRO] Erro ao buscar status do mercado:", err);
    }

    const edicoesProcessaveis = edicoes.filter(
      (edicao) => rodada_atual > edicao.rodadaInicial,
    );
    console.log(
      `[MATA-FINANCEIRO] Encontradas ${edicoesProcessaveis.length} edições para processar (rodada atual: ${rodada_atual})`,
    );

    if (edicoesProcessaveis.length === 0) {
      return {
        participantes: [],
        totalArrecadado: 0,
        totalPago: 0,
        saldoFinal: 0,
        edicoes: [],
      };
    }

    const resultadosConsolidados = new Map();
    let totalArrecadado = 0;
    let totalPago = 0;
    const edicoesProcessadas = [];

    // ✅ OTIMIZAÇÃO: Processar TODAS as edições em PARALELO
    console.log(`[MATA-FINANCEIRO] Processando ${edicoesProcessaveis.length} edições em PARALELO...`);
    const startTime = performance.now();

    const resultadosPorEdicao = await Promise.all(
      edicoesProcessaveis.map(async (edicao) => {
        const resultados = await calcularResultadosEdicaoFluxo(
          ligaId,
          edicao,
          rodada_atual,
        );
        return { edicao, resultados };
      })
    );

    const elapsed = Math.round(performance.now() - startTime);
    console.log(`[MATA-FINANCEIRO] ${edicoesProcessaveis.length} edições processadas em ${elapsed}ms`);

    // Consolidar resultados
    for (const { edicao, resultados: resultadosEdicao } of resultadosPorEdicao) {
      if (resultadosEdicao.length > 0) {
        resultadosEdicao.forEach((resultado) => {
          const timeId = resultado.timeId;
          if (!resultadosConsolidados.has(timeId)) {
            resultadosConsolidados.set(timeId, {
              timeId: timeId,
              nome: resultado.nome || `Time ${timeId}`,
              totalPago: 0,
              totalRecebido: 0,
              saldoFinal: 0,
              edicoes: [],
            });
          }

          const participante = resultadosConsolidados.get(timeId);
          if (resultado.valor > 0) {
            participante.totalRecebido += resultado.valor;
          } else {
            participante.totalPago += Math.abs(resultado.valor);
          }

          participante.saldoFinal += resultado.valor;
          participante.edicoes.push({
            edicao: edicao.id,
            fase: resultado.fase,
            valor: resultado.valor,
          });
        });

        const arrecadadoEdicao = 32 * 10.0;
        const pagoEdicao = resultadosEdicao
          .filter((r) => r.valor > 0)
          .reduce((total, r) => total + r.valor, 0);
        totalArrecadado += arrecadadoEdicao;
        totalPago += pagoEdicao;

        edicoesProcessadas.push({
          edicao: edicao.id,
          nome: edicao.nome,
          arrecadado: arrecadadoEdicao,
          pago: pagoEdicao,
        });
      }
    }

    const participantesArray = Array.from(resultadosConsolidados.values());
    console.log(
      `[MATA-FINANCEIRO] CONSOLIDADO: ${participantesArray.length} participantes, R$ ${totalArrecadado.toFixed(2)} total`,
    );

    return {
      participantes: participantesArray,
      totalArrecadado: totalArrecadado,
      totalPago: totalPago,
      saldoFinal: totalArrecadado - totalPago,
      edicoes: edicoesProcessadas,
    };
  } catch (error) {
    console.error("[MATA-FINANCEIRO] Erro ao calcular resultados:", error);
    return {
      participantes: [],
      totalArrecadado: 0,
      totalPago: 0,
      saldoFinal: 0,
      edicoes: [],
    };
  }
}

// Função para calcular resultados de uma edição específica
export async function calcularResultadosEdicaoFluxo(
  ligaId,
  edicao,
  rodadaAtual,
) {
  try {
    const resultadosFinanceiros = [];
    const fases = ["primeira", "oitavas", "quartas", "semis", "final"];

    const rodadasFases = {
      primeira: edicao.rodadaInicial,
      oitavas: edicao.rodadaInicial + 1,
      quartas: edicao.rodadaInicial + 2,
      semis: edicao.rodadaInicial + 3,
      final: edicao.rodadaInicial + 4,
    };

    // ✅ OTIMIZAÇÃO: Identificar quais rodadas precisam ser carregadas
    const rodadasNecessarias = fases
      .map(fase => rodadasFases[fase])
      .filter(rodada => rodada < rodadaAtual);

    // Incluir rodada de definição
    const todasRodadas = [edicao.rodadaDefinicao, ...rodadasNecessarias];

    // ✅ PRÉ-CARREGAR TODAS AS RODADAS EM PARALELO
    const rodadasData = await Promise.all(
      todasRodadas.map(async (rodada) => {
        if (rodada === edicao.rodadaDefinicao) {
          return { rodada, tipo: 'ranking', data: await getRankingRodadaEspecifica(ligaId, rodada) };
        }
        return { rodada, tipo: 'pontos', data: await getPontosDaRodada(ligaId, rodada) };
      })
    );

    // Criar mapa de dados para acesso rápido
    const pontosCache = new Map();
    let rankingBase = null;

    for (const item of rodadasData) {
      if (item.tipo === 'ranking') {
        rankingBase = item.data;
      } else {
        pontosCache.set(item.rodada, item.data);
      }
    }

    if (!Array.isArray(rankingBase) || rankingBase.length < 32) {
      console.error(
        `[MATA-FINANCEIRO] Ranking base inválido para ${edicao.nome}`,
      );
      return [];
    }

    let vencedoresAnteriores = rankingBase;
    for (const fase of fases) {
      const rodadaPontosNum = rodadasFases[fase];
      if (rodadaPontosNum >= rodadaAtual) break;

      const numJogos =
        fase === "primeira"
          ? 16
          : fase === "oitavas"
            ? 8
            : fase === "quartas"
              ? 4
              : fase === "semis"
                ? 2
                : 1;

      // ✅ USAR CACHE PRÉ-CARREGADO
      const pontosDaRodadaAtual = pontosCache.get(rodadaPontosNum) || [];

      const confrontosFase =
        fase === "primeira"
          ? montarConfrontosPrimeiraFase(rankingBase, pontosDaRodadaAtual)
          : montarConfrontosFase(
              vencedoresAnteriores,
              pontosDaRodadaAtual,
              numJogos,
            );

      const proximosVencedores = [];
      confrontosFase.forEach((c) => {
        let vencedor = null;
        let perdedor = null;

        if (
          typeof c.timeA.pontos === "number" &&
          typeof c.timeB.pontos === "number"
        ) {
          if (c.timeA.pontos > c.timeB.pontos) {
            vencedor = c.timeA;
            perdedor = c.timeB;
          } else if (c.timeB.pontos > c.timeA.pontos) {
            vencedor = c.timeB;
            perdedor = c.timeA;
          } else {
            vencedor = c.timeA.rankR2 < c.timeB.rankR2 ? c.timeA : c.timeB;
            perdedor = vencedor === c.timeA ? c.timeB : c.timeA;
          }
        } else {
          vencedor = c.timeA.rankR2 < c.timeB.rankR2 ? c.timeA : c.timeB;
          perdedor = vencedor === c.timeA ? c.timeB : c.timeA;
        }

        if (vencedor && perdedor) {
          resultadosFinanceiros.push({
            timeId: String(vencedor.timeId || vencedor.id),
            nome:
              vencedor.nome_time ||
              vencedor.nome_cartoleiro ||
              `Time ${vencedor.timeId}`,
            fase: fase,
            rodadaPontos: rodadaPontosNum,
            valor: 10.0,
          });
          resultadosFinanceiros.push({
            timeId: String(perdedor.timeId || perdedor.id),
            nome:
              perdedor.nome_time ||
              perdedor.nome_cartoleiro ||
              `Time ${perdedor.timeId}`,
            fase: fase,
            rodadaPontos: rodadaPontosNum,
            valor: -10.0,
          });

          vencedor.jogoAnterior = c.jogo;
          proximosVencedores.push(vencedor);
        }
      });
      vencedoresAnteriores = proximosVencedores;
    }

    console.log(
      `[MATA-FINANCEIRO] ${edicao.nome}: ${resultadosFinanceiros.length} resultados`,
    );
    return resultadosFinanceiros;
  } catch (error) {
    console.error(
      `[MATA-FINANCEIRO] Erro ao calcular edição ${edicao.nome}:`,
      error,
    );
    return [];
  }
}

// Funções de debug e teste
export function debugEdicoesMataMataFluxo() {
  console.log("[MATA-FINANCEIRO] Edições configuradas:");
  edicoes.forEach((edicao) => {
    console.log(
      `  ${edicao.nome}: rodadas ${edicao.rodadaInicial}-${edicao.rodadaFinal}, ativo: ${edicao.ativo}`,
    );
  });
  return edicoes;
}

export async function testarDadosMataMata() {
  console.log("=== TESTE DOS DADOS DO MATA-MATA ===");
  try {
    const resultado = await getResultadosMataMataFluxo();
    console.log("Estrutura do resultado:", {
      temParticipantes: !!resultado.participantes,
      numeroParticipantes: resultado.participantes?.length || 0,
      totalArrecadado: resultado.totalArrecadado,
      totalPago: resultado.totalPago,
      saldoFinal: resultado.saldoFinal,
      numeroEdicoes: resultado.edicoes?.length || 0,
    });

    if (resultado.participantes && resultado.participantes.length > 0) {
      const primeiroParticipante = resultado.participantes[0];
      console.log("Primeiro participante:", {
        timeId: primeiroParticipante.timeId,
        nome: primeiroParticipante.nome,
        numeroEdicoes: primeiroParticipante.edicoes?.length || 0,
        saldoFinal: primeiroParticipante.saldoFinal,
      });

      if (
        primeiroParticipante.edicoes &&
        primeiroParticipante.edicoes.length > 0
      ) {
        console.log(
          "Primeira edição do participante:",
          primeiroParticipante.edicoes[0],
        );
      }
    }

    return resultado;
  } catch (error) {
    console.error("Erro no teste:", error);
    return null;
  }
}