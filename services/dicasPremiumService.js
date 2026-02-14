/**
 * DICAS PREMIUM SERVICE v1.1
 * Processa dados da API Cartola para estatisticas avancadas
 *
 * v1.1: Modos de estrategia nomeados (mitar/equilibrado/valorizar)
 *       via modulo estrategia-sugestao.js
 */

import axios from "axios";
import NodeCache from "node-cache";
import { calcularScoreAtleta, resolverPesoValorizacao, sugerirModo } from './estrategia-sugestao.js';

const cache = new NodeCache({ stdTTL: 300 }); // 5 min

const CARTOLA_API = {
    mercado: 'https://api.cartola.globo.com/atletas/mercado',
    pontuados: 'https://api.cartola.globo.com/atletas/pontuados',
    partidas: 'https://api.cartola.globo.com/partidas',
    clubes: 'https://api.cartola.globo.com/clubes',
    status: 'https://api.cartola.globo.com/mercado/status'
};

const POSICOES = {
    1: { id: 1, nome: 'Goleiro', abrev: 'GOL' },
    2: { id: 2, nome: 'Lateral', abrev: 'LAT' },
    3: { id: 3, nome: 'Zagueiro', abrev: 'ZAG' },
    4: { id: 4, nome: 'Meia', abrev: 'MEI' },
    5: { id: 5, nome: 'Atacante', abrev: 'ATA' },
    6: { id: 6, nome: 'Tecnico', abrev: 'TEC' }
};

/**
 * Calcula MPV (Minimo para Valorizar)
 * Formula baseada em preco e rodadas jogadas
 */
function calcularMPV(preco, jogos = 1) {
    if (!preco || preco <= 0) return 0;

    const coeficienteBase = 2.5;
    const fatorPreco = Math.log10(preco + 1) * 0.8;
    const fatorRodadas = jogos > 5 ? 1.0 : 1.2;

    return Number(((coeficienteBase + fatorPreco) * fatorRodadas).toFixed(1));
}

/**
 * Busca atletas do mercado com cache
 */
async function buscarMercado() {
    const cacheKey = 'mercado_atletas';
    const cached = cache.get(cacheKey);

    if (cached) {
        console.log('[DICAS-PREMIUM] Mercado obtido do cache');
        return cached;
    }

    try {
        console.log('[DICAS-PREMIUM] Buscando mercado na API Cartola...');
        const response = await axios.get(CARTOLA_API.mercado, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Super-Cartola-Manager/1.0.0',
                'Accept': 'application/json'
            }
        });

        if (!response.data || !response.data.atletas) {
            throw new Error('Resposta invalida da API');
        }

        const dados = {
            atletas: response.data.atletas,
            clubes: response.data.clubes,
            posicoes: response.data.posicoes,
            rodada: response.data.rodada_atual
        };

        cache.set(cacheKey, dados);
        return dados;

    } catch (error) {
        console.error('[DICAS-PREMIUM] Erro ao buscar mercado:', error.message);
        throw error;
    }
}

/**
 * Processa atletas com estatisticas calculadas
 */
function processarAtletas(atletas, clubes, filtros = {}) {
    const { posicao, precoMin, precoMax, mando, ordem = 'media' } = filtros;

    let resultado = atletas.map(atleta => {
        const clube = clubes[atleta.clube_id] || {};
        const jogos = atleta.jogos_num || 1;
        const media = atleta.media_num || 0;
        const preco = atleta.preco_num || 0;

        return {
            atletaId: atleta.atleta_id,
            nome: atleta.apelido || atleta.nome,
            posicaoId: atleta.posicao_id,
            posicao: POSICOES[atleta.posicao_id]?.abrev || 'N/D',
            clubeId: atleta.clube_id,
            clubeNome: clube.nome || 'N/D',
            clubeAbrev: clube.abreviacao || '???',
            preco: preco,
            variacao: atleta.variacao_num || 0,
            media: media,
            jogos: jogos,
            mpv: calcularMPV(preco, jogos),
            pontos: atleta.pontos_num || 0,
            status: atleta.status_id,
            scouts: atleta.scout || {},
            proximoJogo: null
        };
    });

    // Filtrar por posicao
    if (posicao && posicao !== 'todos') {
        const posId = parseInt(posicao);
        resultado = resultado.filter(a => a.posicaoId === posId);
    }

    // Filtrar por preco
    if (precoMin) {
        resultado = resultado.filter(a => a.preco >= parseFloat(precoMin));
    }
    if (precoMax) {
        resultado = resultado.filter(a => a.preco <= parseFloat(precoMax));
    }

    // Ordenar
    const ordens = {
        media: (a, b) => b.media - a.media,
        preco: (a, b) => a.preco - b.preco,
        mpv: (a, b) => a.mpv - b.mpv,
        variacao: (a, b) => b.variacao - a.variacao
    };

    resultado.sort(ordens[ordem] || ordens.media);

    return resultado;
}

/**
 * Busca jogadores com filtros
 */
export async function buscarJogadores(filtros = {}) {
    const { limit = 50, offset = 0 } = filtros;

    const mercado = await buscarMercado();
    const atletas = processarAtletas(mercado.atletas, mercado.clubes, filtros);

    return {
        jogadores: atletas.slice(offset, offset + limit),
        total: atletas.length,
        pagina: Math.floor(offset / limit) + 1,
        totalPaginas: Math.ceil(atletas.length / limit),
        rodada: mercado.rodada
    };
}

/**
 * Busca detalhes de um jogador
 */
export async function buscarJogador(atletaId) {
    const mercado = await buscarMercado();
    const atleta = mercado.atletas.find(a => a.atleta_id === parseInt(atletaId));

    if (!atleta) {
        return null;
    }

    const clube = mercado.clubes[atleta.clube_id] || {};
    const jogos = atleta.jogos_num || 1;

    return {
        atletaId: atleta.atleta_id,
        nome: atleta.apelido || atleta.nome,
        nomeCompleto: atleta.nome,
        posicaoId: atleta.posicao_id,
        posicao: POSICOES[atleta.posicao_id]?.nome || 'N/D',
        clubeId: atleta.clube_id,
        clubeNome: clube.nome || 'N/D',
        preco: atleta.preco_num || 0,
        variacao: atleta.variacao_num || 0,
        media: atleta.media_num || 0,
        jogos: jogos,
        mpv: calcularMPV(atleta.preco_num, jogos),
        minutos: atleta.minutos_num || 0,
        scouts: {
            // Positivos
            G: atleta.scout?.G || 0,
            A: atleta.scout?.A || 0,
            SG: atleta.scout?.SG || 0,
            DS: atleta.scout?.DS || 0,
            FS: atleta.scout?.FS || 0,
            FF: atleta.scout?.FF || 0,
            FD: atleta.scout?.FD || 0,
            FT: atleta.scout?.FT || 0,
            PS: atleta.scout?.PS || 0,
            DE: atleta.scout?.DE || 0,
            DP: atleta.scout?.DP || 0,
            // Negativos
            GC: atleta.scout?.GC || 0,
            CV: atleta.scout?.CV || 0,
            CA: atleta.scout?.CA || 0,
            GS: atleta.scout?.GS || 0,
            PP: atleta.scout?.PP || 0,
            PC: atleta.scout?.PC || 0,
            FC: atleta.scout?.FC || 0,
            I: atleta.scout?.I || 0
        },
        status: atleta.status_id
    };
}

/**
 * Busca pontuacao cedida por times (defesas vulneraveis)
 * Usa dados de atletas pontuados das ultimas rodadas
 */
export async function buscarPontuacaoCedida(posicaoId = 5, periodo = 5) {
    const cacheKey = `cedido_${posicaoId}_${periodo}`;
    const cached = cache.get(cacheKey);

    if (cached) {
        return cached;
    }

    try {
        // Buscar status para saber rodada atual
        const statusResp = await axios.get(CARTOLA_API.status, { timeout: 10000 });
        const rodadaAtual = statusResp.data.rodada_atual || 1;

        // Buscar clubes para nomes
        const clubesResp = await axios.get(CARTOLA_API.clubes, { timeout: 10000 });
        const clubes = clubesResp.data || {};

        // Buscar partidas para mapear confrontos
        const partidasResp = await axios.get(CARTOLA_API.partidas, { timeout: 10000 });
        const partidas = partidasResp.data?.partidas || [];

        // Coletar pontuacoes das ultimas N rodadas
        const rodadaInicio = Math.max(1, rodadaAtual - periodo);
        const pontuacoesPorClube = {};

        for (let r = rodadaInicio; r < rodadaAtual; r++) {
            try {
                const resp = await axios.get(`${CARTOLA_API.pontuados}/${r}`, { timeout: 10000 });
                const atletas = resp.data?.atletas || {};

                // Buscar partidas da rodada para saber adversarios
                let partidasRodada;
                try {
                    const partidasRResp = await axios.get(`${CARTOLA_API.partidas}/${r}`, { timeout: 10000 });
                    partidasRodada = partidasRResp.data?.partidas || [];
                } catch {
                    partidasRodada = [];
                }

                // Mapear clube -> adversario
                const adversarios = {};
                partidasRodada.forEach(p => {
                    adversarios[p.clube_casa_id] = p.clube_visitante_id;
                    adversarios[p.clube_visitante_id] = p.clube_casa_id;
                });

                for (const [id, atleta] of Object.entries(atletas)) {
                    // Filtrar por posicao se especificado
                    if (posicaoId && atleta.posicao_id !== parseInt(posicaoId)) {
                        continue;
                    }

                    // Identificar adversario do jogo
                    const clubeAtleta = atleta.clube_id;
                    const clubeAdversario = adversarios[clubeAtleta];

                    if (!clubeAdversario) continue;

                    if (!pontuacoesPorClube[clubeAdversario]) {
                        pontuacoesPorClube[clubeAdversario] = {
                            clubeId: clubeAdversario,
                            pontosSofridos: 0,
                            jogos: 0
                        };
                    }

                    pontuacoesPorClube[clubeAdversario].pontosSofridos += atleta.pontuacao || 0;
                    pontuacoesPorClube[clubeAdversario].jogos++;
                }
            } catch (e) {
                console.log(`[DICAS-PREMIUM] Rodada ${r} sem dados: ${e.message}`);
            }
        }

        // Calcular medias e ordenar
        const resultado = Object.values(pontuacoesPorClube)
            .map(c => ({
                clubeId: c.clubeId,
                clubeNome: clubes[c.clubeId]?.nome || 'N/D',
                clubeAbrev: clubes[c.clubeId]?.abreviacao || '???',
                pontosCedidos: c.pontosSofridos,
                mediaCedida: c.jogos > 0 ? Number((c.pontosSofridos / c.jogos).toFixed(1)) : 0,
                jogos: c.jogos
            }))
            .filter(c => c.jogos >= 2) // Minimo 2 jogos para relevancia
            .sort((a, b) => b.mediaCedida - a.mediaCedida)
            .slice(0, 20);

        cache.set(cacheKey, resultado, 600); // 10 min
        return resultado;

    } catch (error) {
        console.error('[DICAS-PREMIUM] Erro ao buscar cedidos:', error.message);
        return [];
    }
}

/**
 * Calcula tabela de valorizacao para um preco
 */
export function calcularTabelaValorizacao(preco) {
    const cenarios = [0, 3, 5, 8, 12, 15, 20];
    const mpv = calcularMPV(preco);

    return cenarios.map(pts => {
        // Formula simplificada de variacao
        let variacao;
        if (pts === 0) {
            variacao = -0.5 - (preco * 0.02);
        } else if (pts < mpv) {
            variacao = (pts - mpv) * 0.15;
        } else {
            variacao = (pts - mpv) * 0.2;
        }

        return {
            pontos: pts,
            variacao: Number(variacao.toFixed(2)),
            novoPreco: Number((preco + variacao).toFixed(2))
        };
    });
}

/**
 * Gera sugestao de escalacao otimizada
 * @param {number} patrimonio - Cartoletas disponiveis
 * @param {string|number} modoOuPeso - 'mitar'|'equilibrado'|'valorizar' ou 0-100 (retrocompat)
 * @returns {Object} Escalacao sugerida
 */
export async function gerarSugestaoEscalacao(patrimonio, modoOuPeso = 'equilibrado') {
    const pesoValorizacao = resolverPesoValorizacao(modoOuPeso);
    const modoSugerido = sugerirModo(patrimonio);

    const mercado = await buscarMercado();
    const { atletas, clubes } = mercado;

    // Configuracao de formacao (4-3-3)
    const formacao = {
        1: 1,  // GOL
        2: 2,  // LAT
        3: 2,  // ZAG
        4: 3,  // MEI
        5: 3,  // ATA
        6: 1   // TEC
    };

    // Processar atletas com score centralizado (estrategia-sugestao.js)
    const atletasProcessados = atletas
        .filter(a => a.status_id === 7) // Apenas provaveis
        .map(a => {
            const media = a.media_num || 0;
            const preco = a.preco_num || 0;
            const variacao = a.variacao_num || 0;
            const jogos = a.jogos_num || 1;
            const mpv = calcularMPV(preco, jogos);

            const scoreFinal = calcularScoreAtleta({ media, preco, mpv, variacao, jogos }, pesoValorizacao);

            return {
                atletaId: a.atleta_id,
                nome: a.apelido || a.nome,
                posicaoId: a.posicao_id,
                posicao: POSICOES[a.posicao_id]?.abrev || 'N/D',
                clubeId: a.clube_id,
                clubeNome: clubes[a.clube_id]?.nome || 'N/D',
                clubeAbrev: clubes[a.clube_id]?.abreviacao || '???',
                preco,
                media,
                variacao,
                mpv,
                scoreFinal
            };
        });

    // Agrupar por posicao e ordenar por score
    const porPosicao = {};
    for (let pos = 1; pos <= 6; pos++) {
        porPosicao[pos] = atletasProcessados
            .filter(a => a.posicaoId === pos)
            .sort((a, b) => b.scoreFinal - a.scoreFinal);
    }

    // Algoritmo greedy para montar time
    const escalacao = [];
    const clubesUsados = {};
    let gastoTotal = 0;
    let orcamentoRestante = patrimonio;

    // Reservar minimo para cada posicao (jogador mais barato)
    const minimosPorPosicao = {};
    for (let pos = 1; pos <= 6; pos++) {
        const qtd = formacao[pos];
        const ordenadoPorPreco = [...porPosicao[pos]].sort((a, b) => a.preco - b.preco);
        minimosPorPosicao[pos] = ordenadoPorPreco.slice(0, qtd).reduce((sum, a) => sum + a.preco, 0);
    }

    // Selecionar jogadores por posicao
    for (let pos = 1; pos <= 6; pos++) {
        const qtdNecessaria = formacao[pos];
        const candidatos = porPosicao[pos];

        for (let i = 0; i < qtdNecessaria; i++) {
            // Calcular orcamento disponivel para esta posicao
            // Reservar dinheiro para posicoes restantes
            let reservaNecessaria = 0;
            for (let p = pos; p <= 6; p++) {
                const qtdRestante = formacao[p] - (p === pos ? i : 0);
                if (qtdRestante > 0 && p !== pos) {
                    // Pegar os mais baratos disponiveis
                    const disponiveis = porPosicao[p]
                        .filter(a => !escalacao.find(e => e.atletaId === a.atletaId))
                        .filter(a => (clubesUsados[a.clubeId] || 0) < 3)
                        .sort((a, b) => a.preco - b.preco);
                    for (let j = 0; j < Math.min(qtdRestante, disponiveis.length); j++) {
                        reservaNecessaria += disponiveis[j]?.preco || 0;
                    }
                }
            }

            const orcamentoParaEste = orcamentoRestante - reservaNecessaria;

            // Encontrar melhor jogador que cabe no orcamento
            const selecionado = candidatos.find(a => {
                // Ja selecionado?
                if (escalacao.find(e => e.atletaId === a.atletaId)) return false;
                // Limite de clube (max 3)
                if ((clubesUsados[a.clubeId] || 0) >= 3) return false;
                // Cabe no orcamento?
                if (a.preco > orcamentoParaEste) return false;
                return true;
            });

            if (selecionado) {
                escalacao.push({
                    ...selecionado,
                    capitao: false
                });
                clubesUsados[selecionado.clubeId] = (clubesUsados[selecionado.clubeId] || 0) + 1;
                gastoTotal += selecionado.preco;
                orcamentoRestante -= selecionado.preco;
            }
        }
    }

    // Definir capitao (jogador com maior media, exceto tecnico)
    const jogadoresSemTec = escalacao.filter(a => a.posicaoId !== 6);
    if (jogadoresSemTec.length > 0) {
        const melhorJogador = jogadoresSemTec.reduce((best, curr) =>
            curr.media > best.media ? curr : best
        );
        const idx = escalacao.findIndex(a => a.atletaId === melhorJogador.atletaId);
        if (idx !== -1) {
            escalacao[idx].capitao = true;
        }
    }

    // Calcular pontuacao esperada
    const pontuacaoBase = escalacao.reduce((sum, a) => {
        const pontos = a.media;
        return sum + (a.capitao ? pontos * 1.5 : pontos); // Capitao pontua 1.5x
    }, 0);

    // Range de variacao (+/- 20%)
    const pontuacaoMin = Math.round(pontuacaoBase * 0.8);
    const pontuacaoMax = Math.round(pontuacaoBase * 1.2);

    return {
        escalacao,
        gastoTotal: Number(gastoTotal.toFixed(2)),
        sobra: Number((patrimonio - gastoTotal).toFixed(2)),
        pontuacaoEsperada: {
            min: pontuacaoMin,
            max: pontuacaoMax,
            media: Math.round(pontuacaoBase)
        },
        formacao: '4-3-3',
        pesoValorizacao,
        modoSugerido,
        rodada: mercado.rodada
    };
}

export default {
    buscarJogadores,
    buscarJogador,
    buscarPontuacaoCedida,
    calcularTabelaValorizacao,
    calcularMPV,
    gerarSugestaoEscalacao
};
