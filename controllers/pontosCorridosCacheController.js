// controllers/pontosCorridosCacheController.js
// ✅ v2.1: Enriquecimento de dados ao ler cache (fix undefined)
// ✅ v2.0: Integração com filtro de participantes inativos
import PontosCorridosCache from "../models/PontosCorridosCache.js";
import Liga from "../models/Liga.js";
import Rodada from "../models/Rodada.js";
import axios from "axios";
import {
    buscarStatusParticipantes,
    obterUltimaRodadaValida,
} from "../utils/participanteHelper.js";

// Configuração do Pontos Corridos
const PONTOS_CORRIDOS_CONFIG = {
    rodadaInicial: 7,
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

// ✅ v2.1: Função para buscar dados enriquecidos dos times
async function buscarDadosTimesEnriquecidos(ligaId) {
    try {
        // Buscar dados da liga
        const liga = await Liga.findById(ligaId).lean();
        if (!liga) return {};

        const participantes = liga.participantes || [];
        const timesMap = {};

        // Mapear participantes
        participantes.forEach((p) => {
            const tid = String(p.time_id || p.timeId || p.id || p);
            if (tid && tid !== "undefined") {
                timesMap[tid] = {
                    nome: p.nome_time || p.nome || `Time ${tid}`,
                    nome_cartola: p.nome_cartola || "",
                    escudo: p.url_escudo_png || p.foto_time || p.escudo || "",
                };
            }
        });

        // Enriquecer com dados da collection Rodada (tem nome_cartola correto)
        try {
            const rodadas = await Rodada.find({ ligaId: ligaId })
                .sort({ rodada: -1 })
                .limit(100)
                .lean();

            rodadas.forEach((r) => {
                const tid = String(r.timeId);
                if (tid && timesMap[tid]) {
                    // Atualizar apenas se tiver dados melhores
                    if (r.nome_cartola && !timesMap[tid].nome_cartola) {
                        timesMap[tid].nome_cartola = r.nome_cartola;
                    }
                    if (
                        r.nome_time &&
                        (!timesMap[tid].nome ||
                            timesMap[tid].nome.startsWith("Time "))
                    ) {
                        timesMap[tid].nome = r.nome_time;
                    }
                } else if (tid) {
                    // Time não estava no mapa, adicionar
                    timesMap[tid] = {
                        nome: r.nome_time || `Time ${tid}`,
                        nome_cartola: r.nome_cartola || "",
                        escudo: r.foto_time || "",
                    };
                }
            });
        } catch (e) {
            console.warn(
                "[CACHE-PC] ⚠️ Erro ao enriquecer com rodadas:",
                e.message,
            );
        }

        return timesMap;
    } catch (error) {
        console.error("[CACHE-PC] ❌ Erro ao buscar dados dos times:", error);
        return {};
    }
}

// ✅ v2.1: Função para enriquecer classificação com dados corretos
function enriquecerClassificacao(classificacao, timesMap) {
    if (!Array.isArray(classificacao)) return [];

    return classificacao.map((t, idx) => {
        const tid = String(t.timeId || t.time_id || t.id);
        const dadosTime = timesMap[tid] || {};

        return {
            // IDs
            timeId: tid,
            time_id: tid,
            id: tid,
            posicao: t.posicao || idx + 1,

            // Nomes (com fallbacks robustos)
            nome: dadosTime.nome || t.nome || t.nome_time || `Time ${tid}`,
            nome_time: dadosTime.nome || t.nome || t.nome_time || `Time ${tid}`,
            nome_cartola:
                dadosTime.nome_cartola || t.nome_cartola || t.cartoleiro || "",

            // Visual
            escudo:
                dadosTime.escudo ||
                t.escudo ||
                t.url_escudo_png ||
                t.foto_time ||
                "",

            // Estatísticas (com fallbacks para 0)
            pontos: Number(t.pontos) || 0,
            jogos: Number(t.jogos) || 0,
            vitorias: Number(t.vitorias) || 0,
            empates: Number(t.empates) || 0,
            derrotas: Number(t.derrotas) || 0,
            pontosGoleada: Number(t.pontosGoleada) || 0,
            gols_pro: Number(t.gols_pro) || 0,
            gols_contra: Number(t.gols_contra) || 0,
            saldo_gols: Number(t.saldo_gols) || 0,
            financeiro: Number(t.financeiro) || 0,

            // Status
            ativo: t.ativo !== false,
            rodada_desistencia: t.rodada_desistencia || null,
        };
    });
}

// ✅ v2.1: Função para enriquecer confrontos
function enriquecerConfrontos(confrontos, timesMap) {
    if (!Array.isArray(confrontos)) return [];

    return confrontos.map((c) => {
        const tid1 = String(c.time1?.id || c.time1?.timeId || c.time1);
        const tid2 = String(c.time2?.id || c.time2?.timeId || c.time2);
        const dados1 = timesMap[tid1] || {};
        const dados2 = timesMap[tid2] || {};

        return {
            time1: {
                id: tid1,
                nome: dados1.nome || c.time1?.nome || `Time ${tid1}`,
                nome_cartola:
                    dados1.nome_cartola || c.time1?.nome_cartola || "",
                escudo: dados1.escudo || c.time1?.escudo || "",
                pontos: Number(c.time1?.pontos) || 0,
                ativo: c.time1?.ativo !== false,
            },
            time2: {
                id: tid2,
                nome: dados2.nome || c.time2?.nome || `Time ${tid2}`,
                nome_cartola:
                    dados2.nome_cartola || c.time2?.nome_cartola || "",
                escudo: dados2.escudo || c.time2?.escudo || "",
                pontos: Number(c.time2?.pontos) || 0,
                ativo: c.time2?.ativo !== false,
            },
            diferenca:
                c.diferenca ??
                (c.time1?.pontos != null && c.time2?.pontos != null
                    ? Math.abs(Number(c.time1.pontos) - Number(c.time2.pontos))
                    : null),
            valor: Number(c.valor) || 0,
            tipo: c.tipo || "pendente",
            pontos1: c.pontos1,
            pontos2: c.pontos2,
            financeiro1: c.financeiro1,
            financeiro2: c.financeiro2,
        };
    });
}

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

// ✅ v2.1: LER CACHE COM ENRIQUECIMENTO
export const lerCachePontosCorridos = async (req, res) => {
    try {
        const { ligaId } = req.params;
        const { rodada } = req.query;

        const query = { liga_id: ligaId };
        if (rodada) query.rodada_consolidada = Number(rodada);

        const cache = await PontosCorridosCache.findOne(query).sort({
            rodada_consolidada: -1,
        }).lean();

        if (!cache) {
            return res.status(404).json({ cached: false });
        }

        // ✅ v2.1: Buscar dados enriquecidos dos times
        const timesMap = await buscarDadosTimesEnriquecidos(ligaId);
        console.log(
            `[CACHE-PC] 📋 Dados de ${Object.keys(timesMap).length} times carregados para enriquecimento`,
        );

        // ✅ v2.1: Enriquecer classificação
        let classificacaoEnriquecida = enriquecerClassificacao(
            cache.classificacao || [],
            timesMap,
        );

        // Adicionar status de ativos/inativos
        if (classificacaoEnriquecida.length > 0) {
            const timeIds = classificacaoEnriquecida
                .map((t) => t.timeId)
                .filter(Boolean);

            if (timeIds.length > 0) {
                try {
                    const statusMap = await buscarStatusParticipantes(timeIds);

                    classificacaoEnriquecida = classificacaoEnriquecida.map(
                        (t) => {
                            const status = statusMap[t.timeId] || {
                                ativo: true,
                            };
                            return {
                                ...t,
                                ativo: status.ativo !== false,
                                rodada_desistencia:
                                    status.rodada_desistencia || null,
                            };
                        },
                    );
                } catch (statusError) {
                    console.warn(
                        "[CACHE-PC] ⚠️ Erro ao buscar status:",
                        statusError.message,
                    );
                }
            }
        }

        // ✅ v2.1: Enriquecer confrontos
        const confrontosEnriquecidos = enriquecerConfrontos(
            cache.confrontos || [],
            timesMap,
        );

        console.log(
            `[CACHE-PC] ✅ Cache R${cache.rodada_consolidada} enriquecido: ${classificacaoEnriquecida.length} times, ${confrontosEnriquecidos.length} confrontos`,
        );

        res.json({
            cached: true,
            rodada: cache.rodada_consolidada,
            confrontos: confrontosEnriquecidos,
            classificacao: classificacaoEnriquecida,
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
        const mercadoFechado = mercadoStatus.status_mercado === 2;
        const rodadaAtualLiga =
            rodadaAtualBrasileirao - PONTOS_CORRIDOS_CONFIG.rodadaInicial + 1;

        console.log(
            `[PONTOS-CORRIDOS] 📊 Mercado: ${mercadoFechado ? "FECHADO" : "ABERTO"}, Rodada BR: ${rodadaAtualBrasileirao}, Rodada Liga: ${rodadaAtualLiga}`,
        );

        // ✅ v2.1: Buscar dados dos times para enriquecimento
        const timesMap = await buscarDadosTimesEnriquecidos(ligaId);

        // 2. Buscar rodadas consolidadas do cache
        const query = { liga_id: ligaId };
        if (rodadaFiltro) {
            query.rodada_consolidada = Number(rodadaFiltro);
        }

        const caches = await PontosCorridosCache.find(query)
            .sort({ rodada_consolidada: 1 })
            .lean();

        // ✅ v2.1: Estrutura completa por rodada COM ENRIQUECIMENTO
        let dadosPorRodada = caches.map((cache) => ({
            rodada: cache.rodada_consolidada,
            confrontos: enriquecerConfrontos(cache.confrontos || [], timesMap),
            classificacao: enriquecerClassificacao(
                cache.classificacao || [],
                timesMap,
            ),
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
                        60000);

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

        const times = liga.participantes || [];
        if (times.length === 0) {
            console.error("[PONTOS-CORRIDOS] ❌ Nenhum time na liga");
            return null;
        }

        // ✅ v2.0: Buscar status de todos os times
        const statusMap = await buscarStatusParticipantes(times);
        console.log(
            `[PONTOS-CORRIDOS] 📋 Status de ${times.length} times carregado`,
        );

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
        let timesDataMap = {};

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
                const timeId =
                    typeof time === "object" ? time.time_id || time.id : time;

                // ✅ v2.0: Verificar se time está ativo
                const status = statusMap[String(timeId)] || { ativo: true };
                if (status.ativo === false) {
                    console.log(
                        `⏭️ [PONTOS-CORRIDOS] Pulando time inativo: ${timeId}`,
                    );
                    timesDataMap[String(timeId)] = {
                        nome: `Time ${timeId}`,
                        nome_cartola: "",
                        escudo: "",
                        ativo: false,
                        rodada_desistencia: status.rodada_desistencia,
                    };
                    parciaisMap[String(timeId)] = 0;
                    continue;
                }

                try {
                    const escRes = await axios.get(
                        `https://api.cartola.globo.com/time/id/${timeId}/${rodadaBrasileirao}`,
                        { timeout: 5000 },
                    );

                    const timeData = escRes.data;
                    const atletas = timeData.atletas || [];

                    // Guardar dados do time
                    timesDataMap[String(timeId)] = {
                        nome: timeData.time?.nome || `Time ${timeId}`,
                        nome_cartola: timeData.time?.nome_cartola || "",
                        escudo: timeData.time?.url_escudo_png || "",
                        ativo: true,
                        rodada_desistencia: null,
                    };

                    // Calcular pontuação baseada nos atletas pontuados
                    let pontuacao = 0;
                    for (const atleta of atletas) {
                        const pontuado = atletasPontuados[atleta.atleta_id];
                        if (pontuado) {
                            pontuacao += pontuado.pontuacao || 0;
                        }
                    }

                    parciaisMap[String(timeId)] = pontuacao;
                } catch (err) {
                    parciaisMap[String(timeId)] = 0;
                    timesDataMap[String(timeId)] = {
                        nome: `Time ${timeId}`,
                        nome_cartola: "",
                        escudo: "",
                        ativo: true,
                    };
                }
            }
        } catch (err) {
            console.warn("[PONTOS-CORRIDOS] ⚠️ Erro ao buscar parciais");
        }

        // 4. Montar confrontos com resultados
        const confrontos = [];
        for (const jogo of jogosDaRodada) {
            const tid1 = String(jogo.timeA);
            const tid2 = String(jogo.timeB);
            const p1 = parciaisMap[tid1] || 0;
            const p2 = parciaisMap[tid2] || 0;
            const resultado = calcularResultado(p1, p2);

            // ✅ v2.0: Incluir status nos confrontos
            const status1 = statusMap[tid1] || { ativo: true };
            const status2 = statusMap[tid2] || { ativo: true };

            confrontos.push({
                time1: {
                    id: tid1,
                    nome: timesDataMap[tid1]?.nome || `Time ${tid1}`,
                    nome_cartola: timesDataMap[tid1]?.nome_cartola || "",
                    escudo: timesDataMap[tid1]?.escudo || "",
                    pontos: Math.round(p1 * 100) / 100,
                    ativo: status1.ativo !== false,
                },
                time2: {
                    id: tid2,
                    nome: timesDataMap[tid2]?.nome || `Time ${tid2}`,
                    nome_cartola: timesDataMap[tid2]?.nome_cartola || "",
                    escudo: timesDataMap[tid2]?.escudo || "",
                    pontos: Math.round(p2 * 100) / 100,
                    ativo: status2.ativo !== false,
                },
                pontos1: resultado.pontosA,
                pontos2: resultado.pontosB,
                financeiro1: Math.round(resultado.financeiroA, 0),
                financeiro2: Math.round(resultado.financeiroB, 0),
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
            statusMap,
        );

        return {
            rodada: rodadaLiga,
            confrontos,
            classificacao,
            permanent: false,
            updatedAt: new Date(),
            aoVivo: true,
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

// ✅ v2.0: Calcular classificação acumulada COM STATUS
function calcularClassificacaoAcumulada(
    times,
    timesDataMap,
    dadosAnteriores,
    confrontosRodadaAtual,
    rodadaAtual,
    statusMap = {},
) {
    // Inicializar classificação
    const classificacao = {};
    times.forEach((time) => {
        const tid = String(
            typeof time === "object"
                ? time.time_id || time.timeId || time.id || time._id
                : time,
        );

        if (!tid || tid === "undefined") return;

        const dadosTime = timesDataMap[tid] || {};
        const status = statusMap[tid] || { ativo: true };

        classificacao[tid] = {
            timeId: tid,
            nome: dadosTime.nome || `Time ${tid}`,
            nome_cartola: dadosTime.nome_cartola || "",
            escudo: dadosTime.escudo || "",
            pontos: 0,
            jogos: 0,
            vitorias: 0,
            empates: 0,
            derrotas: 0,
            pontosGoleada: 0,
            gols_pro: 0,
            gols_contra: 0,
            saldo_gols: 0,
            financeiro: 0,
            ativo: status.ativo !== false,
            rodada_desistencia: status.rodada_desistencia || null,
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
                    pontos: Number(t.pontos) || 0,
                    jogos: Number(t.jogos) || 0,
                    vitorias: Number(t.vitorias) || 0,
                    empates: Number(t.empates) || 0,
                    derrotas: Number(t.derrotas) || 0,
                    pontosGoleada: Number(t.pontosGoleada) || 0,
                    gols_pro: Number(t.gols_pro) || 0,
                    gols_contra: Number(t.gols_contra) || 0,
                    saldo_gols: Number(t.saldo_gols) || 0,
                    financeiro: Number(t.financeiro) || 0,
                });
            }
        });
    }

    // Processar confrontos da rodada atual
    for (const confronto of confrontosRodadaAtual) {
        const tid1 = String(confronto.time1.id);
        const tid2 = String(confronto.time2.id);
        const p1 = Number(confronto.time1.pontos) || 0;
        const p2 = Number(confronto.time2.pontos) || 0;

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
            if (resultado.pontosA === 3) {
                classificacao[tid1].vitorias += 1;
                if (resultado.tipo === "goleada") {
                    classificacao[tid1].pontosGoleada += 1;
                }
            } else if (resultado.pontosA === 1) {
                classificacao[tid1].empates += 1;
            } else {
                classificacao[tid1].derrotas += 1;
            }
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
            if (resultado.pontosB === 3) {
                classificacao[tid2].vitorias += 1;
                if (resultado.tipo === "goleada") {
                    classificacao[tid2].pontosGoleada += 1;
                }
            } else if (resultado.pontosB === 1) {
                classificacao[tid2].empates += 1;
            } else {
                classificacao[tid2].derrotas += 1;
            }
        }
    }

    // ✅ v2.0: Ordenar com ativos primeiro, depois inativos
    const todos = Object.values(classificacao);
    const ativos = todos.filter((t) => t.ativo !== false);
    const inativos = todos.filter((t) => t.ativo === false);

    const sortFn = (a, b) => {
        if (b.pontos !== a.pontos) return b.pontos - a.pontos;
        if (b.saldo_gols !== a.saldo_gols) return b.saldo_gols - a.saldo_gols;
        return b.vitorias - a.vitorias;
    };

    ativos.sort(sortFn);
    inativos.sort(sortFn);

    // Ativos primeiro, depois inativos
    const resultado = [...ativos, ...inativos];

    return resultado.map((t, idx) => ({
        ...t,
        posicao: t.ativo !== false ? ativos.indexOf(t) + 1 : null,
    }));
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

        // ✅ v2.1: Buscar dados dos times para enriquecimento
        const timesMap = await buscarDadosTimesEnriquecidos(ligaId);

        // ✅ v2.1: Enriquecer classificação
        let classificacaoEnriquecida = enriquecerClassificacao(
            cache.classificacao || [],
            timesMap,
        );

        // Adicionar status
        if (classificacaoEnriquecida.length > 0) {
            const timeIds = classificacaoEnriquecida
                .map((t) => t.timeId)
                .filter(Boolean);

            if (timeIds.length > 0) {
                try {
                    const statusMap = await buscarStatusParticipantes(timeIds);

                    classificacaoEnriquecida = classificacaoEnriquecida.map(
                        (t) => {
                            const status = statusMap[t.timeId] || {
                                ativo: true,
                            };
                            return {
                                ...t,
                                ativo: status.ativo !== false,
                                rodada_desistencia:
                                    status.rodada_desistencia || null,
                            };
                        },
                    );
                } catch (e) {
                    // Ignorar erro de status
                }
            }
        }

        return {
            rodada: cache.rodada_consolidada,
            classificacao: classificacaoEnriquecida,
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

console.log(
    "[CACHE-PC] ✅ Controller v2.1 carregado (enriquecimento de dados)",
);
