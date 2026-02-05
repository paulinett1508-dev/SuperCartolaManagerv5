/**
 * MATA-MATA-BACKEND.JS v1.1
 * Lógica de Mata-Mata para Node.js - Espelho do frontend
 * Calcula todas as fases: primeira, oitavas, quartas, semis, final
 *
 * v1.1: Fix conversão ligaId + logging detalhado
 */

import mongoose from "mongoose";
import Rodada from "../models/Rodada.js";
import Time from "../models/Time.js"; // Importar modelo Time
import ModuleConfig from "../models/ModuleConfig.js"; // Importar ModuleConfig
import { calcularTamanhoIdealMataMata } from "../utils/tournamentUtils.js"; // Importar nova função
import mataMataRules from "../config/rules/mata_mata.json" with { type: "json" }; // Importar regras padrão
import { CURRENT_SEASON } from "../config/seasons.js";
import _ from 'lodash';


// ============================================================================
// CONFIGURAÇÃO DINÂMICA
// ============================================================================

/**
 * Busca e mescla a configuração do mata-mata para uma liga específica.
 * Carrega as regras padrão do JSON e sobrepõe com as configurações
 * salvas no ModuleConfig para a liga.
 */
async function getMataMataConfig(ligaId) {
    try {
        const defaultConfig = _.cloneDeep(mataMataRules);

        const moduleConfig = await ModuleConfig.findOne({
            liga_id: ligaId,
            temporada: CURRENT_SEASON,
            modulo: 'mata_mata'
        }).lean();

        if (moduleConfig) {
            // Mescla configurações, dando prioridade ao que está no DB
            const mergedConfig = _.merge(defaultConfig, moduleConfig.configuracao_override || {});
            return mergedConfig;
        }

        return defaultConfig;
    } catch (error) {
        console.error(`[MATA-BACKEND] Erro ao carregar configuração do mata-mata para liga ${ligaId}:`, error);
        // Retorna o padrão em caso de erro para não quebrar a execução
        return _.cloneDeep(mataMataRules);
    }
}


// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Busca ranking de uma rodada específica do MongoDB
 */
async function getRankingRodada(ligaId, rodada) {
    try {
        // Converter ligaId para ObjectId se necessário
        let ligaIdQuery;
        if (typeof ligaId === "string") {
            ligaIdQuery = new mongoose.Types.ObjectId(ligaId);
        } else if (ligaId instanceof mongoose.Types.ObjectId) {
            ligaIdQuery = ligaId;
        } else {
            ligaIdQuery = ligaId;
        }

        console.log(
            `[MATA-BACKEND] Buscando ranking: liga=${ligaId}, rodada=${rodada}`,
        );

        const registros = await Rodada.find({
            ligaId: ligaIdQuery,
            rodada: rodada,
        })
            .select("timeId pontos nome_time nome_cartola")
            .lean();

        console.log(
            `[MATA-BACKEND] Encontrados ${registros?.length || 0} registros para R${rodada}`,
        );

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
            error.message,
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
function montarConfrontosPrimeiraFase(rankingBase, pontosRodadaAtual, tamanhoTorneio) {
    const confrontos = [];
    const metade = tamanhoTorneio / 2;

    for (let i = 0; i < metade; i++) {
        const timeA = rankingBase[i];
        const timeB = rankingBase[tamanhoTorneio - 1 - i];

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
                rankR2: tamanhoTorneio - i,
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
    tamanhoTorneio // Adicionado para referência
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
async function calcularResultadosEdicao(ligaId, edicao, rodadaAtual, config) {
    const resultadosFinanceiros = [];
    const fases = ["primeira", "oitavas", "quartas", "semis", "final"];

    try {
        // 1. Contar participantes ativos na liga (filtrado por temporada)
        const totalParticipantes = await Time.countDocuments({ liga_id: ligaId, ativo: true, temporada: CURRENT_SEASON });

        // 2. Calcular tamanho ideal do torneio
        const tamanhoTorneio = calcularTamanhoIdealMataMata(totalParticipantes);

        if (tamanhoTorneio === 0) {
            console.warn(`[MATA-BACKEND] Número de participantes (${totalParticipantes}) insuficiente para o mata-mata.`);
            return [];
        }

        // Buscar ranking da rodada de definição
        const rankingBase = await getRankingRodada(
            ligaId,
            edicao.rodadaDefinicao,
        );

        // Exigir número de times do torneio para a 1ª fase
        if (!rankingBase || rankingBase.length < tamanhoTorneio) {
            console.warn(
                `[MATA-BACKEND] Ranking base insuficiente para ${edicao.nome}: ${rankingBase?.length || 0} times (esperado: ${tamanhoTorneio})`,
            );
            return [];
        }
        
        const rankingClassificados = rankingBase.slice(0, tamanhoTorneio);

        console.log(
            `[MATA-BACKEND] ${edicao.nome}: Torneio com ${tamanhoTorneio} times. Ranking base com ${rankingClassificados.length} times.`,
        );

        // Mapear rodadas de cada fase
        const rodadasFases = {
            primeira: edicao.rodadaInicial,
            oitavas: edicao.rodadaInicial + 1,
            quartas: edicao.rodadaInicial + 2,
            semis: edicao.rodadaInicial + 3,
            final: edicao.rodadaInicial + 4,
        };

        let vencedoresAnteriores = rankingClassificados.map((r, idx) => ({
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

            const numJogos = Math.ceil(vencedoresAnteriores.length / 2);

            // Buscar pontos da rodada
            const rankingRodada = await getRankingRodada(
                ligaId,
                rodadaPontosNum,
            );
            const pontosRodada = criarMapaPontos(rankingRodada);

            // Montar confrontos
            const confrontos = montarConfrontosFase(
                vencedoresAnteriores,
                pontosRodada,
                numJogos,
                tamanhoTorneio
            );

            // Processar confrontos e determinar vencedores
            const proximosVencedores = [];

            confrontos.forEach((confronto) => {
                const { vencedor, perdedor } = determinarVencedor(confronto);

                if (vencedor && perdedor) {
                    // Usar valor da configuração
                    const valorVitoria = config.financeiro.valores_por_fase[fase]?.vitoria || 10.0;
                    const valorDerrota = config.financeiro.valores_por_fase[fase]?.derrota || -10.0;

                    // Registrar resultado financeiro do vencedor
                    resultadosFinanceiros.push({
                        timeId: String(vencedor.timeId),
                        fase: fase,
                        rodadaPontos: rodadaPontosNum,
                        valor: valorVitoria,
                        edicao: edicao.id,
                        temporada: CURRENT_SEASON,
                        chaveIdempotencia: `matamata-${edicao.id}-${fase}-${vencedor.timeId}-${CURRENT_SEASON}`,
                    });

                    // Registrar resultado financeiro do perdedor
                    resultadosFinanceiros.push({
                        timeId: String(perdedor.timeId),
                        fase: fase,
                        rodadaPontos: rodadaPontosNum,
                        valor: valorDerrota,
                        edicao: edicao.id,
                        temporada: CURRENT_SEASON,
                        chaveIdempotencia: `matamata-${edicao.id}-${fase}-${perdedor.timeId}-${CURRENT_SEASON}`,
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

    const config = await getMataMataConfig(ligaId);
    const todosResultados = [];

    // Filtrar edições que já começaram
    const edicoesProcessaveis = config.calendario.edicoes.filter(
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
            config,
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
    const config = await getMataMataConfig(ligaId);

    // Verificar se a rodada faz parte de alguma edição
    const edicao = config.calendario.edicoes.find(
        (e) => rodadaNumero >= e.rodadaInicial && rodadaNumero <= e.rodadaFinal,
    );

    if (!edicao) {
        // Não logar para cada rodada - só para rodadas de MM
        return null;
    }

    console.log(
        `[MATA-BACKEND] Calculando R${rodadaNumero} para time ${timeId} (${edicao.nome})`,
    );

    // Verificar se rodada já foi concluída
    if (rodadaNumero >= rodadaAtual) {
        console.log(
            `[MATA-BACKEND] R${rodadaNumero} ainda não concluída (atual: ${rodadaAtual})`,
        );
        return null;
    }

    // Calcular resultados da edição
    const resultados = await calcularResultadosEdicao(
        ligaId,
        edicao,
        rodadaAtual,
        config,
    );

    console.log(
        `[MATA-BACKEND] Resultados da edição: ${resultados.length} transações`,
    );

    // Encontrar resultado do time na rodada específica
    const resultado = resultados.find(
        (r) => r.timeId === String(timeId) && r.rodadaPontos === rodadaNumero,
    );

    if (!resultado) {
        console.log(
            `[MATA-BACKEND] Nenhum resultado para time ${timeId} na R${rodadaNumero}`,
        );
        return null;
    }

    const faseLabel =
        {
            primeira: "1ª Fase",
            oitavas: "Oitavas",
            quartas: "Quartas",
            semis: "Semis",
            final: "Final",
        }[resultado.fase] || resultado.fase;

    console.log(
        `[MATA-BACKEND] ✅ Time ${timeId}: ${resultado.valor > 0 ? "Vitória" : "Derrota"} (${faseLabel})`,
    );

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

console.log("[MATA-BACKEND] ✅ Módulo v1.1 carregado");
