// MATA-MATA FINANCEIRO - Cálculos e Resultados Financeiros
// Responsável por: cálculos de premiação, consolidação de resultados, fluxo financeiro

import { edicoes, getLigaId, VALORES_FASE, TAMANHO_TORNEIO_DEFAULT, getFasesParaTamanho, FASE_NUM_JOGOS, setValoresFase } from "./mata-mata-config.js";
import {
  getPontosDaRodada,
  montarConfrontosPrimeiraFase,
  montarConfrontosFase,
  determinarVencedor,
} from "./mata-mata-confrontos.js";

// Cache para getRankingRodadaEspecifica
let getRankingRodadaEspecifica = null;
let tamanhoTorneio = TAMANHO_TORNEIO_DEFAULT;

// Função para definir dependência externa
export function setRankingFunction(func) {
  getRankingRodadaEspecifica = func;
}

// Função para definir tamanho do torneio
export function setTamanhoTorneio(tamanho) {
  tamanhoTorneio = tamanho;
  console.log(`[MATA-FINANCEIRO] Tamanho do torneio definido: ${tamanho}`);
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
  const fases = getFasesParaTamanho(tamanhoTorneio);

  try {
    const rodadaDefinicao = edicaoAtiva.rodadaDefinicao;
    const rankingBase = await getRankingRodadaEspecifica(
      ligaId,
      rodadaDefinicao,
    );
    if (!Array.isArray(rankingBase) || rankingBase.length < tamanhoTorneio) {
      throw new Error(`Ranking base da Rodada ${rodadaDefinicao} inválido.`);
    }

    // Rodadas de cada fase baseadas no rodadaInicial (dinâmico por fases)
    const rodadasFases = {};
    fases.forEach((fase, idx) => {
      rodadasFases[fase] = edicaoAtiva.rodadaInicial + idx;
    });

    let vencedoresAnteriores = rankingBase;
    const primeiraFase = fases[0];
    for (const fase of fases) {
      const rodadaPontosNum = rodadasFases[fase];
      const numJogos = FASE_NUM_JOGOS[fase] || 1;

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
        fase === primeiraFase
          ? montarConfrontosPrimeiraFase(rankingBase, pontosDaRodadaAtual, tamanhoTorneio)
          : montarConfrontosFase(
              vencedoresAnteriores,
              pontosDaRodadaAtual,
              numJogos,
            );

      const proximosVencedores = [];
      const valoresFase = VALORES_FASE[fase] || VALORES_FASE[primeiraFase] || VALORES_FASE.primeira;
      confrontosFase.forEach((c) => {
        const { vencedor, perdedor } = determinarVencedor(c);

        if (vencedor) {
          resultadosFinanceiros.push({
            timeId: String(vencedor.timeId || vencedor.id),
            fase: fase,
            rodadaPontos: rodadaPontosNum,
            valor: valoresFase.vitoria,
          });
          resultadosFinanceiros.push({
            timeId: String(perdedor.timeId || perdedor.id),
            fase: fase,
            rodadaPontos: rodadaPontosNum,
            valor: valoresFase.derrota,
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

    // Buscar tamanho do torneio se ainda não definido pelo orquestrador
    if (tamanhoTorneio === TAMANHO_TORNEIO_DEFAULT) {
      try {
        const resConfig = await fetch(`/api/liga/${ligaId}/modulos/mata_mata`);
        if (resConfig.ok) {
          const configData = await resConfig.json();
          const wizardRespostas = configData?.config?.wizard_respostas;
          const totalTimes = Number(wizardRespostas?.total_times);
          if (totalTimes && [8, 16, 32].includes(totalTimes)) {
            tamanhoTorneio = totalTimes;
            console.log(`[MATA-FINANCEIRO] Tamanho do torneio via API: ${tamanhoTorneio}`);
          }
          // FIX-4: Carregar valores financeiros da config
          const valorVitoria = Number(wizardRespostas?.valor_vitoria);
          const valorDerrota = Number(wizardRespostas?.valor_derrota);
          if (valorVitoria > 0 && valorDerrota < 0) {
            setValoresFase(valorVitoria, valorDerrota);
          }
        }
      } catch (err) {
        console.warn("[MATA-FINANCEIRO] Erro ao buscar config, usando default");
      }
    }

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

        const faseInicial = getFasesParaTamanho(tamanhoTorneio)[0];
        const valorVitoria = (VALORES_FASE[faseInicial] || VALORES_FASE.primeira).vitoria;
        const arrecadadoEdicao = tamanhoTorneio * valorVitoria;
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
    const fases = getFasesParaTamanho(tamanhoTorneio);
    const primeiraFaseFluxo = fases[0];

    const rodadasFases = {};
    fases.forEach((fase, idx) => {
      rodadasFases[fase] = edicao.rodadaInicial + idx;
    });

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

    if (!Array.isArray(rankingBase) || rankingBase.length < tamanhoTorneio) {
      console.error(
        `[MATA-FINANCEIRO] Ranking base inválido para ${edicao.nome}: ${rankingBase?.length || 0}/${tamanhoTorneio}`,
      );
      return [];
    }

    let vencedoresAnteriores = rankingBase;
    for (const fase of fases) {
      const rodadaPontosNum = rodadasFases[fase];
      if (rodadaPontosNum >= rodadaAtual) break;

      const numJogos = FASE_NUM_JOGOS[fase] || 1;

      // ✅ USAR CACHE PRÉ-CARREGADO
      const pontosDaRodadaAtual = pontosCache.get(rodadaPontosNum) || [];

      const confrontosFase =
        fase === primeiraFaseFluxo
          ? montarConfrontosPrimeiraFase(rankingBase, pontosDaRodadaAtual, tamanhoTorneio)
          : montarConfrontosFase(
              vencedoresAnteriores,
              pontosDaRodadaAtual,
              numJogos,
            );

      const proximosVencedores = [];
      const valoresFase = VALORES_FASE[fase] || VALORES_FASE.primeira;
      confrontosFase.forEach((c) => {
        const { vencedor, perdedor } = determinarVencedor(c);

        if (vencedor && perdedor) {
          resultadosFinanceiros.push({
            timeId: String(vencedor.timeId || vencedor.id),
            nome:
              vencedor.nome_time ||
              vencedor.nome_cartoleiro ||
              `Time ${vencedor.timeId}`,
            fase: fase,
            rodadaPontos: rodadaPontosNum,
            valor: valoresFase.vitoria,
          });
          resultadosFinanceiros.push({
            timeId: String(perdedor.timeId || perdedor.id),
            nome:
              perdedor.nome_time ||
              perdedor.nome_cartoleiro ||
              `Time ${perdedor.timeId}`,
            fase: fase,
            rodadaPontos: rodadaPontosNum,
            valor: valoresFase.derrota,
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