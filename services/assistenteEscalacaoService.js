/**
 * ASSISTENTE ESCALACAO SERVICE v1.0
 * Orquestrador multi-fonte para sugestao inteligente de escalacao.
 *
 * Fontes de dados:
 *   1. Cartola API publica (/atletas/mercado) + campo gato_mestre
 *   2. Partidas da rodada (mandante/visitante)
 *   3. Pontuacao cedida (defesas vulneraveis)
 *   4. Token de sistema (endpoints autenticados - Fase 2)
 *   5. Fontes externas opcionais (odds, scraping - Fase 3)
 *
 * Gera 3 cenarios simultaneos: Mitar, Equilibrado, Valorizar
 */

import axios from "axios";
import NodeCache from "node-cache";
import {
    MODOS,
    MODOS_CONFIG,
    calcularScoreAtleta,
    calcularScoreAtletaEnriquecido,
    resolverPesoValorizacao,
    sugerirModo,
} from './estrategia-sugestao.js';
import dicasPremiumService from './dicasPremiumService.js';
import bettingOddsService from './bettingOddsService.js';
import cartolaFCBrasilScraper from './cartolaFCBrasilScraperService.js';
import systemTokenService from './systemTokenService.js';

const cache = new NodeCache({ stdTTL: 300 }); // 5 min

const CARTOLA_API = {
    mercado: 'https://api.cartola.globo.com/atletas/mercado',
    partidas: 'https://api.cartola.globo.com/partidas',
    status: 'https://api.cartola.globo.com/mercado/status',
    clubes: 'https://api.cartola.globo.com/clubes',
};

const POSICOES = {
    1: { id: 1, nome: 'Goleiro', abrev: 'GOL' },
    2: { id: 2, nome: 'Lateral', abrev: 'LAT' },
    3: { id: 3, nome: 'Zagueiro', abrev: 'ZAG' },
    4: { id: 4, nome: 'Meia', abrev: 'MEI' },
    5: { id: 5, nome: 'Atacante', abrev: 'ATA' },
    6: { id: 6, nome: 'Tecnico', abrev: 'TEC' },
};

const ESQUEMAS = {
    1: { nome: '3-4-3', posicoes: { 1: 1, 2: 0, 3: 3, 4: 4, 5: 3, 6: 1 } },
    2: { nome: '3-5-2', posicoes: { 1: 1, 2: 0, 3: 3, 4: 5, 5: 2, 6: 1 } },
    3: { nome: '4-3-3', posicoes: { 1: 1, 2: 2, 3: 2, 4: 3, 5: 3, 6: 1 } },
    4: { nome: '4-4-2', posicoes: { 1: 1, 2: 2, 3: 2, 4: 4, 5: 2, 6: 1 } },
    5: { nome: '4-5-1', posicoes: { 1: 1, 2: 2, 3: 2, 4: 5, 5: 1, 6: 1 } },
    6: { nome: '5-3-2', posicoes: { 1: 1, 2: 2, 3: 3, 4: 3, 5: 2, 6: 1 } },
    7: { nome: '5-4-1', posicoes: { 1: 1, 2: 2, 3: 3, 4: 4, 5: 1, 6: 1 } },
};

// =====================================================================
// BUSCAR PARTIDAS DA RODADA (mandante/visitante)
// =====================================================================
async function buscarPartidas() {
    const cacheKey = 'assistente_partidas';
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
        const resp = await axios.get(CARTOLA_API.partidas, { timeout: 10000 });
        const partidas = resp.data?.partidas || [];

        // Mapear clube_id -> { mandante: bool, adversarioId }
        const mapaConfrontos = {};
        for (const p of partidas) {
            mapaConfrontos[p.clube_casa_id] = {
                mandante: true,
                adversarioId: p.clube_visitante_id,
            };
            mapaConfrontos[p.clube_visitante_id] = {
                mandante: false,
                adversarioId: p.clube_casa_id,
            };
        }

        cache.set(cacheKey, mapaConfrontos);
        return mapaConfrontos;
    } catch (error) {
        console.error('[ASSISTENTE] Erro ao buscar partidas:', error.message);
        return {};
    }
}

// =====================================================================
// BUSCAR PONTUACAO CEDIDA POR CLUBE (agrupado por posicao)
// =====================================================================
async function buscarCedidosPorClube() {
    const cacheKey = 'assistente_cedidos_all';
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
        // Buscar cedidos para todas as posicoes de campo (1-5)
        const resultados = await Promise.allSettled([
            dicasPremiumService.buscarPontuacaoCedida(1, 5), // GOL
            dicasPremiumService.buscarPontuacaoCedida(2, 5), // LAT
            dicasPremiumService.buscarPontuacaoCedida(3, 5), // ZAG
            dicasPremiumService.buscarPontuacaoCedida(4, 5), // MEI
            dicasPremiumService.buscarPontuacaoCedida(5, 5), // ATA
        ]);

        // Agregar por clube: { clubeId: { posicao1: mediaCedida, ... } }
        const cedidosPorClube = {};

        resultados.forEach((resultado, idx) => {
            if (resultado.status !== 'fulfilled') return;
            const posicaoId = idx + 1;

            for (const item of resultado.value) {
                if (!cedidosPorClube[item.clubeId]) {
                    cedidosPorClube[item.clubeId] = { clubeNome: item.clubeNome };
                }
                cedidosPorClube[item.clubeId][`pos${posicaoId}`] = item.mediaCedida;
            }
        });

        cache.set(cacheKey, cedidosPorClube, 600); // 10 min
        return cedidosPorClube;
    } catch (error) {
        console.error('[ASSISTENTE] Erro ao buscar cedidos:', error.message);
        return {};
    }
}

// =====================================================================
// BUSCAR MERCADO ENRIQUECIDO (com gato_mestre preservado)
// =====================================================================
async function buscarMercadoEnriquecido() {
    const cacheKey = 'assistente_mercado';
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
        const resp = await axios.get(CARTOLA_API.mercado, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Super-Cartola-Manager/2.0.0',
                'Accept': 'application/json',
            },
        });

        if (!resp.data || !resp.data.atletas) {
            throw new Error('Resposta invalida da API');
        }

        const dados = {
            atletas: resp.data.atletas,
            clubes: resp.data.clubes,
            posicoes: resp.data.posicoes,
            rodada: resp.data.rodada_atual,
        };

        cache.set(cacheKey, dados);
        return dados;
    } catch (error) {
        console.error('[ASSISTENTE] Erro ao buscar mercado:', error.message);
        throw error;
    }
}

// =====================================================================
// CALCULAR MPV
// =====================================================================
function calcularMPV(preco, jogos = 1) {
    if (!preco || preco <= 0) return 0;
    const coeficienteBase = 2.5;
    const fatorPreco = Math.log10(preco + 1) * 0.8;
    const fatorRodadas = jogos > 5 ? 1.0 : 1.2;
    return Number(((coeficienteBase + fatorPreco) * fatorRodadas).toFixed(1));
}

// =====================================================================
// MONTAR CENARIO (algoritmo otimizado por posicao)
// =====================================================================
function montarCenario(atletasRankeados, esquemaId, patrimonio, modo) {
    const esquema = ESQUEMAS[esquemaId] || ESQUEMAS[3]; // default 4-3-3
    const formacao = esquema.posicoes;

    // Agrupar por posicao e pegar top 15 candidatos
    const porPosicao = {};
    for (let pos = 1; pos <= 6; pos++) {
        porPosicao[pos] = atletasRankeados
            .filter(a => a.posicaoId === pos)
            .sort((a, b) => b.scoreFinal - a.scoreFinal)
            .slice(0, 15); // Pre-filtrar top 15
    }

    // Algoritmo greedy com reserva de orcamento
    const escalacao = [];
    const clubesUsados = {};
    let gastoTotal = 0;
    let orcamentoRestante = patrimonio;

    for (let pos = 1; pos <= 6; pos++) {
        const qtdNecessaria = formacao[pos] || 0;
        if (qtdNecessaria === 0) continue;

        const candidatos = porPosicao[pos];

        for (let i = 0; i < qtdNecessaria; i++) {
            // Calcular reserva para posicoes restantes
            let reserva = 0;
            for (let p = pos; p <= 6; p++) {
                const qtdRestante = formacao[p] - (p === pos ? (i + 1) : 0);
                if (qtdRestante <= 0) continue;
                const disponiveis = porPosicao[p]
                    .filter(a => !escalacao.find(e => e.atletaId === a.atletaId))
                    .filter(a => (clubesUsados[a.clubeId] || 0) < 3)
                    .sort((a, b) => a.preco - b.preco);
                for (let j = 0; j < Math.min(qtdRestante, disponiveis.length); j++) {
                    reserva += disponiveis[j]?.preco || 0;
                }
            }

            const orcamentoDisponivel = orcamentoRestante - reserva;

            const selecionado = candidatos.find(a => {
                if (escalacao.find(e => e.atletaId === a.atletaId)) return false;
                if ((clubesUsados[a.clubeId] || 0) >= 3) return false;
                if (a.preco > orcamentoDisponivel) return false;
                return true;
            });

            if (selecionado) {
                escalacao.push({ ...selecionado, capitao: false });
                clubesUsados[selecionado.clubeId] = (clubesUsados[selecionado.clubeId] || 0) + 1;
                gastoTotal += selecionado.preco;
                orcamentoRestante -= selecionado.preco;
            }
        }
    }

    // Capitao: maior media contextual (exceto tecnico)
    const jogadoresSemTec = escalacao.filter(a => a.posicaoId !== 6);
    if (jogadoresSemTec.length > 0) {
        const melhor = jogadoresSemTec.reduce((best, curr) => {
            const scoreCurr = curr.detalhes?.mediaContextual || curr.media;
            const scoreBest = best.detalhes?.mediaContextual || best.media;
            return scoreCurr > scoreBest ? curr : best;
        });
        const idx = escalacao.findIndex(a => a.atletaId === melhor.atletaId);
        if (idx !== -1) escalacao[idx].capitao = true;
    }

    // Pontuacao esperada
    const pontuacaoBase = escalacao.reduce((sum, a) => {
        const pts = a.detalhes?.mediaContextual || a.media;
        return sum + (a.capitao ? pts * 1.5 : pts);
    }, 0);

    return {
        modo,
        modoConfig: MODOS_CONFIG[modo],
        formacao: esquema.nome,
        esquemaId,
        escalacao,
        gastoTotal: Number(gastoTotal.toFixed(2)),
        sobra: Number((patrimonio - gastoTotal).toFixed(2)),
        pontuacaoEsperada: {
            min: Math.round(pontuacaoBase * 0.8),
            max: Math.round(pontuacaoBase * 1.2),
            media: Math.round(pontuacaoBase),
        },
    };
}

// =====================================================================
// GERAR CENARIOS (3 modos simultaneos)
// =====================================================================
async function gerarCenarios(patrimonio, esquemaId = 3) {
    console.log(`[ASSISTENTE] Gerando cenarios: patrimonio=C$${patrimonio}, esquema=${esquemaId}`);

    // Buscar dados em paralelo (todas as fontes - Promise.allSettled para resiliencia)
    const [mercadoResult, partidasResult, cedidosResult, oddsResult, authResult] = await Promise.allSettled([
        buscarMercadoEnriquecido(),
        buscarPartidas(),
        buscarCedidosPorClube(),
        bettingOddsService.buscarOdds(),
        buscarDadosAutenticados(),
    ]);

    if (mercadoResult.status !== 'fulfilled') {
        throw new Error('Falha ao buscar dados do mercado');
    }

    const { atletas: atletasRaw, clubes, rodada } = mercadoResult.value;
    const partidas = partidasResult.status === 'fulfilled' ? partidasResult.value : {};
    const cedidos = cedidosResult.status === 'fulfilled' ? cedidosResult.value : {};
    const odds = oddsResult.status === 'fulfilled' ? oddsResult.value : null;
    const authData = authResult.status === 'fulfilled' ? authResult.value : null;

    // Fontes ativas
    const fontesAtivas = ['cartola-api'];
    if (Object.keys(partidas).length > 0) fontesAtivas.push('partidas');
    if (Object.keys(cedidos).length > 0) fontesAtivas.push('confrontos');
    if (odds && Object.keys(odds).length > 0) fontesAtivas.push('odds');
    if (authData) fontesAtivas.push('auth-premium');

    // Processar atletas com scoring enriquecido para cada modo
    const cenarios = [];

    for (const modo of [MODOS.MITAR, MODOS.EQUILIBRADO, MODOS.VALORIZAR]) {
        const pesoValorizacao = resolverPesoValorizacao(modo);

        // Processar e rankear atletas com dados enriquecidos
        const atletasRankeados = atletasRaw
            .filter(a => a.status_id === 7) // Apenas provaveis
            .map(a => {
                const media = a.media_num || 0;
                const preco = a.preco_num || 0;
                const jogos = a.jogos_num || 1;
                const mpv = calcularMPV(preco, jogos);
                const clube = clubes[a.clube_id] || {};

                // Confronto do clube deste atleta
                const confrontoClube = partidas[a.clube_id] || {};
                const adversarioId = confrontoClube.adversarioId;

                // Cedidos pelo adversario na posicao do atleta
                const cedidoAdv = adversarioId && cedidos[adversarioId]
                    ? cedidos[adversarioId][`pos${a.posicao_id}`] || 0
                    : 0;

                // Scoring enriquecido (usa gato_mestre se disponivel)
                const { score, fontes, detalhes } = calcularScoreAtletaEnriquecido(
                    { media, preco, mpv, variacao: a.variacao_num || 0, jogos, gato_mestre: a.gato_mestre },
                    pesoValorizacao,
                    {
                        mandante: confrontoClube.mandante,
                        adversarioId,
                        cedidoMediaAdv: cedidoAdv,
                    }
                );

                // Verificar se gato_mestre contribuiu
                if (a.gato_mestre && !fontesAtivas.includes('gato-mestre')) {
                    fontesAtivas.push('gato-mestre');
                }

                // Aplicar fator odds se disponivel
                let scoreFinalComOdds = score;
                if (odds) {
                    const oddsInfo = bettingOddsService.calcularFatorOdds(a.clube_id, a.posicao_id, odds);
                    if (oddsInfo) {
                        scoreFinalComOdds = score * oddsInfo.fator;
                        fontes.push('odds');
                        detalhes.odds = {
                            probVitoria: oddsInfo.probVitoria,
                            fator: oddsInfo.fator,
                        };
                    }
                }

                return {
                    atletaId: a.atleta_id,
                    nome: a.apelido || a.nome,
                    foto: a.foto ? a.foto.replace('FORMATO', '140x140') : null,
                    posicaoId: a.posicao_id,
                    posicao: POSICOES[a.posicao_id]?.abrev || 'N/D',
                    clubeId: a.clube_id,
                    clubeNome: clube.nome || 'N/D',
                    clubeAbrev: clube.abreviacao || '???',
                    preco,
                    media,
                    variacao: a.variacao_num || 0,
                    mpv,
                    jogos,
                    scoreFinal: scoreFinalComOdds,
                    fontes,
                    detalhes,
                    mandante: confrontoClube.mandante,
                    adversario: adversarioId
                        ? (clubes[adversarioId]?.abreviacao || '???')
                        : null,
                };
            });

        const cenario = montarCenario(atletasRankeados, esquemaId, patrimonio, modo);
        cenarios.push(cenario);
    }

    return {
        success: true,
        cenarios,
        modoSugerido: sugerirModo(patrimonio),
        fontesAtivas: [...new Set(fontesAtivas)],
        rodada,
        patrimonio,
        esquemaId,
        geradoEm: new Date().toISOString(),
    };
}

// =====================================================================
// BUSCAR DADOS AUTENTICADOS (via token de sistema do admin)
// =====================================================================
async function buscarDadosAutenticados() {
    try {
        const status = await systemTokenService.statusToken();
        if (!status.disponivel) return null;

        // Tentar buscar dados premium do time do admin
        const resultado = await systemTokenService.fazerRequisicaoAutenticada('/auth/time');
        if (!resultado.success) return null;

        console.log('[ASSISTENTE] Dados autenticados obtidos via token de sistema');
        return resultado.data;
    } catch (error) {
        console.log('[ASSISTENTE] Dados autenticados indisponiveis:', error.message);
        return null;
    }
}

// =====================================================================
// CONTEXTO DO PARTICIPANTE (time atual vs sugestoes)
// =====================================================================
async function buscarContextoParticipante(timeId) {
    try {
        const resp = await axios.get(`https://api.cartola.globo.com/time/id/${timeId}`, {
            timeout: 10000,
        });

        if (!resp.data) return null;

        const time = resp.data;
        return {
            timeId,
            nomeTime: time.time?.nome || 'N/D',
            nomeCartola: time.time?.nome_cartola || 'N/D',
            patrimonio: time.patrimonio || 0,
            pontosCampeonato: time.pontos_campeonato || 0,
            rodadaAtual: time.rodada_atual || 0,
            atletas: (time.atletas || []).map(a => ({
                atletaId: a.atleta_id,
                nome: a.apelido || a.nome,
                posicaoId: a.posicao_id,
                clubeId: a.clube_id,
                media: a.media_num || 0,
                preco: a.preco_num || 0,
            })),
            esquemaId: time.esquema_id || 3,
        };
    } catch (error) {
        console.error(`[ASSISTENTE] Erro ao buscar contexto do time ${timeId}:`, error.message);
        return null;
    }
}

// =====================================================================
// LISTAR FONTES DISPONIVEIS
// =====================================================================
async function listarFontesDisponiveis() {
    const fontes = [
        { id: 'cartola-api', nome: 'Cartola FC API', status: 'ativa', tipo: 'primaria' },
    ];

    // Verificar se gato_mestre esta retornando dados
    try {
        const mercado = await buscarMercadoEnriquecido();
        const comGatoMestre = mercado.atletas.filter(a => a.gato_mestre).length;
        fontes.push({
            id: 'gato-mestre',
            nome: 'GatoMestre (API)',
            status: comGatoMestre > 0 ? 'ativa' : 'sem-dados',
            tipo: 'enriquecimento',
            atletasComDados: comGatoMestre,
        });
    } catch { /* silencioso */ }

    // Verificar partidas
    try {
        const partidas = await buscarPartidas();
        fontes.push({
            id: 'partidas',
            nome: 'Confrontos Rodada',
            status: Object.keys(partidas).length > 0 ? 'ativa' : 'sem-dados',
            tipo: 'contexto',
        });
    } catch { /* silencioso */ }

    // Verificar cedidos
    try {
        const cedidos = await buscarCedidosPorClube();
        fontes.push({
            id: 'confrontos',
            nome: 'Defesas Vulneraveis',
            status: Object.keys(cedidos).length > 0 ? 'ativa' : 'sem-dados',
            tipo: 'analise',
        });
    } catch { /* silencioso */ }

    // Token de sistema (Fase 2)
    try {
        const tokenStatus = await systemTokenService.statusToken();
        fontes.push({
            id: 'auth-premium',
            nome: 'Endpoints Autenticados',
            status: tokenStatus.disponivel ? 'ativa' : 'sem-token',
            tipo: 'premium',
            email: tokenStatus.email,
        });
    } catch {
        fontes.push({ id: 'auth-premium', nome: 'Endpoints Autenticados', status: 'erro', tipo: 'premium' });
    }

    // Odds (Fase 3)
    try {
        const oddsData = await bettingOddsService.buscarOdds();
        fontes.push({
            id: 'odds',
            nome: 'Odds de Apostas',
            status: oddsData && Object.keys(oddsData).length > 0 ? 'ativa' : process.env.ODDS_API_KEY ? 'sem-dados' : 'sem-apikey',
            tipo: 'externo',
        });
    } catch {
        fontes.push({ id: 'odds', nome: 'Odds de Apostas', status: 'erro', tipo: 'externo' });
    }

    // Cartola FC Brasil scraper (Fase 3)
    try {
        const disponibilidade = await cartolaFCBrasilScraper.verificarDisponibilidade();
        fontes.push({
            id: 'cartola-fc-brasil',
            nome: 'Cartola FC Brasil',
            status: disponibilidade.disponivel ? 'ativa' : 'bloqueado',
            tipo: 'externo',
        });
    } catch {
        fontes.push({ id: 'cartola-fc-brasil', nome: 'Cartola FC Brasil', status: 'erro', tipo: 'externo' });
    }

    return fontes;
}

export default {
    gerarCenarios,
    buscarContextoParticipante,
    listarFontesDisponiveis,
    buscarPartidas,
    buscarCedidosPorClube,
};
