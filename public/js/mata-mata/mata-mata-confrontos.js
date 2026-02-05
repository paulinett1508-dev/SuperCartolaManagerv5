// MATA-MATA CONFRONTOS - Lógica de Negócio
// Responsável por: cálculo de confrontos, vencedores, pontos por rodada

import { VALORES_FASE } from "./mata-mata-config.js";

// Cache para getRankingRodadaEspecifica
let getRankingRodadaEspecifica = null;
let tentativasConexao = 0;
const MAX_TENTATIVAS = 3;

// Função para definir dependência externa
export function setRankingFunction(func) {
    getRankingRodadaEspecifica = func;
    console.log("[MATA-CONFRONTOS] ✅ Dependência getRankingRodadaEspecifica injetada");
}

// Função para carregar dinamicamente a dependência se não estiver disponível
async function garantirDependencia() {
  if (getRankingRodadaEspecifica) return true;

  console.warn("[MATA-CONFRONTOS] ⚠️ Dependência não injetada, carregando dinamicamente...");

  try {
    const rodadasModule = await import("../rodadas.js");
    if (rodadasModule && rodadasModule.getRankingRodadaEspecifica) {
      getRankingRodadaEspecifica = rodadasModule.getRankingRodadaEspecifica;
      console.log("[MATA-CONFRONTOS] ✅ Dependência carregada dinamicamente");
      return true;
    }
  } catch (error) {
    console.error("[MATA-CONFRONTOS] ❌ Erro ao carregar dependência:", error);
  }

  return false;
}

// Função para obter pontos de uma rodada (COM PROTEÇÃO ANTI-LOOP)
export async function getPontosDaRodada(ligaId, rodada) {
    // Garantir que a dependência está disponível
    const dependenciaOk = await garantirDependencia();

    if (!dependenciaOk) {
        console.error("[MATA-CONFRONTOS] ❌ Dependência getRankingRodadaEspecifica não disponível");
        return {};
    }

    try {
        // Reset contador em caso de sucesso
        tentativasConexao = 0;

        const rankingDaRodada = await getRankingRodadaEspecifica(
            ligaId,
            rodada,
        );
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
        tentativasConexao++;
        console.error(
            `[MATA-CONFRONTOS] Falha em getPontosDaRodada(${rodada}) - tentativa ${tentativasConexao}:`,
            err,
        );

        if (tentativasConexao >= MAX_TENTATIVAS) {
            console.error(
                "[MATA-CONFRONTOS] Máximo de tentativas atingido. Retornando objeto vazio.",
            );
            return {};
        }

        return {};
    }
}

// Função para montar confrontos da primeira fase (dinâmico por tamanho)
export function montarConfrontosPrimeiraFase(rankingBase, pontosRodadaAtual, tamanhoTorneio = 32) {
    const numJogos = tamanhoTorneio / 2;
    const confrontos = [];
    for (let i = 0; i < numJogos; i++) {
        const timeA = rankingBase[i];
        const timeB = rankingBase[tamanhoTorneio - 1 - i];
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
                rankR2: tamanhoTorneio - i,
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

// Função centralizada para determinar vencedor de um confronto
// Retorna { vencedor, perdedor, lado } onde lado é "A" ou "B"
// Critério: maior pontuação; empate = melhor ranking na rodada de definição (menor rankR2)
export function determinarVencedor(confronto) {
    const { timeA, timeB } = confronto;
    const pontosAValidos = typeof timeA.pontos === "number";
    const pontosBValidos = typeof timeB.pontos === "number";

    let vencedor, perdedor, lado;

    if (pontosAValidos && pontosBValidos) {
        if (timeA.pontos > timeB.pontos) {
            vencedor = timeA; perdedor = timeB; lado = "A";
        } else if (timeB.pontos > timeA.pontos) {
            vencedor = timeB; perdedor = timeA; lado = "B";
        } else {
            // Empate: desempate por ranking da rodada de definição
            if (timeA.rankR2 < timeB.rankR2) {
                vencedor = timeA; perdedor = timeB; lado = "A";
            } else {
                vencedor = timeB; perdedor = timeA; lado = "B";
            }
        }
    } else {
        // Pontos não disponíveis: usar ranking como fallback
        if (timeA.rankR2 < timeB.rankR2) {
            vencedor = timeA; perdedor = timeB; lado = "A";
        } else {
            vencedor = timeB; perdedor = timeA; lado = "B";
        }
    }

    return { vencedor, perdedor, lado };
}

// Função para extrair vencedores dos confrontos
export function extrairVencedores(confrontos) {
    const vencedores = [];
    confrontos.forEach((c) => {
        const { vencedor, lado } = determinarVencedor(c);
        c.vencedorDeterminado = lado;

        if (vencedor) {
            vencedor.jogoAnterior = c.jogo;
            vencedores.push(vencedor);
        }
    });
    return vencedores;
}

// Função para calcular confrontos com valores financeiros
export function calcularValoresConfronto(confrontos, isPending, fase = "primeira") {
    const valoresFase = VALORES_FASE[fase] || VALORES_FASE.primeira;

    confrontos.forEach((c) => {
        let vencedorDeterminado = null;
        if (!isPending) {
            const { lado } = determinarVencedor(c);
            vencedorDeterminado = lado;
        }

        c.timeA.valor = isPending ? 0 : vencedorDeterminado === "A" ? valoresFase.vitoria : valoresFase.derrota;
        c.timeB.valor = isPending ? 0 : vencedorDeterminado === "B" ? valoresFase.vitoria : valoresFase.derrota;
        c.vencedorDeterminado = vencedorDeterminado;
    });

    return confrontos;
}

// Função para verificar se a função de ranking está disponível
export function verificarDisponibilidadeRanking() {
    return getRankingRodadaEspecifica !== null;
}

// Função para resetar contador de tentativas
export function resetarTentativas() {
    tentativasConexao = 0;
    console.log("[MATA-CONFRONTOS] Contador de tentativas resetado");
}