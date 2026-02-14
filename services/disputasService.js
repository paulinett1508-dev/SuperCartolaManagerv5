// =====================================================================
// disputasService.js v1.0 - Cálculos de Disputas Internas
// Funções para calcular dados de cada módulo competitivo da liga
// =====================================================================

import PontosCorridosCache from "../models/PontosCorridosCache.js";
import MataMataCache from "../models/MataMataCache.js";
import ArtilheiroCampeao from "../models/ArtilheiroCampeao.js";
import Goleiros from "../models/Goleiros.js";
import CapitaoCaches from "../models/CapitaoCaches.js";
import MelhorMesCache from "../models/MelhorMesCache.js";
import Rodada from "../models/Rodada.js";

const LOG_PREFIX = "[DISPUTAS-SERVICE]";

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
        // Buscar cache mais recente (pode ter múltiplas edições)
        const cache = await MataMataCache.findOne({
            liga_id: String(ligaId),
            temporada: temporada,
        })
            .sort({ rodada_atual: -1 })
            .lean();

        if (!cache || !cache.dados_torneio) {
            console.log(`${LOG_PREFIX} [MM] Cache não encontrado`);
            return null;
        }

        const torneio = cache.dados_torneio;

        // A estrutura de dados_torneio varia dependendo da implementação
        // Normalmente tem: { fases: [...], confrontos: [...], vencedor: ... }

        // TODO: Implementar parsing completo do dados_torneio
        // Por enquanto, retornar estrutura básica

        return {
            fase_atual: "Oitavas", // Placeholder - extrair de torneio.faseAtual ou similar
            seu_confronto: {
                voce: 0,
                adversario: { nome: "Adversário", pontos: 0, timeId: 0 },
                resultado: "pendente", // "classificado", "eliminado", "pendente"
                diferenca: 0,
            },
            proxima_fase: null,
            chave_completa: [],
        };
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

        // Ordenar por gols pro
        const ranking = dados.dados
            .map(d => ({
                timeId: d.timeId,
                nome: d.nomeCartoleiro,
                gols: d.golsPro,
                saldo: d.saldoGols,
            }))
            .sort((a, b) => {
                if (b.gols !== a.gols) return b.gols - a.gols;
                return b.saldo - a.saldo; // Desempate por saldo
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

            // TODO: Comparar com rodada anterior para detectar mudanças
            // Requer buscar ArtilheiroCampeao da rodada anterior
        }

        // Buscar atacante da rodada (atletas que fizeram gols)
        const rodadaData = await Rodada.findOne({
            ligaId: ligaId,
            rodada: rodada,
            temporada: temporada,
            timeId: timeId,
        }).lean();

        let atletaRodada = null;
        if (rodadaData && rodadaData.atletas) {
            // Encontrar atacantes (posicao_id === 5)
            const atacantes = rodadaData.atletas.filter(a => a.posicao_id === 5);

            // Pegar o que mais pontuou
            if (atacantes.length > 0) {
                const melhorAtacante = atacantes.sort((a, b) =>
                    (b.pontos_num || 0) - (a.pontos_num || 0)
                )[0];

                atletaRodada = {
                    nome: melhorAtacante.apelido,
                    pontos: melhorAtacante.pontos_num || 0,
                    // Gols não estão diretamente na Rodada, precisaria buscar em Gols
                    gols: 0,
                };
            }
        }

        return {
            classificacao: ranking.slice(0, 5).map((r, i) => ({
                posicao: i + 1,
                ...r,
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
