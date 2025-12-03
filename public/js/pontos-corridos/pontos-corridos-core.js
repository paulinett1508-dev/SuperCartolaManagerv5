// PONTOS CORRIDOS CORE - v2.0 REFATORADO
// Salva cada rodada INDIVIDUALMENTE no MongoDB
// Responsável por: processamento de dados, chamadas de API e CACHE INTELIGENTE

import {
    RODADAS_ENDPOINTS,
    STATUS_MERCADO_DEFAULT,
} from "../rodadas/rodadas-config.js";

import { PONTOS_CORRIDOS_CONFIG, getLigaId } from "./pontos-corridos-config.js";

// ESTADO GLOBAL
let statusMercadoGlobal = STATUS_MERCADO_DEFAULT;
let getRankingRodadaEspecifica = null;

// ============================================================================
// 🧠 SISTEMA DE CACHE - OPERAÇÕES INDIVIDUAIS POR RODADA
// ============================================================================

async function lerCacheRodada(ligaId, rodadaLiga) {
    try {
        const response = await fetch(
            `/api/pontos-corridos/cache/${ligaId}?rodada=${rodadaLiga}&_=${Date.now()}`,
        );

        if (!response.ok) return null;

        const data = await response.json();
        if (data.cached && data.confrontos?.length > 0) {
            console.log(
                `[CORE] 💾 Cache R${rodadaLiga} encontrado (${data.confrontos.length} confrontos)`,
            );
            return {
                confrontos: data.confrontos,
                classificacao: data.classificacao || [],
                permanent: data.permanent,
            };
        }
        return null;
    } catch (error) {
        console.warn(
            `[CORE] ⚠️ Erro ao ler cache R${rodadaLiga}:`,
            error.message,
        );
        return null;
    }
}

async function salvarCacheRodada(
    ligaId,
    rodadaLiga,
    confrontos,
    classificacao,
    isPermanent = false,
) {
    try {
        const response = await fetch(`/api/pontos-corridos/cache/${ligaId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                rodada: rodadaLiga,
                confrontos: confrontos,
                classificacao: classificacao,
                permanent: isPermanent,
            }),
        });

        if (response.ok) {
            const tipo = isPermanent ? "PERMANENTE" : "temporário";
            console.log(
                `[CORE] 💾 Cache ${tipo} salvo: R${rodadaLiga} (${confrontos.length} confrontos)`,
            );
            return true;
        }
        return false;
    } catch (error) {
        console.error(`[CORE] ❌ Erro ao salvar cache R${rodadaLiga}:`, error);
        return false;
    }
}

async function buscarTodosOsCaches(ligaId) {
    try {
        const response = await fetch(`/api/pontos-corridos/${ligaId}`);
        if (!response.ok) return [];
        return await response.json();
    } catch (error) {
        console.warn("[CORE] ⚠️ Erro ao buscar caches:", error.message);
        return [];
    }
}

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

export function setRankingFunction(rankingFunction) {
    getRankingRodadaEspecifica = rankingFunction;
}

export async function atualizarStatusMercado() {
    try {
        const res = await fetch(RODADAS_ENDPOINTS.mercadoStatus);
        if (res.ok) {
            const data = await res.json();
            statusMercadoGlobal = {
                rodada_atual: data.rodada_atual,
                status_mercado: data.status_mercado,
            };
        }
    } catch (err) {
        console.error("[CORE] Erro ao buscar status do mercado:", err);
    }
}

export function getStatusMercado() {
    return statusMercadoGlobal;
}

export async function buscarTimesLiga(ligaId) {
    try {
        const response = await fetch(`/api/ligas/${ligaId}/times`);
        if (!response.ok) throw new Error("Falha ao carregar times");
        return await response.json();
    } catch (error) {
        console.error("[CORE] Erro ao buscar times:", error);
        return [];
    }
}

export function getRodadaPontosText(rodadaLiga) {
    if (!rodadaLiga) return "Rodada não definida";
    const rodadaBr = PONTOS_CORRIDOS_CONFIG.rodadaInicial + (rodadaLiga - 1);
    return `${rodadaLiga}ª Rodada da Liga (${rodadaBr}ª do Brasileirão)`;
}

export function gerarConfrontos(times) {
    const n = times.length;
    const rodadas = [];
    const lista = [...times];
    if (n % 2 !== 0) lista.push(null);

    const total = lista.length - 1;
    for (let rodada = 0; rodada < total; rodada++) {
        const jogos = [];
        for (let i = 0; i < lista.length / 2; i++) {
            const timeA = lista[i];
            const timeB = lista[lista.length - 1 - i];
            if (timeA && timeB) jogos.push({ timeA, timeB });
        }
        rodadas.push(jogos);
        lista.splice(1, 0, lista.pop());
    }
    return rodadas;
}

export function calcularFinanceiroConfronto(
    pontosA,
    pontosB,
    config = PONTOS_CORRIDOS_CONFIG,
) {
    const A = parseFloat(pontosA || 0);
    const B = parseFloat(pontosB || 0);
    const diferenca = Math.abs(A - B);

    const { empateTolerancia, goleadaMinima } = config.criterios;
    const fin = config.financeiro;

    if (diferenca <= empateTolerancia) {
        return {
            financeiroA: fin.empate,
            financeiroB: fin.empate,
            pontosA: 1,
            pontosB: 1,
            tipo: "empate",
        };
    }

    if (diferenca >= goleadaMinima) {
        return A > B
            ? {
                  financeiroA: fin.goleada,
                  financeiroB: -fin.goleada,
                  pontosA: 3,
                  pontosB: 0,
                  tipo: "goleada",
              }
            : {
                  financeiroA: -fin.goleada,
                  financeiroB: fin.goleada,
                  pontosA: 0,
                  pontosB: 3,
                  tipo: "goleada",
              };
    }

    return A > B
        ? {
              financeiroA: fin.vitoria,
              financeiroB: -fin.vitoria,
              pontosA: 3,
              pontosB: 0,
              tipo: "vitoria",
          }
        : {
              financeiroA: -fin.vitoria,
              financeiroB: fin.vitoria,
              pontosA: 0,
              pontosB: 3,
              tipo: "vitoria",
          };
}

// ============================================================================
// ⚡ FUNÇÃO PRINCIPAL - PROCESSA CONFRONTOS E SALVA CADA RODADA
// ============================================================================

export async function getConfrontosLigaPontosCorridos(ligaId, rodadaAtualLiga) {
    console.log(
        `[CORE] 🚀 Processando Pontos Corridos até R${rodadaAtualLiga}...`,
    );

    try {
        // 1. Buscar todos os caches existentes
        const cachesExistentes = await buscarTodosOsCaches(ligaId);
        const rodadasComCache = new Set(cachesExistentes.map((c) => c.rodada));

        console.log(`[CORE] 📦 ${rodadasComCache.size} rodadas já em cache`);

        // 2. Identificar rodadas que faltam
        const rodadasFaltando = [];
        for (let r = 1; r <= rodadaAtualLiga; r++) {
            if (!rodadasComCache.has(r)) {
                rodadasFaltando.push(r);
            }
        }

        // Se não falta nada, retorna do cache
        if (rodadasFaltando.length === 0) {
            console.log(
                `[CORE] ✅ Todas as ${rodadaAtualLiga} rodadas em cache`,
            );
            return {
                confrontos: cachesExistentes.filter(
                    (c) => c.rodada <= rodadaAtualLiga,
                ),
                classificacao:
                    cachesExistentes.find((c) => c.rodada === rodadaAtualLiga)
                        ?.classificacao || [],
            };
        }

        console.log(
            `[CORE] ⚙️ Calculando ${rodadasFaltando.length} rodadas: [${rodadasFaltando.join(", ")}]`,
        );

        // 3. Buscar times e gerar confrontos base
        const times = await buscarTimesLiga(ligaId);
        if (!times.length) {
            console.error("[CORE] ❌ Nenhum time encontrado");
            return { confrontos: [], classificacao: [] };
        }

        const confrontosBase = gerarConfrontos(times);

        // 4. Carregar função de ranking se necessário
        if (!getRankingRodadaEspecifica) {
            try {
                const rodadasModule = await import("../rodadas.js");
                getRankingRodadaEspecifica =
                    rodadasModule.getRankingRodadaEspecifica;
            } catch (e) {
                console.error("[CORE] ❌ Função de ranking indisponível");
                return { confrontos: [], classificacao: [] };
            }
        }

        // 5. Inicializar classificação acumulada
        const classificacaoAcumulada = {};
        times.forEach((time) => {
            const tid = String(time.id || time.time_id);
            classificacaoAcumulada[tid] = {
                timeId: tid,
                nome: time.nome_time || time.nome || "N/D",
                escudo: time.url_escudo_png || time.foto_time || "",
                pontos: 0,
                jogos: 0,
                vitorias: 0,
                empates: 0,
                derrotas: 0,
                gols_pro: 0,
                gols_contra: 0,
                saldo_gols: 0,
                financeiro: 0,
            };
        });

        // 6. Carregar classificação anterior se houver
        const ultimoCache = cachesExistentes
            .filter((c) => c.rodada < rodadasFaltando[0])
            .sort((a, b) => b.rodada - a.rodada)[0];

        if (ultimoCache?.classificacao) {
            ultimoCache.classificacao.forEach((t) => {
                const tid = String(t.timeId || t.time_id);
                if (classificacaoAcumulada[tid]) {
                    Object.assign(classificacaoAcumulada[tid], {
                        pontos: t.pontos || 0,
                        jogos: t.jogos || 0,
                        vitorias: t.vitorias || 0,
                        empates: t.empates || 0,
                        derrotas: t.derrotas || 0,
                        gols_pro: t.gols_pro || 0,
                        gols_contra: t.gols_contra || 0,
                        saldo_gols: t.saldo_gols || 0,
                        financeiro: t.financeiro || 0,
                    });
                }
            });
            console.log(
                `[CORE] 📊 Classificação carregada de R${ultimoCache.rodada}`,
            );
        }

        // 7. Processar cada rodada faltante
        const statusMercado = getStatusMercado();
        const todosConfrontos = [
            ...cachesExistentes.filter((c) => c.rodada < rodadasFaltando[0]),
        ];

        for (const rodadaLiga of rodadasFaltando) {
            const jogosDaRodada = confrontosBase[rodadaLiga - 1];
            if (!jogosDaRodada) continue;

            // Buscar pontuações da rodada
            const rodadaBr =
                PONTOS_CORRIDOS_CONFIG.rodadaInicial + (rodadaLiga - 1);
            let pontuacoes = {};

            try {
                const ranking = await getRankingRodadaEspecifica(
                    ligaId,
                    rodadaBr,
                );
                if (Array.isArray(ranking)) {
                    ranking.forEach((p) => {
                        const tid = String(p.time_id || p.timeId || p.id);
                        pontuacoes[tid] = p.pontos;
                    });
                }
            } catch (err) {
                console.warn(
                    `[CORE] ⚠️ Erro ao buscar R${rodadaBr}:`,
                    err.message,
                );
            }

            // Se não tem pontuações, pular rodada
            if (Object.keys(pontuacoes).length === 0) {
                console.log(
                    `[CORE] ⏭️ R${rodadaLiga} sem pontuações, pulando...`,
                );
                continue;
            }

            // Processar confrontos da rodada
            const confrontosRodada = [];

            for (const jogo of jogosDaRodada) {
                const tidA = String(jogo.timeA.id || jogo.timeA.time_id);
                const tidB = String(jogo.timeB.id || jogo.timeB.time_id);

                const pontosA = pontuacoes[tidA] ?? null;
                const pontosB = pontuacoes[tidB] ?? null;

                const resultado = calcularFinanceiroConfronto(pontosA, pontosB);

                // Atualizar classificação acumulada
                if (pontosA !== null && pontosB !== null) {
                    // Time A
                    if (classificacaoAcumulada[tidA]) {
                        classificacaoAcumulada[tidA].jogos += 1;
                        classificacaoAcumulada[tidA].pontos +=
                            resultado.pontosA;
                        classificacaoAcumulada[tidA].gols_pro += pontosA;
                        classificacaoAcumulada[tidA].gols_contra += pontosB;
                        classificacaoAcumulada[tidA].saldo_gols =
                            classificacaoAcumulada[tidA].gols_pro -
                            classificacaoAcumulada[tidA].gols_contra;
                        classificacaoAcumulada[tidA].financeiro +=
                            resultado.financeiroA;
                        if (resultado.pontosA === 3)
                            classificacaoAcumulada[tidA].vitorias += 1;
                        else if (resultado.pontosA === 1)
                            classificacaoAcumulada[tidA].empates += 1;
                        else classificacaoAcumulada[tidA].derrotas += 1;
                    }

                    // Time B
                    if (classificacaoAcumulada[tidB]) {
                        classificacaoAcumulada[tidB].jogos += 1;
                        classificacaoAcumulada[tidB].pontos +=
                            resultado.pontosB;
                        classificacaoAcumulada[tidB].gols_pro += pontosB;
                        classificacaoAcumulada[tidB].gols_contra += pontosA;
                        classificacaoAcumulada[tidB].saldo_gols =
                            classificacaoAcumulada[tidB].gols_pro -
                            classificacaoAcumulada[tidB].gols_contra;
                        classificacaoAcumulada[tidB].financeiro +=
                            resultado.financeiroB;
                        if (resultado.pontosB === 3)
                            classificacaoAcumulada[tidB].vitorias += 1;
                        else if (resultado.pontosB === 1)
                            classificacaoAcumulada[tidB].empates += 1;
                        else classificacaoAcumulada[tidB].derrotas += 1;
                    }
                }

                confrontosRodada.push({
                    time1: {
                        id: tidA,
                        nome: jogo.timeA.nome_time || jogo.timeA.nome || "N/D",
                        escudo:
                            jogo.timeA.url_escudo_png ||
                            jogo.timeA.foto_time ||
                            "",
                        pontos: pontosA,
                    },
                    time2: {
                        id: tidB,
                        nome: jogo.timeB.nome_time || jogo.timeB.nome || "N/D",
                        escudo:
                            jogo.timeB.url_escudo_png ||
                            jogo.timeB.foto_time ||
                            "",
                        pontos: pontosB,
                    },
                    diferenca:
                        pontosA !== null && pontosB !== null
                            ? Math.abs(pontosA - pontosB)
                            : null,
                    valor: Math.max(
                        resultado.financeiroA,
                        resultado.financeiroB,
                        0,
                    ),
                    tipo: resultado.tipo,
                });
            }

            // Ordenar classificação
            const classificacaoOrdenada = Object.values(classificacaoAcumulada)
                .sort((a, b) => {
                    if (b.pontos !== a.pontos) return b.pontos - a.pontos;
                    if (b.saldo_gols !== a.saldo_gols)
                        return b.saldo_gols - a.saldo_gols;
                    return b.vitorias - a.vitorias;
                })
                .map((t, idx) => ({ ...t, posicao: idx + 1 }));

            // Salvar cache da rodada
            const isPermanent = statusMercado.rodada_atual > rodadaBr;
            await salvarCacheRodada(
                ligaId,
                rodadaLiga,
                confrontosRodada,
                classificacaoOrdenada,
                isPermanent,
            );

            // Adicionar aos resultados
            todosConfrontos.push({
                rodada: rodadaLiga,
                confrontos: confrontosRodada,
                classificacao: classificacaoOrdenada,
            });
        }

        // Ordenar por rodada
        todosConfrontos.sort((a, b) => a.rodada - b.rodada);

        const classificacaoFinal =
            todosConfrontos.find((c) => c.rodada === rodadaAtualLiga)
                ?.classificacao || [];

        console.log(
            `[CORE] ✅ Processamento concluído: ${todosConfrontos.length} rodadas`,
        );

        return {
            confrontos: todosConfrontos,
            classificacao: classificacaoFinal,
        };
    } catch (error) {
        console.error("[CORE] ❌ Erro fatal:", error);
        return { confrontos: [], classificacao: [] };
    }
}

// ============================================================================
// CALCULAR CLASSIFICAÇÃO (Para compatibilidade)
// ============================================================================

export async function calcularClassificacao(
    ligaId,
    times,
    confrontos,
    rodadaAtualBrasileirao,
) {
    const rodadaLiga =
        rodadaAtualBrasileirao - PONTOS_CORRIDOS_CONFIG.rodadaInicial + 1;

    if (rodadaLiga < 1) {
        console.log(
            "[CORE] ⚠️ Rodada do Brasileirão anterior ao início do Pontos Corridos",
        );
        return {
            classificacao: [],
            confrontos: [],
            houveErro: false,
            fromCache: false,
        };
    }

    // Verificar cache primeiro
    const cache = await lerCacheRodada(ligaId, rodadaLiga);
    if (cache?.classificacao?.length > 0) {
        return {
            classificacao: cache.classificacao,
            confrontos: cache.confrontos,
            ultimaRodadaComDados: rodadaAtualBrasileirao,
            houveErro: false,
            fromCache: true,
        };
    }

    // Calcular usando função principal
    const resultado = await getConfrontosLigaPontosCorridos(ligaId, rodadaLiga);

    return {
        classificacao: resultado.classificacao,
        confrontos: resultado.confrontos,
        ultimaRodadaComDados: rodadaAtualBrasileirao,
        houveErro: false,
        fromCache: false,
    };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const buscarStatusMercado = atualizarStatusMercado;
export { getLigaId };

// Exports adicionais para compatibilidade
export function normalizarDadosParaExportacao(jogo, pontuacoesMap = {}) {
    const tidA = jogo.timeA?.id || jogo.timeA?.time_id;
    const tidB = jogo.timeB?.id || jogo.timeB?.time_id;

    return {
        time1: {
            id: tidA,
            nome_time: jogo.timeA?.nome_time || jogo.timeA?.nome || "N/D",
            nome_cartola: jogo.timeA?.nome_cartola || "N/D",
            foto_perfil: jogo.timeA?.foto_perfil || "",
            foto_time: jogo.timeA?.foto_time || "",
        },
        time2: {
            id: tidB,
            nome_time: jogo.timeB?.nome_time || jogo.timeB?.nome || "N/D",
            nome_cartola: jogo.timeB?.nome_cartola || "N/D",
            foto_perfil: jogo.timeB?.foto_perfil || "",
            foto_time: jogo.timeB?.foto_time || "",
        },
        pontos1: pontuacoesMap[tidA] || null,
        pontos2: pontuacoesMap[tidB] || null,
    };
}

export function normalizarClassificacaoParaExportacao(classificacao) {
    if (!Array.isArray(classificacao)) return [];
    return classificacao.map((t) => ({
        time_id: t.timeId || t.time_id,
        nome_time: t.nome || t.nome_time || "N/D",
        escudo: t.escudo || "",
        pontos: t.pontos || 0,
        vitorias: t.vitorias || 0,
        empates: t.empates || 0,
        derrotas: t.derrotas || 0,
        gols_pro: t.gols_pro || 0,
        gols_contra: t.gols_contra || 0,
        saldo_gols: t.saldo_gols || 0,
        financeiro: t.financeiro || 0,
    }));
}

export async function processarDadosRodada(ligaId, rodadaCartola, jogos) {
    const pontuacoesMap = {};
    try {
        if (getRankingRodadaEspecifica) {
            const ranking = await getRankingRodadaEspecifica(
                ligaId,
                rodadaCartola,
            );
            if (Array.isArray(ranking)) {
                ranking.forEach((p) => {
                    const tid = p.time_id || p.timeId || p.id;
                    pontuacoesMap[tid] = p.pontos || 0;
                });
            }
        }
    } catch (error) {
        console.warn(
            `[CORE] Erro ao buscar pontuações R${rodadaCartola}:`,
            error,
        );
    }
    return { pontuacoesMap };
}

export function validarDadosEntrada(times, confrontos) {
    if (!Array.isArray(times) || times.length === 0)
        throw new Error("Times inválidos ou vazios");
    if (!Array.isArray(confrontos) || confrontos.length === 0)
        throw new Error("Confrontos inválidos ou vazios");
    return true;
}

console.log(
    "[PONTOS-CORRIDOS-CORE] ✅ v2.0 carregado (cache individual por rodada)",
);
