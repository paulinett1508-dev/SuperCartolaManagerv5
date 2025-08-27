// MATA-MATA CONFRONTOS - Lógica de Negócio
// Responsável por: cálculo de confrontos, vencedores, pontos por rodada

// Cache para getRankingRodadaEspecifica
let getRankingRodadaEspecifica = null;

// Função para definir dependência externa
export function setRankingFunction(func) {
  getRankingRodadaEspecifica = func;
}

// Função para obter pontos de uma rodada
export async function getPontosDaRodada(ligaId, rodada) {
  try {
    if (!getRankingRodadaEspecifica) {
      console.warn(
        "[MATA-CONFRONTOS] Função getRankingRodadaEspecifica não disponível",
      );
      return {};
    }

    const rankingDaRodada = await getRankingRodadaEspecifica(ligaId, rodada);
    const mapa = {};
    if (Array.isArray(rankingDaRodada)) {
      rankingDaRodada.forEach((t) => {
        if (t.timeId && typeof t.pontos === "number") {
          mapa[t.timeId] = t.pontos;
        }
      });
    }
    return mapa;
  } catch (err) {
    console.error(
      `[MATA-CONFRONTOS] Falha em getPontosDaRodada(${rodada}):`,
      err,
    );
    return {};
  }
}

// Função para montar confrontos da primeira fase
export function montarConfrontosPrimeiraFase(rankingBase, pontosRodadaAtual) {
  const confrontos = [];
  for (let i = 0; i < 16; i++) {
    const timeA = rankingBase[i];
    const timeB = rankingBase[31 - i];
    const pontosA = pontosRodadaAtual[timeA.timeId] ?? null;
    const pontosB = pontosRodadaAtual[timeB.timeId] ?? null;

    confrontos.push({
      jogo: i + 1,
      timeA: {
        ...timeA,
        pontos: pontosA,
        nome_cartoleiro: timeA.nome_cartoleiro || timeA.nome_cartola,
        rankR2: i + 1,
      },
      timeB: {
        ...timeB,
        pontos: pontosB,
        nome_cartoleiro: timeB.nome_cartoleiro || timeB.nome_cartola,
        rankR2: 32 - i,
      },
    });
  }
  return confrontos;
}

// Função para montar confrontos de fases eliminatórias
export function montarConfrontosFase(
  vencedoresAnteriores,
  pontosRodadaAtual,
  numJogos,
) {
  const confrontos = [];
  vencedoresAnteriores.sort((a, b) => a.jogoAnterior - b.jogoAnterior);

  for (let i = 0; i < numJogos; i++) {
    const timeA = vencedoresAnteriores[i * 2];
    const timeB = vencedoresAnteriores[i * 2 + 1];
    const pontosA = pontosRodadaAtual[timeA.timeId] ?? null;
    const pontosB = pontosRodadaAtual[timeB.timeId] ?? null;

    confrontos.push({
      jogo: i + 1,
      jogoAnteriorA: timeA.jogoAnterior || "?",
      jogoAnteriorB: timeB.jogoAnterior || "?",
      timeA: {
        ...timeA,
        pontos: pontosA,
        nome_cartoleiro: timeA.nome_cartoleiro || timeA.nome_cartola,
      },
      timeB: {
        ...timeB,
        pontos: pontosB,
        nome_cartoleiro: timeB.nome_cartoleiro || timeB.nome_cartola,
      },
    });
  }
  return confrontos;
}

// Função para extrair vencedores dos confrontos
export function extrairVencedores(confrontos) {
  const vencedores = [];
  confrontos.forEach((c) => {
    let vencedor = null;
    let vencedorDeterminado = null;

    const pontosAValidos = typeof c.timeA.pontos === "number";
    const pontosBValidos = typeof c.timeB.pontos === "number";

    if (pontosAValidos && pontosBValidos) {
      if (c.timeA.pontos > c.timeB.pontos) {
        vencedor = c.timeA;
        vencedorDeterminado = "A";
      } else if (c.timeB.pontos > c.timeA.pontos) {
        vencedor = c.timeB;
        vencedorDeterminado = "B";
      } else {
        if (c.timeA.rankR2 < c.timeB.rankR2) {
          vencedor = c.timeA;
          vencedorDeterminado = "A";
        } else {
          vencedor = c.timeB;
          vencedorDeterminado = "B";
        }
      }
    } else {
      if (c.timeA.rankR2 < c.timeB.rankR2) {
        vencedor = c.timeA;
        vencedorDeterminado = "A";
      } else {
        vencedor = c.timeB;
        vencedorDeterminado = "B";
      }
    }

    c.vencedorDeterminado = vencedorDeterminado;

    if (vencedor) {
      vencedor.jogoAnterior = c.jogo;
      vencedores.push(vencedor);
    }
  });
  return vencedores;
}

// Função para calcular confrontos com valores financeiros
export function calcularValoresConfronto(confrontos, isPending) {
  confrontos.forEach((c) => {
    let vencedorDeterminado = null;
    if (!isPending) {
      const pontosAValidos = typeof c.timeA.pontos === "number";
      const pontosBValidos = typeof c.timeB.pontos === "number";
      if (pontosAValidos && pontosBValidos) {
        if (c.timeA.pontos > c.timeB.pontos) vencedorDeterminado = "A";
        else if (c.timeB.pontos > c.timeA.pontos) vencedorDeterminado = "B";
        else vencedorDeterminado = c.timeA.rankR2 < c.timeB.rankR2 ? "A" : "B";
      } else {
        vencedorDeterminado = c.timeA.rankR2 < c.timeB.rankR2 ? "A" : "B";
      }
    }

    c.timeA.valor = isPending ? 0 : vencedorDeterminado === "A" ? 10 : -10;
    c.timeB.valor = isPending ? 0 : vencedorDeterminado === "B" ? 10 : -10;
    c.vencedorDeterminado = vencedorDeterminado;
  });

  return confrontos;
}
