import { getRankingRodadaEspecifica } from "./rodadas.js"; // <-- Adicionado para buscar pontos

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
  const diff = Math.abs(pontosA - pontosB);
  if (diff <= 0.3) return { resultado: "empate", pontosA: 1, pontosB: 1 };
  if (pontosA > pontosB) {
    if (diff >= 50) return { resultado: "goleadaA", pontosA: 4, pontosB: 0 };
    return { resultado: "vitoriaA", pontosA: 3, pontosB: 0 };
  }
  if (pontosB > pontosA) {
    if (diff >= 50) return { resultado: "goleadaB", pontosA: 0, pontosB: 4 };
    return { resultado: "vitoriaB", pontosA: 0, pontosB: 3 };
  }
  return { resultado: "empate", pontosA: 1, pontosB: 1 };
}

// ✅ NOVA FUNÇÃO CENTRALIZADA - LÓGICA CORRIGIDA DOS EMPATES
export function calcularFinanceiroConfronto(pontosA, pontosB) {
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

  // ✅ CORREÇÃO: Empate quando diferença <= 0.3 (consistente com calcularResultadoConfronto)
  if (diferenca <= 0.3) {
    financeiroA = 3.0; // ✅ R$ 3,00 para cada no empate
    financeiroB = 3.0; // ✅ R$ 3,00 para cada no empate
  } else if (diferenca >= 50) {
    // GOLEADA (≥50 pts diferença)
    if (pontosA > pontosB) {
      financeiroA = 7.0;
      financeiroB = -7.0;
      pontosGoleadaA = 1;
    } else {
      financeiroA = -7.0;
      financeiroB = 7.0;
      pontosGoleadaB = 1;
    }
  } else {
    // VITÓRIA SIMPLES
    if (pontosA > pontosB) {
      financeiroA = 5.0;
      financeiroB = -5.0;
    } else {
      financeiroA = -5.0;
      financeiroB = 5.0;
    }
  }

  return { financeiroA, financeiroB, pontosGoleadaA, pontosGoleadaB };
}

// Busca status do mercado e rodada atual
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

// **CORRETO: busca times da liga no endpoint correto**
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

// Busca rodadas da liga, opcional filtro por rodada
export async function buscarRodadaLiga(ligaId, rodada) {
  try {
    const res = await fetch(`/api/ligas/${ligaId}/rodadas?rodada=${rodada}`);
    if (!res.ok) throw new Error("Erro ao buscar rodada da liga");
    return await res.json();
  } catch (err) {
    console.error("Erro ao buscar rodada da liga:", err);
    return [];
  }
}

// Monta objeto { timeId: pontos } para uma rodada
export async function montarPontuacoesPorTime(ligaId, rodada) {
  const rodadas = await buscarRodadaLiga(ligaId, rodada);
  const pontuacoes = {};
  rodadas.forEach((t) => {
    pontuacoes[t.timeId || t.id] = t.pontos;
  });
  return pontuacoes;
}

// Nova função para buscar todos os confrontos da Liga Pontos Corridos com pontuações
// Retorna: Array de objetos { rodada: num, jogos: [{ timeA, timeB, pontosA, pontosB }] }
export async function getConfrontosLigaPontosCorridos() {
  const ligaId = getLigaId(); // Assume que getLigaId() está disponível globalmente ou em utils.js
  if (!ligaId) {
    console.error("ID da Liga não encontrado para buscar confrontos LPC.");
    return [];
  }

  try {
    const times = await buscarTimesLiga(ligaId);
    if (!times || times.length === 0) {
      console.error("Nenhum time encontrado para gerar confrontos LPC.");
      return [];
    }

    const confrontosBase = gerarConfrontos(times); // Gera a estrutura dos confrontos
    const status = await buscarStatusMercado();
    const ultimaRodadaCompleta = status ? status.rodada_atual - 1 : 0;

    const confrontosComPontos = [];

    for (let i = 0; i < confrontosBase.length; i++) {
      const rodadaNum = i + 1;
      const jogosDaRodada = confrontosBase[i];
      const jogosComPontos = [];

      let pontuacoesRodada = {};
      if (rodadaNum <= ultimaRodadaCompleta) {
        // Busca pontuações apenas para rodadas completas
        try {
          // Usa a função getRankingRodadaEspecifica que já busca e filtra
          const rankingDaRodada = await getRankingRodadaEspecifica(
            ligaId,
            rodadaNum,
          ); // <-- Corrigido: Passar ligaId
          if (rankingDaRodada) {
            rankingDaRodada.forEach((p) => {
              pontuacoesRodada[p.time_id || p.timeId] = p.pontos;
            });
          }
        } catch (err) {
          console.error(
            `Erro ao buscar pontuações para rodada ${rodadaNum} (LPC):`,
            err,
          );
          // Continua sem as pontuações para esta rodada
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
          time1: jogo.timeA, // Mantendo a estrutura esperada por fluxo-financeiro.js
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

    console.log("Confrontos da Liga Pontos Corridos com pontos carregados.");
    return confrontosComPontos;
  } catch (error) {
    console.error(
      "Erro geral ao buscar confrontos da Liga Pontos Corridos:",
      error,
    );
    return [];
  }
}

// Função auxiliar para obter o ID da liga (extraído da URL)
export function getLigaId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("id");
}
