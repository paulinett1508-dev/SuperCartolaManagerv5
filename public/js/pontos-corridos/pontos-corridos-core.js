// PONTOS CORRIDOS CORE - Lógica Central
// Responsável por: cálculos, processamento de dados, algoritmos principais

import {
  PONTOS_CORRIDOS_CONFIG,
  getLigaId,
  calcularRodadaBrasileirao,
} from "./pontos-corridos-config.js";

// Variável para função de ranking dinâmica
let getRankingRodadaEspecifica = null;

// Função para injetar dependência do módulo rodadas
export function setRankingFunction(rankingFunction) {
  getRankingRodadaEspecifica = rankingFunction;
}

// Gera confrontos todos contra todos, sem repetição
export function gerarConfrontos(times) {
  const n = times.length;
  const rodadas = [];
  const lista = [...times];
  if (n % 2 !== 0) lista.push(null); // adiciona bye se ímpar

  for (let rodada = 0; rodada < n - 1; rodada++) {
    const jogos = [];
    for (let i = 0; i < n / 2; i++) {
      const timeA = lista[i];
      const timeB = lista[n - 1 - i];
      if (timeA && timeB) {
        jogos.push({ timeA, timeB });
      }
    }
    rodadas.push(jogos);
    lista.splice(1, 0, lista.pop()); // rotaciona times
  }
  return rodadas;
}

// Calcula resultado do confronto
export function calcularResultadoConfronto(pontosA, pontosB) {
  const { empateTolerancia, goleadaMinima } = PONTOS_CORRIDOS_CONFIG.criterios;
  const { vitoria, empate, derrota, goleada } =
    PONTOS_CORRIDOS_CONFIG.pontuacao;

  const diff = Math.abs(pontosA - pontosB);

  if (diff <= empateTolerancia) {
    return { resultado: "empate", pontosA: empate, pontosB: empate };
  }

  if (pontosA > pontosB) {
    if (diff >= goleadaMinima) {
      return { resultado: "goleadaA", pontosA: goleada, pontosB: derrota };
    }
    return { resultado: "vitoriaA", pontosA: vitoria, pontosB: derrota };
  }

  if (pontosB > pontosA) {
    if (diff >= goleadaMinima) {
      return { resultado: "goleadaB", pontosA: derrota, pontosB: goleada };
    }
    return { resultado: "vitoriaB", pontosA: derrota, pontosB: vitoria };
  }

  return { resultado: "empate", pontosA: empate, pontosB: empate };
}

// Calcula valores financeiros do confronto
export function calcularFinanceiroConfronto(pontosA, pontosB) {
  const { empateTolerancia, goleadaMinima } = PONTOS_CORRIDOS_CONFIG.criterios;
  const { vitoria, empate, goleada, goleadaPerda } =
    PONTOS_CORRIDOS_CONFIG.financeiro;

  let financeiroA = 0;
  let financeiroB = 0;
  let pontosGoleadaA = 0;
  let pontosGoleadaB = 0;

  if (pontosA === null || pontosB === null) {
    return {
      financeiroA: 0,
      financeiroB: 0,
      pontosGoleadaA: 0,
      pontosGoleadaB: 0,
    };
  }

  const diferenca = Math.abs(pontosA - pontosB);

  if (diferenca <= empateTolerancia) {
    // Empate
    financeiroA = empate;
    financeiroB = empate;
  } else if (diferenca >= goleadaMinima) {
    // Goleada
    if (pontosA > pontosB) {
      financeiroA = goleada;
      financeiroB = goleadaPerda;
      pontosGoleadaA = 1;
    } else {
      financeiroA = goleadaPerda;
      financeiroB = goleada;
      pontosGoleadaB = 1;
    }
  } else {
    // Vitória simples
    if (pontosA > pontosB) {
      financeiroA = vitoria;
      financeiroB = -vitoria;
    } else {
      financeiroA = -vitoria;
      financeiroB = vitoria;
    }
  }

  return { financeiroA, financeiroB, pontosGoleadaA, pontosGoleadaB };
}

// Busca status do mercado
export async function buscarStatusMercado() {
  try {
    const res = await fetch("/api/cartola/mercado/status");
    if (!res.ok) throw new Error("Erro ao buscar status do mercado");
    return await res.json();
  } catch (err) {
    console.error("Erro ao buscar status do mercado:", err);
    return { rodada_atual: 1, status_mercado: 2 };
  }
}

// Busca times da liga
export async function buscarTimesLiga(ligaId) {
  try {
    const res = await fetch(`/api/ligas/${ligaId}/times`);
    if (!res.ok) throw new Error("Erro ao buscar times da liga");
    return await res.json();
  } catch (err) {
    console.error("Erro ao buscar times da liga:", err);
    return [];
  }
}

// Processa dados de uma rodada específica
export async function processarDadosRodada(ligaId, rodadaCartola, jogos) {
  if (!getRankingRodadaEspecifica) {
    throw new Error("Função getRankingRodadaEspecifica não disponível");
  }

  try {
    const rankingDaRodada = await getRankingRodadaEspecifica(
      ligaId,
      rodadaCartola,
    );

    if (!rankingDaRodada || !Array.isArray(rankingDaRodada)) {
      console.warn(`Ranking para rodada ${rodadaCartola} não encontrado`);
      return { pontuacoesMap: {}, temDados: false };
    }

    const pontuacoesMap = {};
    rankingDaRodada.forEach((rank) => {
      if (
        rank &&
        typeof rank.timeId === "number" &&
        typeof rank.pontos === "number"
      ) {
        pontuacoesMap[rank.timeId] = rank.pontos;
      }
    });

    return { pontuacoesMap, temDados: true };
  } catch (error) {
    console.error(`Erro ao processar rodada ${rodadaCartola}:`, error);
    return { pontuacoesMap: {}, temDados: false };
  }
}

// Calcula classificação completa
export async function calcularClassificacao(
  ligaId,
  times,
  confrontos,
  rodadaAtualBrasileirao,
) {
  const tabela = {};

  // Inicializa tabela
  times.forEach((time) => {
    tabela[time.id] = {
      time,
      pontos: 0,
      jogos: 0,
      vitorias: 0,
      empates: 0,
      derrotas: 0,
      pontosPro: 0,
      pontosContra: 0,
      saldoPontos: 0,
      pontosGoleada: 0,
      financeiroTotal: 0,
    };
  });

  let ultimaRodadaComDados = 0;
  let houveErro = false;

  // Prepara rodadas para processar
  const rodadasParaBuscar = [];
  for (let idxRodada = 0; idxRodada < confrontos.length; idxRodada++) {
    const rodadaCartola = calcularRodadaBrasileirao(idxRodada);
    if (rodadaCartola >= rodadaAtualBrasileirao) break;
    rodadasParaBuscar.push({ idxRodada, rodadaCartola });
  }

  // Processa em lotes
  const { maxConcurrentRequests } = PONTOS_CORRIDOS_CONFIG;
  for (let i = 0; i < rodadasParaBuscar.length; i += maxConcurrentRequests) {
    const batch = rodadasParaBuscar.slice(i, i + maxConcurrentRequests);

    const results = await Promise.all(
      batch.map(async ({ idxRodada, rodadaCartola }) => {
        const jogos = confrontos[idxRodada];
        const resultado = await processarDadosRodada(
          ligaId,
          rodadaCartola,
          jogos,
        );
        return { idxRodada, rodadaCartola, jogos, ...resultado };
      }),
    );

    // Processa resultados do lote
    results.forEach(
      ({ idxRodada, rodadaCartola, jogos, pontuacoesMap, temDados }) => {
        if (!temDados) {
          houveErro = true;
          return;
        }

        ultimaRodadaComDados = Math.max(ultimaRodadaComDados, idxRodada + 1);

        // Calcula confrontos da rodada
        jogos.forEach((jogo) => {
          const idA = jogo.timeA.id;
          const idB = jogo.timeB.id;
          const pontosA = pontuacoesMap[idA];
          const pontosB = pontuacoesMap[idB];

          if (
            tabela[idA] === undefined ||
            tabela[idB] === undefined ||
            pontosA === undefined ||
            pontosB === undefined
          ) {
            return;
          }

          const res = calcularResultadoConfronto(pontosA, pontosB);
          const financeiro = calcularFinanceiroConfronto(pontosA, pontosB);

          // Atualiza estatísticas
          tabela[idA].pontos += res.pontosA;
          tabela[idB].pontos += res.pontosB;
          tabela[idA].pontosPro += pontosA;
          tabela[idA].pontosContra += pontosB;
          tabela[idB].pontosPro += pontosB;
          tabela[idB].pontosContra += pontosA;
          tabela[idA].saldoPontos += pontosA - pontosB;
          tabela[idB].saldoPontos += pontosB - pontosA;
          tabela[idA].jogos += 1;
          tabela[idB].jogos += 1;

          // Pontos goleada e financeiro
          tabela[idA].pontosGoleada += financeiro.pontosGoleadaA || 0;
          tabela[idB].pontosGoleada += financeiro.pontosGoleadaB || 0;
          tabela[idA].financeiroTotal += financeiro.financeiroA || 0;
          tabela[idB].financeiroTotal += financeiro.financeiroB || 0;

          // Vitórias/Empates/Derrotas
          if (res.pontosA > res.pontosB) {
            tabela[idA].vitorias += 1;
            tabela[idB].derrotas += 1;
          } else if (res.pontosA < res.pontosB) {
            tabela[idB].vitorias += 1;
            tabela[idA].derrotas += 1;
          } else {
            tabela[idA].empates += 1;
            tabela[idB].empates += 1;
          }
        });
      },
    );
  }

  // Ordena classificação
  let classificacao = Object.values(tabela);

  if (ultimaRodadaComDados > 0) {
    classificacao.sort((a, b) => {
      // Aplica critérios de desempate configurados
      const criterios = PONTOS_CORRIDOS_CONFIG.desempate;

      for (const criterio of criterios) {
        if (criterio === "nomeCartola") {
          const nomeA = a.time.nome_cartola || a.time.nome_cartoleiro || "";
          const nomeB = b.time.nome_cartola || b.time.nome_cartoleiro || "";
          const comp = nomeA.localeCompare(nomeB);
          if (comp !== 0) return comp;
        } else {
          const diff = b[criterio] - a[criterio];
          if (diff !== 0) return diff;
        }
      }
      return 0;
    });
  } else {
    // Ordem alfabética se não houver dados
    classificacao.sort((a, b) => {
      const nomeA = a.time.nome_cartola || a.time.nome_cartoleiro || "";
      const nomeB = b.time.nome_cartola || b.time.nome_cartoleiro || "";
      return nomeA.localeCompare(nomeB);
    });
  }

  return {
    classificacao,
    ultimaRodadaComDados,
    houveErro,
  };
}

// Normaliza dados para exportação
export function normalizarDadosParaExportacao(jogo, pontuacoesMap) {
  const idA = jogo.timeA.id;
  const idB = jogo.timeB.id;
  const pontosA = pontuacoesMap[idA] ?? null;
  const pontosB = pontuacoesMap[idB] ?? null;
  const financeiro = calcularFinanceiroConfronto(pontosA, pontosB);

  return {
    timeA: {
      nome_time: jogo.timeA.nome_time || jogo.timeA.nome || "N/D",
      nome_cartola:
        jogo.timeA.nome_cartola || jogo.timeA.nome_cartoleiro || "N/D",
      clube_id: jogo.timeA.clube_id || null,
      pontos: pontosA,
      financeiro: financeiro.financeiroA,
      pontosGoleada: financeiro.pontosGoleadaA,
    },
    timeB: {
      nome_time: jogo.timeB.nome_time || jogo.timeB.nome || "N/D",
      nome_cartola:
        jogo.timeB.nome_cartola || jogo.timeB.nome_cartoleiro || "N/D",
      clube_id: jogo.timeB.clube_id || null,
      pontos: pontosB,
      financeiro: financeiro.financeiroB,
      pontosGoleada: financeiro.pontosGoleadaB,
    },
    diferenca:
      pontosA !== null && pontosB !== null ? Math.abs(pontosA - pontosB) : null,
  };
}

// Mapeia classificação para exportação
export function normalizarClassificacaoParaExportacao(classificacao) {
  return classificacao.map((item) => ({
    nome_time: item.time.nome_time || item.time.nome || "N/D",
    nome_cartola: item.time.nome_cartola || item.time.nome_cartoleiro || "N/D",
    clube_id: item.time.clube_id || null,
    pontos: item.pontos,
    jogos: item.jogos,
    vitorias: item.vitorias,
    empates: item.empates,
    derrotas: item.derrotas,
    gols_pro: item.pontosGoleada,
    pontosPro: item.pontosPro,
    pontosContra: item.pontosContra,
    saldoPontos: item.saldoPontos,
    financeiroTotal: item.financeiroTotal,
  }));
}

// Função para validar dados de entrada
export function validarDadosEntrada(times, confrontos) {
  if (!Array.isArray(times) || times.length === 0) {
    throw new Error("Lista de times inválida ou vazia");
  }

  const timesValidos = times.filter((t) => t && typeof t.id === "number");
  if (timesValidos.length === 0) {
    throw new Error("Nenhum time com ID numérico válido encontrado");
  }

  if (!Array.isArray(confrontos) || confrontos.length === 0) {
    throw new Error("Lista de confrontos inválida ou vazia");
  }

  return { timesValidos, confrontosValidos: confrontos };
}

// Função para obter confrontos com pontuações (para fluxo financeiro)
export async function getConfrontosLigaPontosCorridos() {
  const ligaId = getLigaId();
  if (!ligaId) {
    console.error("ID da Liga não encontrado para buscar confrontos LPC.");
    return [];
  }

  if (!getRankingRodadaEspecifica) {
    console.error("Função getRankingRodadaEspecifica não disponível");
    return [];
  }

  try {
    const times = await buscarTimesLiga(ligaId);
    if (!times || times.length === 0) {
      console.error("Nenhum time encontrado para gerar confrontos LPC.");
      return [];
    }

    const confrontosBase = gerarConfrontos(times);
    const status = await buscarStatusMercado();
    const ultimaRodadaCompleta = status ? status.rodada_atual - 1 : 0;

    const confrontosComPontos = [];

    for (let i = 0; i < confrontosBase.length; i++) {
      const rodadaNum = i + 1;
      const rodadaCartola = calcularRodadaBrasileirao(i);
      const jogosDaRodada = confrontosBase[i];
      const jogosComPontos = [];

      let pontuacoesRodada = {};
      if (rodadaCartola <= ultimaRodadaCompleta) {
        try {
          const rankingDaRodada = await getRankingRodadaEspecifica(
            ligaId,
            rodadaCartola,
          );
          if (rankingDaRodada) {
            rankingDaRodada.forEach((p) => {
              pontuacoesRodada[p.time_id || p.timeId] = p.pontos;
            });
          }
        } catch (err) {
          console.error(
            `Erro ao buscar pontuações para rodada ${rodadaNum}:`,
            err,
          );
        }
      }

      for (const jogo of jogosDaRodada) {
        const timeAId = jogo.timeA.id || jogo.timeA.time_id;
        const timeBId = jogo.timeB.id || jogo.timeB.time_id;
        const pontosA =
          pontuacoesRodada[timeAId] !== undefined
            ? pontuacoesRodada[timeAId]
            : null;
        const pontosB =
          pontuacoesRodada[timeBId] !== undefined
            ? pontuacoesRodada[timeBId]
            : null;

        jogosComPontos.push({
          time1: jogo.timeA,
          time2: jogo.timeB,
          pontos1: pontosA,
          pontos2: pontosB,
        });
      }

      confrontosComPontos.push({
        rodada: rodadaNum,
        jogos: jogosComPontos,
      });
    }

    console.log("Confrontos da Liga Pontos Corridos carregados com sucesso");
    return confrontosComPontos;
  } catch (error) {
    console.error("Erro ao buscar confrontos da Liga Pontos Corridos:", error);
    return [];
  }
}

// CORREÇÃO: Função exportada para mata-mata
export function getRodadaPontosText(rodadaLiga, edicao) {
  if (!rodadaLiga) return "Rodada não definida";
  const rodadaBrasileirao = PONTOS_CORRIDOS_CONFIG.rodadaInicial + (rodadaLiga - 1);
  return `${rodadaLiga}ª Rodada da Liga (Rodada ${rodadaBrasileirao}ª do Brasileirão)`;
}

// Garantir que está disponível globalmente também
if (typeof window !== "undefined") {
  window.getRodadaPontosText = getRodadaPontosText;
}

console.log("[PONTOS-CORRIDOS-CORE] Módulo carregado com sucesso");
