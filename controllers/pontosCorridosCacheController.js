// controllers/pontosCorridosCacheController.js
import PontosCorridosCache from "../models/PontosCorridosCache.js";
import Liga from "../models/Liga.js";
import axios from "axios";

// Configuração do Pontos Corridos
const PONTOS_CORRIDOS_CONFIG = {
    rodadaInicial: 7, // Rodada do Brasileirão que inicia o Pontos Corridos
    criterios: {
        empateTolerancia: 0.3,
        goleadaMinima: 50.0,
    },
    financeiro: {
        vitoria: 5.0,
        empate: 3.0,
        goleada: 7.0,
    },
};

// ✅ SALVAR CACHE (CONFRONTOS + CLASSIFICAÇÃO)
export const salvarCachePontosCorridos = async (req, res) => {
    try {
        const { ligaId } = req.params;
        const { rodada, classificacao, confrontos, permanent } = req.body;

        if (!rodada) {
            return res.status(400).json({ error: "Rodada é obrigatória" });
        }

        if (!classificacao && !confrontos) {
            return res.status(400).json({
                error: "Dados incompletos (classificação ou confrontos)",
            });
        }

        const updateData = {
            cache_permanente: permanent || false,
            ultima_atualizacao: new Date(),
        };

        if (classificacao) updateData.classificacao = classificacao;
        if (confrontos) updateData.confrontos = confrontos;

        const result = await PontosCorridosCache.findOneAndUpdate(
            { liga_id: ligaId, rodada_consolidada: rodada },
            updateData,
            { new: true, upsert: true },
        );

        const tipoCache = permanent ? "PERMANENTE" : "temporário";
        console.log(
            `[CACHE-PC] ✅ Cache ${tipoCache} salvo: Liga ${ligaId}, Rodada ${rodada}`,
        );

        res.json({
            success: true,
            permanent,
            id: result._id,
            confrontos: confrontos?.length || 0,
            classificacao: classificacao?.length || 0,
        });
    } catch (error) {
        console.error("[CACHE-PC] ❌ Erro ao salvar:", error);
        res.status(500).json({ error: "Erro interno" });
    }
};

// ✅ LER CACHE (CONFRONTOS + CLASSIFICAÇÃO)
export const lerCachePontosCorridos = async (req, res) => {
    try {
        const { ligaId } = req.params;
        const { rodada } = req.query;

        const query = { liga_id: ligaId };
        if (rodada) query.rodada_consolidada = Number(rodada);

        const cache = await PontosCorridosCache.findOne(query).sort({
            rodada_consolidada: -1,
        });

        if (!cache) {
            return res.status(404).json({ cached: false });
        }

        res.json({
            cached: true,
            rodada: cache.rodada_consolidada,
            confrontos: cache.confrontos || [],
            classificacao: cache.classificacao || [],
            permanent: cache.cache_permanente,
            updatedAt: cache.ultima_atualizacao,
        });
    } catch (error) {
        console.error("[CACHE-PC] ❌ Erro ao ler:", error);
        res.status(500).json({ error: "Erro interno" });
    }
};

// ✅ OBTER TODAS AS RODADAS PARA O PARTICIPANTE (COM PARCIAIS AO VIVO)
export const obterConfrontosPontosCorridos = async (
    ligaId,
    rodadaFiltro = null,
) => {
    try {
        // 1. Buscar status do mercado
        let mercadoStatus = { rodada_atual: 37, status_mercado: 1 };
        try {
            const mercadoRes = await axios.get(
                "https://api.cartola.globo.com/mercado/status",
                {
                    timeout: 5000,
                },
            );
            mercadoStatus = mercadoRes.data;
        } catch (err) {
            console.warn(
                "[PONTOS-CORRIDOS] ⚠️ Erro ao buscar mercado, usando padrão",
            );
        }

        const rodadaAtualBrasileirao = mercadoStatus.rodada_atual;
        const mercadoFechado = mercadoStatus.status_mercado === 2; // 2 = fechado
        const rodadaAtualLiga =
            rodadaAtualBrasileirao - PONTOS_CORRIDOS_CONFIG.rodadaInicial + 1;

        console.log(
            `[PONTOS-CORRIDOS] 📊 Mercado: ${mercadoFechado ? "FECHADO" : "ABERTO"}, Rodada BR: ${rodadaAtualBrasileirao}, Rodada Liga: ${rodadaAtualLiga}`,
        );

        // 2. Buscar rodadas consolidadas do cache
        const query = { liga_id: ligaId };
        if (rodadaFiltro) {
            query.rodada_consolidada = Number(rodadaFiltro);
        }

        const caches = await PontosCorridosCache.find(query)
            .sort({ rodada_consolidada: 1 })
            .lean();

        // Estrutura completa por rodada
        let dadosPorRodada = caches.map((cache) => ({
            rodada: cache.rodada_consolidada,
            confrontos: cache.confrontos || [],
            classificacao: cache.classificacao || [],
            permanent: cache.cache_permanente,
            updatedAt: cache.ultima_atualizacao,
        }));

        // 3. Se mercado fechado E rodada atual não está no cache (ou precisa atualização), calcular parciais ao vivo
        if (mercadoFechado && rodadaAtualLiga > 0) {
            const rodadaAtualNoCache = dadosPorRodada.find(
                (r) => r.rodada === rodadaAtualLiga,
            );
            const cacheDesatualizado =
                !rodadaAtualNoCache ||
                (rodadaAtualNoCache &&
                    !rodadaAtualNoCache.permanent &&
                    Date.now() -
                        new Date(rodadaAtualNoCache.updatedAt).getTime() >
                        60000); // Cache > 1 min

            if (!rodadaAtualNoCache || cacheDesatualizado) {
                console.log(
                    `[PONTOS-CORRIDOS] 🔥 Calculando rodada ${rodadaAtualLiga} com PARCIAIS AO VIVO...`,
                );

                const rodadaAoVivo = await calcularRodadaComParciais(
                    ligaId,
                    rodadaAtualLiga,
                    rodadaAtualBrasileirao,
                    dadosPorRodada,
                );

                if (rodadaAoVivo) {
                    // Substituir ou adicionar rodada ao vivo
                    const idx = dadosPorRodada.findIndex(
                        (r) => r.rodada === rodadaAtualLiga,
                    );
                    if (idx >= 0) {
                        dadosPorRodada[idx] = rodadaAoVivo;
                    } else {
                        dadosPorRodada.push(rodadaAoVivo);
                        dadosPorRodada.sort((a, b) => a.rodada - b.rodada);
                    }
                }
            }
        }

        console.log(
            `[PONTOS-CORRIDOS] ✅ ${dadosPorRodada.length} rodadas carregadas: Liga ${ligaId}`,
        );
        return dadosPorRodada;
    } catch (error) {
        console.error("[PONTOS-CORRIDOS] ❌ Erro ao obter dados:", error);
        return [];
    }
};

// 🔥 CALCULAR RODADA COM PARCIAIS AO VIVO
async function calcularRodadaComParciais(
    ligaId,
    rodadaLiga,
    rodadaBrasileirao,
    dadosAnteriores,
) {
    try {
        // 1. Buscar liga e times
        const liga = await Liga.findById(ligaId).lean();
        if (!liga) {
            console.error("[PONTOS-CORRIDOS] ❌ Liga não encontrada");
            return null;
        }

        const times = liga.times || [];
        if (times.length === 0) {
            console.error("[PONTOS-CORRIDOS] ❌ Nenhum time na liga");
            return null;
        }

        // 2. Gerar confrontos da rodada
        const confrontosBase = gerarConfrontos(times);
        const jogosDaRodada = confrontosBase[rodadaLiga - 1];
        if (!jogosDaRodada) {
            console.warn(
                `[PONTOS-CORRIDOS] ⚠️ Rodada ${rodadaLiga} não existe nos confrontos`,
            );
            return null;
        }

        // 3. Buscar parciais ao vivo
        let parciaisMap = {};
        let timesDataMap = {}; // Mapa para guardar nome/escudo dos times

        try {
            const parciaisRes = await axios.get(
                "https://api.cartola.globo.com/atletas/pontuados",
                {
                    timeout: 5000,
                },
            );
            const atletasPontuados = parciaisRes.data?.atletas || {};

            // Para cada time, buscar escalação e calcular pontuação
            for (const time of times) {
                // O array times contém apenas os IDs (números)
                const timeId =
                    typeof time === "object"
                        ? time.time_id || time.timeId || time.id || time._id
                        : time;

                if (!timeId) {
                    console.warn(
                        `[PONTOS-CORRIDOS] ⚠️ Time sem ID:`,
                        JSON.stringify(time).substring(0, 100),
                    );
                    continue;
                }

                try {
                    const escalacaoRes = await axios.get(
                        `https://api.cartola.globo.com/time/id/${timeId}/${rodadaBrasileirao}`,
                        { timeout: 5000 },
                    );
                    const escalacao = escalacaoRes.data;

                    // Guardar dados do time para uso posterior
                    timesDataMap[String(timeId)] = {
                        nome:
                            escalacao.time?.nome ||
                            escalacao.nome ||
                            `Time ${timeId}`,
                        escudo:
                            escalacao.time?.url_escudo_png ||
                            escalacao.time?.foto_time ||
                            "",
                    };

                    let pontos = 0;
                    const posicoesQuePontuaram = new Set();

                    // Titulares
                    if (escalacao.atletas) {
                        escalacao.atletas.forEach((atleta) => {
                            const pontuacao =
                                atletasPontuados[atleta.atleta_id]?.pontuacao ||
                                0;
                            const entrouEmCampo =
                                atletasPontuados[atleta.atleta_id]
                                    ?.entrou_em_campo;

                            if (entrouEmCampo || pontuacao !== 0) {
                                posicoesQuePontuaram.add(atleta.posicao_id);
                            }

                            pontos +=
                                atleta.atleta_id === escalacao.capitao_id
                                    ? pontuacao * 2
                                    : pontuacao;
                        });
                    }

                    // Reservas
                    if (escalacao.reservas) {
                        escalacao.reservas.forEach((atleta) => {
                            const pontuacao =
                                atletasPontuados[atleta.atleta_id]?.pontuacao ||
                                0;
                            const entrouEmCampo =
                                atletasPontuados[atleta.atleta_id]
                                    ?.entrou_em_campo;

                            if (
                                atleta.atleta_id ===
                                    escalacao.reserva_luxo_id &&
                                entrouEmCampo
                            ) {
                                pontos += pontuacao * 1.5;
                            } else if (
                                !posicoesQuePontuaram.has(atleta.posicao_id) &&
                                entrouEmCampo
                            ) {
                                pontos += pontuacao;
                                posicoesQuePontuaram.add(atleta.posicao_id);
                            }
                        });
                    }

                    parciaisMap[String(timeId)] = pontos;
                } catch (err) {
                    console.warn(
                        `[PONTOS-CORRIDOS] ⚠️ Erro escalação time ${timeId}: ${err.message}`,
                    );
                    parciaisMap[String(timeId)] = 0;
                    timesDataMap[String(timeId)] = {
                        nome: `Time ${timeId}`,
                        escudo: "",
                    };
                }
            }

            console.log(
                `[PONTOS-CORRIDOS] 🔥 Parciais carregadas para ${Object.keys(parciaisMap).length} times`,
            );
        } catch (err) {
            console.error(
                "[PONTOS-CORRIDOS] ❌ Erro ao buscar parciais:",
                err.message,
            );
            return null;
        }

        // 4. Calcular confrontos da rodada
        const confrontos = [];
        for (const jogo of jogosDaRodada) {
            // timeA e timeB podem ser objetos ou IDs simples
            const timeAId = String(
                typeof jogo.timeA === "object"
                    ? jogo.timeA.time_id ||
                          jogo.timeA.timeId ||
                          jogo.timeA.id ||
                          jogo.timeA._id
                    : jogo.timeA,
            );
            const timeBId = String(
                typeof jogo.timeB === "object"
                    ? jogo.timeB.time_id ||
                          jogo.timeB.timeId ||
                          jogo.timeB.id ||
                          jogo.timeB._id
                    : jogo.timeB,
            );

            const pontosA = parciaisMap[timeAId] ?? 0;
            const pontosB = parciaisMap[timeBId] ?? 0;

            const resultado = calcularResultado(pontosA, pontosB);

            // Buscar nomes/escudos do mapa de dados (preenchido durante busca de escalações)
            const dadosTimeA = timesDataMap[timeAId] || {};
            const dadosTimeB = timesDataMap[timeBId] || {};

            confrontos.push({
                time1: {
                    id: timeAId,
                    nome: dadosTimeA.nome || `Time ${timeAId}`,
                    escudo: dadosTimeA.escudo || "",
                    pontos: pontosA,
                },
                time2: {
                    id: timeBId,
                    nome: dadosTimeB.nome || `Time ${timeBId}`,
                    escudo: dadosTimeB.escudo || "",
                    pontos: pontosB,
                },
                diferenca: Math.abs(pontosA - pontosB),
                valor: Math.max(
                    resultado.financeiroA,
                    resultado.financeiroB,
                    0,
                ),
                tipo: resultado.tipo,
            });
        }

        // 5. Calcular classificação acumulada
        const classificacao = calcularClassificacaoAcumulada(
            times,
            timesDataMap,
            dadosAnteriores,
            confrontos,
            rodadaLiga,
        );

        return {
            rodada: rodadaLiga,
            confrontos,
            classificacao,
            permanent: false,
            updatedAt: new Date(),
            aoVivo: true, // Flag indicando que são dados ao vivo
        };
    } catch (error) {
        console.error(
            "[PONTOS-CORRIDOS] ❌ Erro ao calcular rodada ao vivo:",
            error,
        );
        return null;
    }
}

// Gerar confrontos round-robin
function gerarConfrontos(times) {
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

// Calcular resultado do confronto
function calcularResultado(pontosA, pontosB) {
    const diferenca = Math.abs(pontosA - pontosB);
    const { empateTolerancia, goleadaMinima } =
        PONTOS_CORRIDOS_CONFIG.criterios;
    const fin = PONTOS_CORRIDOS_CONFIG.financeiro;

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
        return pontosA > pontosB
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

    return pontosA > pontosB
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

// Calcular classificação acumulada
function calcularClassificacaoAcumulada(
    times,
    timesDataMap,
    dadosAnteriores,
    confrontosRodadaAtual,
    rodadaAtual,
) {
    // Inicializar classificação
    const classificacao = {};
    times.forEach((time) => {
        // times pode ser array de IDs simples ou objetos
        const tid = String(
            typeof time === "object"
                ? time.time_id || time.timeId || time.id || time._id
                : time,
        );

        if (!tid || tid === "undefined") return;

        const dadosTime = timesDataMap[tid] || {};

        classificacao[tid] = {
            timeId: tid,
            nome: dadosTime.nome || `Time ${tid}`,
            escudo: dadosTime.escudo || "",
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

    // Carregar classificação da rodada anterior
    const rodadaAnterior = dadosAnteriores.find(
        (r) => r.rodada === rodadaAtual - 1,
    );
    if (rodadaAnterior?.classificacao) {
        rodadaAnterior.classificacao.forEach((t) => {
            const tid = String(t.timeId || t.time_id || t.id);
            if (tid && classificacao[tid]) {
                Object.assign(classificacao[tid], {
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
    }

    // Processar confrontos da rodada atual
    for (const confronto of confrontosRodadaAtual) {
        const tid1 = String(confronto.time1.id);
        const tid2 = String(confronto.time2.id);
        const p1 = confronto.time1.pontos;
        const p2 = confronto.time2.pontos;

        const resultado = calcularResultado(p1, p2);

        // Time 1
        if (classificacao[tid1]) {
            classificacao[tid1].jogos += 1;
            classificacao[tid1].pontos += resultado.pontosA;
            classificacao[tid1].gols_pro += p1;
            classificacao[tid1].gols_contra += p2;
            classificacao[tid1].saldo_gols =
                classificacao[tid1].gols_pro - classificacao[tid1].gols_contra;
            classificacao[tid1].financeiro += resultado.financeiroA;
            if (resultado.pontosA === 3) classificacao[tid1].vitorias += 1;
            else if (resultado.pontosA === 1) classificacao[tid1].empates += 1;
            else classificacao[tid1].derrotas += 1;
        }

        // Time 2
        if (classificacao[tid2]) {
            classificacao[tid2].jogos += 1;
            classificacao[tid2].pontos += resultado.pontosB;
            classificacao[tid2].gols_pro += p2;
            classificacao[tid2].gols_contra += p1;
            classificacao[tid2].saldo_gols =
                classificacao[tid2].gols_pro - classificacao[tid2].gols_contra;
            classificacao[tid2].financeiro += resultado.financeiroB;
            if (resultado.pontosB === 3) classificacao[tid2].vitorias += 1;
            else if (resultado.pontosB === 1) classificacao[tid2].empates += 1;
            else classificacao[tid2].derrotas += 1;
        }
    }

    // Ordenar e retornar
    return Object.values(classificacao)
        .sort((a, b) => {
            if (b.pontos !== a.pontos) return b.pontos - a.pontos;
            if (b.saldo_gols !== a.saldo_gols)
                return b.saldo_gols - a.saldo_gols;
            return b.vitorias - a.vitorias;
        })
        .map((t, idx) => ({ ...t, posicao: idx + 1 }));
}

// ✅ OBTER CLASSIFICAÇÃO GERAL (última rodada disponível)
export const obterClassificacaoGeral = async (ligaId) => {
    try {
        const cache = await PontosCorridosCache.findOne({ liga_id: ligaId })
            .sort({ rodada_consolidada: -1 })
            .lean();

        if (!cache) {
            console.log(
                `[PONTOS-CORRIDOS] ⚠️ Nenhuma classificação encontrada: Liga ${ligaId}`,
            );
            return null;
        }

        return {
            rodada: cache.rodada_consolidada,
            classificacao: cache.classificacao || [],
            permanent: cache.cache_permanente,
            updatedAt: cache.ultima_atualizacao,
        };
    } catch (error) {
        console.error(
            "[PONTOS-CORRIDOS] ❌ Erro ao obter classificação:",
            error,
        );
        return null;
    }
};
