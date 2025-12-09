/**
 * MATA-MATA-BACKEND.JS v1.0
 * Lógica de Mata-Mata para Node.js - Espelho do frontend
 * Calcula todas as fases: primeira, oitavas, quartas, semis, final
 */

import Rodada from "../models/Rodada.js";

// ============================================================================
// CONFIGURAÇÃO DAS EDIÇÕES (sincronizado com mata-mata-config.js)
// ============================================================================

const EDICOES_MATA_MATA = [
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

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Busca ranking de uma rodada específica do MongoDB
 */
async function getRankingRodada(ligaId, rodada) {
    try {
        const registros = await Rodada.find({
            ligaId: ligaId,
            rodada: rodada,
        })
            .select("timeId pontos nome_time nome_cartola")
            .lean();

        if (!registros || registros.length === 0) {
            console.warn(`[MATA-BACKEND] Sem dados para rodada ${rodada}`);
            return [];
        }

        // Ordenar por pontos (maior primeiro) e adicionar posição
        const ranking = registros
            .sort((a, b) => b.pontos - a.pontos)
            .map((r, idx) => ({
                timeId: String(r.timeId),
                pontos: r.pontos,
                nome_time: r.nome_time,
                nome_cartola: r.nome_cartola,
                posicao: idx + 1,
            }));

        return ranking;
    } catch (error) {
        console.error(
            `[MATA-BACKEND] Erro ao buscar ranking rodada ${rodada}:`,
            error,
        );
        return [];
    }
}

/**
 * Converte ranking em mapa de pontos
 */
function criarMapaPontos(ranking) {
    const mapa = {};
    ranking.forEach((t) => {
        mapa[t.timeId] = t.pontos;
    });
    return mapa;
}

// ============================================================================
// MONTAGEM DE CONFRONTOS (espelho do frontend)
// ============================================================================

/**
 * Monta confrontos da 1ª Fase (1º vs 32º, 2º vs 31º, etc.)
 */
function montarConfrontosPrimeiraFase(rankingBase, pontosRodadaAtual) {
    const confrontos = [];

    for (let i = 0; i < 16; i++) {
        const timeA = rankingBase[i];
        const timeB = rankingBase[31 - i];

        if (!timeA || !timeB) continue;

        const pontosA = pontosRodadaAtual[timeA.timeId] ?? null;
        const pontosB = pontosRodadaAtual[timeB.timeId] ?? null;

        confrontos.push({
            jogo: i + 1,
            timeA: {
                timeId: timeA.timeId,
                nome: timeA.nome_time || timeA.nome_cartola,
                pontos: pontosA,
                rankR2: i + 1,
            },
            timeB: {
                timeId: timeB.timeId,
                nome: timeB.nome_time || timeB.nome_cartola,
                pontos: pontosB,
                rankR2: 32 - i,
            },
        });
    }

    return confrontos;
}

/**
 * Monta confrontos de fases eliminatórias (oitavas, quartas, semis, final)
 */
function montarConfrontosFase(
    vencedoresAnteriores,
    pontosRodadaAtual,
    numJogos,
) {
    const confrontos = [];

    // Ordenar por jogo anterior para manter chaveamento correto
    const vencedoresOrdenados = [...vencedoresAnteriores].sort(
        (a, b) => (a.jogoAnterior || 0) - (b.jogoAnterior || 0),
    );

    for (let i = 0; i < numJogos; i++) {
        const timeA = vencedoresOrdenados[i * 2];
        const timeB = vencedoresOrdenados[i * 2 + 1];

        if (!timeA || !timeB) continue;

        const pontosA = pontosRodadaAtual[timeA.timeId] ?? null;
        const pontosB = pontosRodadaAtual[timeB.timeId] ?? null;

        confrontos.push({
            jogo: i + 1,
            timeA: {
                ...timeA,
                pontos: pontosA,
            },
            timeB: {
                ...timeB,
                pontos: pontosB,
            },
        });
    }

    return confrontos;
}

/**
 * Determina vencedor de um confronto
 * Critério: maior pontuação, empate decide por ranking na rodada de definição
 */
function determinarVencedor(confronto) {
    const { timeA, timeB } = confronto;

    const pontosAValidos = typeof timeA.pontos === "number";
    const pontosBValidos = typeof timeB.pontos === "number";

    let vencedor, perdedor;

    if (pontosAValidos && pontosBValidos) {
        if (timeA.pontos > timeB.pontos) {
            vencedor = timeA;
            perdedor = timeB;
        } else if (timeB.pontos > timeA.pontos) {
            vencedor = timeB;
            perdedor = timeA;
        } else {
            // Empate: vence quem tem melhor ranking (menor rankR2)
            if ((timeA.rankR2 || 999) < (timeB.rankR2 || 999)) {
                vencedor = timeA;
                perdedor = timeB;
            } else {
                vencedor = timeB;
                perdedor = timeA;
            }
        }
    } else {
        // Sem pontos: decide por ranking
        if ((timeA.rankR2 || 999) < (timeB.rankR2 || 999)) {
            vencedor = timeA;
            perdedor = timeB;
        } else {
            vencedor = timeB;
            perdedor = timeA;
        }
    }

    return { vencedor, perdedor };
}

// ============================================================================
// CÁLCULO PRINCIPAL
// ============================================================================

/**
 * Calcula resultados financeiros de uma edição do Mata-Mata
 * Retorna array de { timeId, fase, rodadaPontos, valor }
 */
async function calcularResultadosEdicao(ligaId, edicao, rodadaAtual) {
    const resultadosFinanceiros = [];
    const fases = ["primeira", "oitavas", "quartas", "semis", "final"];

    try {
        // Buscar ranking da rodada de definição
        const rankingBase = await getRankingRodada(
            ligaId,
            edicao.rodadaDefinicao,
        );

        if (!rankingBase || rankingBase.length < 32) {
            console.warn(
                `[MATA-BACKEND] Ranking base insuficiente para ${edicao.nome}: ${rankingBase?.length || 0} times`,
            );
            return [];
        }

        // Mapear rodadas de cada fase
        const rodadasFases = {
            primeira: edicao.rodadaInicial,
            oitavas: edicao.rodadaInicial + 1,
            quartas: edicao.rodadaInicial + 2,
            semis: edicao.rodadaInicial + 3,
            final: edicao.rodadaInicial + 4,
        };

        let vencedoresAnteriores = rankingBase.map((r, idx) => ({
            ...r,
            rankR2: idx + 1,
        }));

        for (const fase of fases) {
            const rodadaPontosNum = rodadasFases[fase];

            // Verificar se rodada já foi concluída
            if (rodadaPontosNum >= rodadaAtual) {
                console.log(
                    `[MATA-BACKEND] Fase ${fase} (R${rodadaPontosNum}) ainda não concluída`,
                );
                break;
            }

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

            // Buscar pontos da rodada
            const rankingRodada = await getRankingRodada(
                ligaId,
                rodadaPontosNum,
            );
            const pontosRodada = criarMapaPontos(rankingRodada);

            // Montar confrontos
            const confrontos =
                fase === "primeira"
                    ? montarConfrontosPrimeiraFase(rankingBase, pontosRodada)
                    : montarConfrontosFase(
                          vencedoresAnteriores,
                          pontosRodada,
                          numJogos,
                      );

            // Processar confrontos e determinar vencedores
            const proximosVencedores = [];

            confrontos.forEach((confronto) => {
                const { vencedor, perdedor } = determinarVencedor(confronto);

                if (vencedor && perdedor) {
                    // Registrar resultado financeiro do vencedor
                    resultadosFinanceiros.push({
                        timeId: String(vencedor.timeId),
                        fase: fase,
                        rodadaPontos: rodadaPontosNum,
                        valor: 10.0,
                        edicao: edicao.id,
                    });

                    // Registrar resultado financeiro do perdedor
                    resultadosFinanceiros.push({
                        timeId: String(perdedor.timeId),
                        fase: fase,
                        rodadaPontos: rodadaPontosNum,
                        valor: -10.0,
                        edicao: edicao.id,
                    });

                    // Preparar vencedor para próxima fase
                    vencedor.jogoAnterior = confronto.jogo;
                    proximosVencedores.push(vencedor);
                }
            });

            vencedoresAnteriores = proximosVencedores;

            console.log(
                `[MATA-BACKEND] ${edicao.nome} - ${fase}: ${confrontos.length} confrontos, ${proximosVencedores.length} vencedores`,
            );
        }

        return resultadosFinanceiros;
    } catch (error) {
        console.error(`[MATA-BACKEND] Erro ao calcular ${edicao.nome}:`, error);
        return [];
    }
}

// ============================================================================
// FUNÇÕES EXPORTADAS
// ============================================================================

/**
 * Calcula resultados de TODAS as edições do Mata-Mata para uma liga
 * Retorna array consolidado de transações financeiras
 */
export async function getResultadosMataMataCompleto(ligaId, rodadaAtual) {
    console.log(
        `[MATA-BACKEND] Calculando Mata-Mata para liga ${ligaId}, rodada ${rodadaAtual}`,
    );

    const todosResultados = [];

    // Filtrar edições que já começaram
    const edicoesProcessaveis = EDICOES_MATA_MATA.filter(
        (edicao) => rodadaAtual > edicao.rodadaInicial,
    );

    console.log(
        `[MATA-BACKEND] ${edicoesProcessaveis.length} edições para processar`,
    );

    for (const edicao of edicoesProcessaveis) {
        const resultadosEdicao = await calcularResultadosEdicao(
            ligaId,
            edicao,
            rodadaAtual,
        );
        todosResultados.push(...resultadosEdicao);
    }

    console.log(
        `[MATA-BACKEND] Total: ${todosResultados.length} transações calculadas`,
    );

    return todosResultados;
}

/**
 * Calcula resultado do Mata-Mata para um time específico em uma rodada
 * Usado pelo fluxoFinanceiroController
 */
export async function calcularMataMataParaTime(
    ligaId,
    timeId,
    rodadaNumero,
    rodadaAtual,
) {
    // Verificar se a rodada faz parte de alguma edição
    const edicao = EDICOES_MATA_MATA.find(
        (e) => rodadaNumero >= e.rodadaInicial && rodadaNumero <= e.rodadaFinal,
    );

    if (!edicao) return null;

    // Verificar se rodada já foi concluída
    if (rodadaNumero >= rodadaAtual) return null;

    // Calcular resultados da edição
    const resultados = await calcularResultadosEdicao(
        ligaId,
        edicao,
        rodadaAtual,
    );

    // Encontrar resultado do time na rodada específica
    const resultado = resultados.find(
        (r) => r.timeId === String(timeId) && r.rodadaPontos === rodadaNumero,
    );

    if (!resultado) return null;

    const faseLabel =
        {
            primeira: "1ª Fase",
            oitavas: "Oitavas",
            quartas: "Quartas",
            semis: "Semis",
            final: "Final",
        }[resultado.fase] || resultado.fase;

    return {
        valor: resultado.valor,
        descricao: `${resultado.valor > 0 ? "Vitória" : "Derrota"} M-M ${faseLabel}`,
        fase: resultado.fase,
        edicao: resultado.edicao,
    };
}

/**
 * Retorna mapa de resultados por timeId e rodada
 * Formato: Map<"timeId_rodada", valor>
 */
export async function criarMapaMataMata(ligaId, rodadaAtual) {
    const resultados = await getResultadosMataMataCompleto(ligaId, rodadaAtual);
    const mapa = new Map();

    resultados.forEach((r) => {
        const key = `${r.timeId}_${r.rodadaPontos}`;
        mapa.set(key, {
            valor: r.valor,
            fase: r.fase,
            edicao: r.edicao,
        });
    });

    console.log(`[MATA-BACKEND] Mapa criado com ${mapa.size} entradas`);

    return mapa;
}

console.log("[MATA-BACKEND] ✅ Módulo v1.0 carregado");
