// =====================================================================
// disputasService.js v1.0 - Cálculos de Disputas Internas
// Funções para calcular dados de cada módulo competitivo da liga
// =====================================================================

import mongoose from "mongoose";
import PontosCorridosCache from "../models/PontosCorridosCache.js";
import MataMataCache from "../models/MataMataCache.js";
import ArtilheiroCampeao from "../models/ArtilheiroCampeao.js";
import Goleiros from "../models/Goleiros.js";
import CapitaoCaches from "../models/CapitaoCaches.js";
import MelhorMesCache from "../models/MelhorMesCache.js";
import Rodada from "../models/Rodada.js";

const LOG_PREFIX = "[DISPUTAS-SERVICE]";

/**
 * Retorna as fases aplicáveis de acordo com o tamanho do torneio
 * Replica lógica do frontend (participante-mata-mata.js)
 */
function getFasesParaTamanho(tamanho) {
    if (tamanho >= 32) return ["primeira", "oitavas", "quartas", "semis", "final"];
    if (tamanho >= 16) return ["oitavas", "quartas", "semis", "final"];
    if (tamanho >= 8) return ["quartas", "semis", "final"];
    return [];
}

/**
 * Nomes legíveis das fases do Mata-Mata
 */
const NOMES_FASES = {
    primeira: "1ª Fase",
    oitavas: "Oitavas",
    quartas: "Quartas",
    semis: "Semifinal",
    final: "Final",
};

/**
 * Calcula dados completos de Pontos Corridos
 * @param {String} ligaId
 * @param {Number} rodada
 * @param {Number} timeId
 * @param {Number} temporada
 * @returns {Object} Dados do confronto, classificação, zona, mudanças
 */
export async function calcularPontosCorridos(ligaId, rodada, timeId, temporada) {
    try {
        // Buscar cache da rodada
        const cache = await PontosCorridosCache.findOne({
            liga_id: String(ligaId),
            rodada_consolidada: rodada,
            temporada: temporada,
        }).lean();

        if (!cache) {
            console.log(`${LOG_PREFIX} [PC] Cache não encontrado para rodada ${rodada}`);
            return null;
        }

        // Encontrar confronto do time
        const meuConfronto = cache.confrontos?.find(c =>
            c.time1.id === timeId || c.time2.id === timeId
        );

        if (!meuConfronto) {
            console.log(`${LOG_PREFIX} [PC] Confronto não encontrado para time ${timeId}`);
            return null;
        }

        // Determinar quem é quem
        const sou_time1 = meuConfronto.time1.id === timeId;
        const eu = sou_time1 ? meuConfronto.time1 : meuConfronto.time2;
        const adversario = sou_time1 ? meuConfronto.time2 : meuConfronto.time1;

        // Determinar resultado
        let resultado = "empate";
        let pontos_ganhos = 1;

        if (eu.pontos > adversario.pontos) {
            resultado = "vitoria";
            pontos_ganhos = 3;
        } else if (eu.pontos < adversario.pontos) {
            resultado = "derrota";
            pontos_ganhos = 0;
        }

        // Buscar minha posição na classificação
        const minhaClassificacao = cache.classificacao?.find(c => c.timeId === timeId);
        const posicaoAtual = minhaClassificacao?.posicao || 0;
        const pontosTabela = minhaClassificacao?.pontos || 0;

        // Buscar rodada anterior para detectar mudança de posição
        const cacheAnterior = await PontosCorridosCache.findOne({
            liga_id: String(ligaId),
            rodada_consolidada: rodada - 1,
            temporada: temporada,
        }).lean();

        let mudancaPosicao = 0;
        let posicaoAnterior = posicaoAtual;

        if (cacheAnterior) {
            const classificacaoAnterior = cacheAnterior.classificacao?.find(c => c.timeId === timeId);
            if (classificacaoAnterior) {
                posicaoAnterior = classificacaoAnterior.posicao;
                mudancaPosicao = posicaoAnterior - posicaoAtual; // Positivo = subiu
            }
        }

        // Definir zona (G4, G6, Z4, etc)
        const totalParticipantes = cache.classificacao?.length || 0;
        let zona = "Neutro";

        if (posicaoAtual <= 4) zona = "G4";
        else if (posicaoAtual <= 6) zona = "G6";
        else if (posicaoAtual >= totalParticipantes - 3) zona = "Z4";

        // Calcular vantagem/desvantagem em relação ao G4 e Z4
        let vantagem_g4 = 0;
        let desvantagem_z4 = 0;

        if (zona === "G4" && cache.classificacao && cache.classificacao.length > 4) {
            const quinto = cache.classificacao[4];
            vantagem_g4 = pontosTabela - (quinto?.pontos || 0);
        } else if (zona !== "G4" && cache.classificacao && cache.classificacao.length >= 4) {
            const quarto = cache.classificacao[3];
            vantagem_g4 = -(Math.abs(pontosTabela - (quarto?.pontos || 0)));
        }

        // Buscar próximo confronto (rodada +1)
        let proximoConfronto = null;
        const cacheProximo = await PontosCorridosCache.findOne({
            liga_id: String(ligaId),
            rodada_consolidada: rodada + 1,
            temporada: temporada,
        }).lean();

        if (cacheProximo) {
            const confrontoProx = cacheProximo.confrontos?.find(c =>
                c.time1.id === timeId || c.time2.id === timeId
            );

            if (confrontoProx) {
                const sou_time1_prox = confrontoProx.time1.id === timeId;
                const adversarioProx = sou_time1_prox ? confrontoProx.time2 : confrontoProx.time1;

                proximoConfronto = {
                    rodada: rodada + 1,
                    adversario: {
                        nome: adversarioProx.nome_cartola || adversarioProx.nome,
                        timeId: adversarioProx.id,
                        escudo: adversarioProx.escudo,
                    },
                };
            }
        }

        return {
            seu_confronto: {
                voce: parseFloat(eu.pontos.toFixed(2)),
                adversario: {
                    nome: adversario.nome_cartola || adversario.nome,
                    pontos: parseFloat(adversario.pontos.toFixed(2)),
                    timeId: adversario.id,
                    escudo: adversario.escudo,
                },
                resultado, // "vitoria", "empate", "derrota"
                diferenca: parseFloat(Math.abs(eu.pontos - adversario.pontos).toFixed(2)),
                pontos_ganhos,
            },
            classificacao_atual: (cache.classificacao || []).slice(0, 10).map(c => ({
                posicao: c.posicao,
                timeId: c.timeId,
                nome: c.nome_cartola || c.nome,
                pontos: c.pontos,
                jogos: c.jogos,
                vitorias: c.vitorias,
                empates: c.empates,
                derrotas: c.derrotas,
                saldo_pontos: c.saldo_pontos || 0,
            })),
            minha_posicao: posicaoAtual,
            posicao_anterior: posicaoAnterior,
            mudanca_posicao: mudancaPosicao, // +2 = subiu 2, -1 = caiu 1
            zona,
            vantagem_g4: parseFloat(vantagem_g4.toFixed(1)),
            proximo_confronto: proximoConfronto,
        };
    } catch (error) {
        console.error(`${LOG_PREFIX} [PC] Erro:`, error);
        return null;
    }
}

/**
 * Calcula dados de Mata-Mata
 * @param {String} ligaId
 * @param {Number} rodada
 * @param {Number} timeId
 * @param {Number} temporada
 * @returns {Object} Confronto, fase, resultado, próxima fase
 */
export async function calcularMataMata(ligaId, rodada, timeId, temporada) {
    try {
        // Buscar todas as edições do mata-mata para esta liga/temporada
        const caches = await MataMataCache.find({
            liga_id: String(ligaId),
            temporada: temporada,
        })
            .sort({ edicao: -1 })
            .lean();

        if (!caches || caches.length === 0) {
            console.log(`${LOG_PREFIX} [MM] Nenhum cache encontrado`);
            return null;
        }

        // Iterar edições (mais recente primeiro) até encontrar o time
        for (const cache of caches) {
            const torneio = cache.dados_torneio;
            if (!torneio) continue;

            const tamanho = torneio.metadata?.tamanhoTorneio || cache.tamanhoTorneio || 16;
            const fases = getFasesParaTamanho(tamanho);

            let ultimaFase = null;
            let meuConfronto = null;
            let foiEliminado = false;

            // Iterar fases em ordem para encontrar a última participação do time
            for (const fase of fases) {
                const confrontos = torneio[fase];
                if (!confrontos || !Array.isArray(confrontos) || confrontos.length === 0) continue;

                const confronto = confrontos.find(c =>
                    Number(c.timeA?.timeId) === timeId || Number(c.timeB?.timeId) === timeId
                );

                if (confronto) {
                    ultimaFase = fase;
                    meuConfronto = confronto;

                    // Verificar se foi eliminado nesta fase
                    const souTimeA = Number(confronto.timeA?.timeId) === timeId;
                    const meusPts = parseFloat(souTimeA ? confronto.timeA?.pontos : confronto.timeB?.pontos) || 0;
                    const advPts = parseFloat(souTimeA ? confronto.timeB?.pontos : confronto.timeA?.pontos) || 0;

                    if (meusPts > 0 && advPts > 0 && meusPts < advPts) {
                        foiEliminado = true;
                    }
                }
            }

            // Se não encontrou o time em nenhuma fase desta edição, pular
            if (!ultimaFase || !meuConfronto) continue;

            // Montar resposta com dados reais
            const souTimeA = Number(meuConfronto.timeA?.timeId) === timeId;
            const eu = souTimeA ? meuConfronto.timeA : meuConfronto.timeB;
            const adversario = souTimeA ? meuConfronto.timeB : meuConfronto.timeA;

            const meusPontos = parseFloat(eu?.pontos) || 0;
            const advPontos = parseFloat(adversario?.pontos) || 0;

            // Determinar resultado
            let resultado = "pendente";
            if (meusPontos > 0 && advPontos > 0) {
                resultado = meusPontos > advPontos ? "classificado" : "eliminado";
            }

            // Calcular próxima fase
            let proximaFase = null;
            if (resultado === "classificado") {
                const idx = fases.indexOf(ultimaFase);
                if (idx >= 0 && idx < fases.length - 1) {
                    proximaFase = NOMES_FASES[fases[idx + 1]] || fases[idx + 1];
                }
            }

            // Montar chave completa da fase atual (todos os confrontos)
            const chaveCompleta = (torneio[ultimaFase] || []).map(c => ({
                jogo: c.jogo,
                timeA: {
                    nome: c.timeA?.nome_cartola || c.timeA?.nome_cartoleiro || "?",
                    pontos: parseFloat(c.timeA?.pontos) || 0,
                    timeId: Number(c.timeA?.timeId) || 0,
                },
                timeB: {
                    nome: c.timeB?.nome_cartola || c.timeB?.nome_cartoleiro || "?",
                    pontos: parseFloat(c.timeB?.pontos) || 0,
                    timeId: Number(c.timeB?.timeId) || 0,
                },
            }));

            return {
                edicao: cache.edicao,
                fase_atual: NOMES_FASES[ultimaFase] || ultimaFase,
                seu_confronto: {
                    voce: meusPontos,
                    adversario: {
                        nome: adversario?.nome_cartola || adversario?.nome_cartoleiro || "Adversário",
                        pontos: advPontos,
                        timeId: Number(adversario?.timeId) || 0,
                        escudo: adversario?.url_escudo_png || null,
                    },
                    resultado,
                    diferenca: parseFloat(Math.abs(meusPontos - advPontos).toFixed(2)),
                },
                proxima_fase: proximaFase,
                chave_completa: chaveCompleta,
            };
        }

        // Time não participou de nenhuma edição
        console.log(`${LOG_PREFIX} [MM] Time ${timeId} não encontrado em nenhuma edição`);
        return null;
    } catch (error) {
        console.error(`${LOG_PREFIX} [MM] Erro:`, error);
        return null;
    }
}

/**
 * Calcula dados de Artilheiro Campeão
 * @param {String} ligaId
 * @param {Number} rodada
 * @param {Number} timeId
 * @param {Number} temporada
 * @returns {Object} Classificação, posição, atacante da rodada
 */
export async function calcularArtilheiro(ligaId, rodada, timeId, temporada) {
    try {
        const dados = await ArtilheiroCampeao.findOne({
            ligaId: String(ligaId),
            temporada: temporada,
        }).lean();

        if (!dados || !dados.dados) {
            console.log(`${LOG_PREFIX} [ART] Dados não encontrados`);
            return null;
        }

        // Ordenar por gols pro (ranking atual)
        const ranking = dados.dados
            .map(d => ({
                timeId: d.timeId,
                nome: d.nomeCartoleiro,
                gols: d.golsPro,
                saldo: d.saldoGols,
                detalhePorRodada: d.detalhePorRodada,
            }))
            .sort((a, b) => {
                if (b.gols !== a.gols) return b.gols - a.gols;
                return b.saldo - a.saldo;
            });

        const minhaPosicao = ranking.findIndex(r => r.timeId === timeId) + 1;
        const meusDados = ranking.find(r => r.timeId === timeId);

        // Detectar eventos especiais
        let perdeu_lideranca = false;
        let assumiu_lideranca = false;
        let rival = null;

        if (ranking.length > 1) {
            const lider = ranking[0];
            const segundo = ranking[1];

            // Se estou em 1º e há empate
            if (minhaPosicao === 1 && segundo.gols === lider.gols) {
                rival = segundo.nome;
            }

            // Recalcular ranking da rodada anterior usando detalhePorRodada
            if (rodada > 1) {
                const rankingAnterior = ranking
                    .map(r => {
                        // Subtrair gols desta rodada para obter acumulado até rodada N-1
                        const golsEstaRodada = extrairGolsDaRodada(r.detalhePorRodada, rodada);
                        return {
                            timeId: r.timeId,
                            gols: r.gols - golsEstaRodada,
                        };
                    })
                    .sort((a, b) => b.gols - a.gols);

                const liderAnterior = rankingAnterior[0];
                const liderAtual = ranking[0];

                // Verificar mudanças para o time consultado
                const minhaPosAnterior = rankingAnterior.findIndex(r => r.timeId === timeId) + 1;

                if (minhaPosicao === 1 && minhaPosAnterior > 1) {
                    assumiu_lideranca = true;
                } else if (minhaPosAnterior === 1 && minhaPosicao > 1) {
                    perdeu_lideranca = true;
                }
            }
        }

        // Buscar gols da rodada via GolsConsolidados
        let atletaRodada = null;
        try {
            const GolsConsolidados = mongoose.model("GolsConsolidados");
            const golsRodada = await GolsConsolidados.findOne({
                ligaId: String(ligaId),
                timeId: timeId,
                rodada: rodada,
                temporada: temporada,
            }).lean();

            if (golsRodada && golsRodada.jogadores && golsRodada.jogadores.length > 0) {
                // Pegar o jogador com mais gols na rodada
                const artilheiroRodada = [...golsRodada.jogadores]
                    .filter(j => j.gols > 0)
                    .sort((a, b) => b.gols - a.gols)[0];

                if (artilheiroRodada) {
                    atletaRodada = {
                        nome: artilheiroRodada.nome,
                        gols: artilheiroRodada.gols,
                        pontos: 0,
                    };
                }
            }
        } catch (e) {
            // GolsConsolidados pode não estar registrado ainda, fallback silencioso
            console.log(`${LOG_PREFIX} [ART] GolsConsolidados não disponível, pulando gols da rodada`);
        }

        // Remover detalhePorRodada do retorno (dados internos)
        return {
            classificacao: ranking.slice(0, 5).map((r, i) => ({
                posicao: i + 1,
                timeId: r.timeId,
                nome: r.nome,
                gols: r.gols,
                saldo: r.saldo,
            })),
            sua_posicao: minhaPosicao,
            seus_gols: meusDados?.gols || 0,
            seu_saldo: meusDados?.saldo || 0,
            perdeu_lideranca,
            assumiu_lideranca,
            rival,
            seu_atacante_rodada: atletaRodada,
        };
    } catch (error) {
        console.error(`${LOG_PREFIX} [ART] Erro:`, error);
        return null;
    }
}

/**
 * Extrai gols de uma rodada específica do detalhePorRodada
 * Trata tanto Map (mongoose) quanto Object/Array (após .lean())
 */
function extrairGolsDaRodada(detalhePorRodada, rodada) {
    if (!detalhePorRodada) return 0;

    // Caso 1: É um Object (Map convertido por .lean()) com chaves string
    if (typeof detalhePorRodada === "object" && !Array.isArray(detalhePorRodada)) {
        const entrada = detalhePorRodada[String(rodada)] || detalhePorRodada[rodada];
        return entrada?.golsPro || 0;
    }

    // Caso 2: É um Array (formato do controller)
    if (Array.isArray(detalhePorRodada)) {
        const entrada = detalhePorRodada.find(d => d.rodada === rodada || d.rodada === String(rodada));
        return entrada?.golsPro || 0;
    }

    return 0;
}

/**
 * Calcula dados de Luva de Ouro (similar ao Artilheiro, mas com goleiros e SGs)
 */
export async function calcularLuvaOuro(ligaId, rodada, timeId, temporada) {
    try {
        const dados = await Goleiros.findOne({
            ligaId: String(ligaId),
            temporada: temporada,
        }).lean();

        if (!dados || !dados.dados) {
            console.log(`${LOG_PREFIX} [LUVA] Dados não encontrados`);
            return null;
        }

        // Ordenar por saldoGols (SGs)
        const ranking = dados.dados
            .map(d => ({
                timeId: d.timeId,
                nome: d.nomeCartoleiro,
                sgs: d.saldoGols, // Saldo de gols (clean sheets - gols sofridos)
                pontos: d.pontosRankingGeral || 0,
            }))
            .sort((a, b) => {
                if (b.sgs !== a.sgs) return b.sgs - a.sgs;
                return b.pontos - a.pontos; // Desempate por pontos
            });

        const minhaPosicao = ranking.findIndex(r => r.timeId === timeId) + 1;
        const meusDados = ranking.find(r => r.timeId === timeId);

        // Buscar goleiro da rodada
        const rodadaData = await Rodada.findOne({
            ligaId: ligaId,
            rodada: rodada,
            temporada: temporada,
            timeId: timeId,
        }).lean();

        let goleiroRodada = null;
        if (rodadaData && rodadaData.atletas) {
            // Encontrar goleiro (posicao_id === 1)
            const goleiro = rodadaData.atletas.find(a => a.posicao_id === 1);

            if (goleiro) {
                goleiroRodada = {
                    nome: goleiro.apelido,
                    pontos: goleiro.pontos_num || 0,
                    sgs: 0, // Seria necessário calcular
                };
            }
        }

        return {
            classificacao: ranking.slice(0, 5).map((r, i) => ({
                posicao: i + 1,
                ...r,
            })),
            sua_posicao: minhaPosicao,
            seus_sgs: meusDados?.sgs || 0,
            seu_goleiro_rodada: goleiroRodada,
        };
    } catch (error) {
        console.error(`${LOG_PREFIX} [LUVA] Erro:`, error);
        return null;
    }
}

/**
 * Calcula dados de Capitão de Luxo
 */
export async function calcularCapitaoLuxo(ligaId, rodada, timeId, temporada) {
    try {
        const cache = await CapitaoCaches.findOne({
            ligaId: String(ligaId),
            temporada: temporada,
        }).lean();

        if (!cache || !cache.rankingAcumulado) {
            console.log(`${LOG_PREFIX} [CAP] Cache não encontrado`);
            return null;
        }

        const ranking = cache.rankingAcumulado
            .map(r => ({
                timeId: r.timeId,
                nome: r.nomeCartoleiro,
                pontos: r.totalBonusAcumulado || 0,
            }))
            .sort((a, b) => b.pontos - a.pontos);

        const minhaPosicao = ranking.findIndex(r => r.timeId === timeId) + 1;
        const lider = ranking[0];
        const meusDados = ranking.find(r => r.timeId === timeId);

        // Buscar capitão da rodada
        const rodadaData = await Rodada.findOne({
            ligaId: ligaId,
            rodada: rodada,
            temporada: temporada,
            timeId: timeId,
        }).lean();

        let capitaoRodada = null;
        if (rodadaData && rodadaData.capitao_id && rodadaData.atletas) {
            const capitao = rodadaData.atletas.find(a => a.atleta_id === rodadaData.capitao_id);

            if (capitao) {
                const pontosBase = capitao.pontos_num || 0;
                const bonus = pontosBase * 0.5; // Capitão de Luxo = 1.5x = 0.5x de bônus

                capitaoRodada = {
                    nome: capitao.apelido,
                    pontos_base: pontosBase,
                    bonus: bonus,
                    impacto_percentual: rodadaData.pontos > 0
                        ? (bonus / rodadaData.pontos) * 100
                        : 0,
                };
            }
        }

        return {
            classificacao_acumulada: ranking.slice(0, 5).map((r, i) => ({
                posicao: i + 1,
                ...r,
                diferenca: i === 0 ? 0 : parseFloat((r.pontos - lider.pontos).toFixed(2)),
            })),
            sua_posicao: minhaPosicao,
            seus_pontos: meusDados?.pontos || 0,
            seu_capitao_rodada: capitaoRodada,
        };
    } catch (error) {
        console.error(`${LOG_PREFIX} [CAP] Erro:`, error);
        return null;
    }
}

/**
 * Calcula dados de Melhor do Mês
 */
export async function calcularMelhorMes(ligaId, rodada, timeId, temporada) {
    try {
        // Determinar o mês atual
        const data = new Date();
        const mes = data.getMonth() + 1; // 1-12
        const ano = data.getFullYear();

        const cache = await MelhorMesCache.findOne({
            liga_id: String(ligaId),
            mes: mes,
            ano: ano,
            temporada: temporada,
        }).lean();

        if (!cache || !cache.ranking) {
            console.log(`${LOG_PREFIX} [MES] Cache não encontrado para ${mes}/${ano}`);
            return null;
        }

        const ranking = cache.ranking
            .map(r => ({
                timeId: r.timeId,
                nome: r.nomeCartoleiro || r.nome,
                pontos: r.pontos || 0,
            }))
            .sort((a, b) => b.pontos - a.pontos);

        const minhaPosicao = ranking.findIndex(r => r.timeId === timeId) + 1;
        const lider = ranking[0];
        const meusDados = ranking.find(r => r.timeId === timeId);

        // Calcular rodadas restantes no mês (estimativa)
        const rodadasRestantes = cache.rodadasRestantes || 0;

        return {
            mes: mes,
            ano: ano,
            classificacao: ranking.slice(0, 5).map((r, i) => ({
                posicao: i + 1,
                ...r,
                diferenca: i === 0 ? 0 : parseFloat((r.pontos - lider.pontos).toFixed(2)),
            })),
            sua_posicao: minhaPosicao,
            seus_pontos: meusDados?.pontos || 0,
            rodadas_restantes: rodadasRestantes,
        };
    } catch (error) {
        console.error(`${LOG_PREFIX} [MES] Erro:`, error);
        return null;
    }
}

export default {
    calcularPontosCorridos,
    calcularMataMata,
    calcularArtilheiro,
    calcularLuvaOuro,
    calcularCapitaoLuxo,
    calcularMelhorMes,
};
