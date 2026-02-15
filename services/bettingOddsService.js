/**
 * BETTING ODDS SERVICE v1.0
 * Integra probabilidades de apostas para enriquecer analise de atletas.
 *
 * Fonte: The-Odds-API (free tier 500 req/mes)
 * Dados: Probabilidade de resultado (vitoria/empate/derrota) por jogo
 *
 * Uso: Se o time do atleta tem alta probabilidade de vitoria,
 *      o atleta tem mais chances de pontuar bem (especialmente atacantes).
 *
 * IMPORTANTE: Este servico e OPCIONAL. Se falhar, o assistente
 *             continua funcionando com as outras fontes.
 */

import axios from "axios";
import NodeCache from "node-cache";

const cache = new NodeCache({ stdTTL: 3600 }); // 1 hora

// Mapeamento clubes Cartola -> nomes usados em odds APIs
const CLUBES_ODDS = {
    262: 'Flamengo', 263: 'Botafogo', 264: 'Corinthians', 265: 'Bahia',
    266: 'Fluminense', 275: 'Palmeiras', 276: 'São Paulo', 277: 'Santos',
    280: 'Vasco', 282: 'Atlético Mineiro', 283: 'Cruzeiro', 284: 'Grêmio',
    285: 'Internacional', 286: 'Atlético Paranaense', 287: 'Vitória',
    290: 'Goiás', 292: 'Sport', 293: 'Fortaleza', 315: 'Ceará',
    327: 'Bragantino', 354: 'Cuiabá', 356: 'Juventude',
    373: 'Mirassol', 1371: 'Novorizontino',
};

// =====================================================================
// BUSCAR ODDS DO BRASILEIRAO
// =====================================================================
async function buscarOdds() {
    const cacheKey = 'odds_brasileirao';
    const cached = cache.get(cacheKey);
    if (cached) {
        console.log('[ODDS] Dados obtidos do cache');
        return cached;
    }

    const apiKey = process.env.ODDS_API_KEY;
    if (!apiKey) {
        console.log('[ODDS] ODDS_API_KEY nao configurada, servico desativado');
        return null;
    }

    try {
        const resp = await axios.get('https://api.the-odds-api.com/v4/sports/soccer_brazil_campeonato/odds', {
            params: {
                apiKey,
                regions: 'us',
                markets: 'h2h',
                oddsFormat: 'decimal',
            },
            timeout: 10000,
        });

        if (!resp.data || !Array.isArray(resp.data)) {
            return null;
        }

        // Processar odds em formato util
        const oddsProcessadas = {};

        for (const jogo of resp.data) {
            const homeTeam = jogo.home_team;
            const awayTeam = jogo.away_team;

            // Pegar odds do primeiro bookmaker disponivel
            const bookmaker = jogo.bookmakers?.[0];
            if (!bookmaker) continue;

            const market = bookmaker.markets?.find(m => m.key === 'h2h');
            if (!market) continue;

            const outcomes = {};
            for (const o of market.outcomes) {
                if (o.name === homeTeam) outcomes.home = o.price;
                else if (o.name === awayTeam) outcomes.away = o.price;
                else outcomes.draw = o.price;
            }

            // Converter odds decimais em probabilidades implícitas
            const totalProb = (1 / (outcomes.home || 3)) + (1 / (outcomes.draw || 3.3)) + (1 / (outcomes.away || 3));
            const probHome = (1 / (outcomes.home || 3)) / totalProb;
            const probDraw = (1 / (outcomes.draw || 3.3)) / totalProb;
            const probAway = (1 / (outcomes.away || 3)) / totalProb;

            // Mapear para clube_ids do Cartola
            for (const [clubeId, clubeNome] of Object.entries(CLUBES_ODDS)) {
                if (homeTeam.includes(clubeNome) || clubeNome.includes(homeTeam)) {
                    oddsProcessadas[clubeId] = {
                        clubeNome,
                        probVitoria: Number(probHome.toFixed(3)),
                        probEmpate: Number(probDraw.toFixed(3)),
                        probDerrota: Number(probAway.toFixed(3)),
                        mandante: true,
                        adversario: awayTeam,
                    };
                } else if (awayTeam.includes(clubeNome) || clubeNome.includes(awayTeam)) {
                    oddsProcessadas[clubeId] = {
                        clubeNome,
                        probVitoria: Number(probAway.toFixed(3)),
                        probEmpate: Number(probDraw.toFixed(3)),
                        probDerrota: Number(probHome.toFixed(3)),
                        mandante: false,
                        adversario: homeTeam,
                    };
                }
            }
        }

        console.log(`[ODDS] ${Object.keys(oddsProcessadas).length} clubes com odds processadas`);
        cache.set(cacheKey, oddsProcessadas);
        return oddsProcessadas;

    } catch (error) {
        console.error('[ODDS] Erro ao buscar odds:', error.message);
        return null;
    }
}

// =====================================================================
// CALCULAR FATOR ODDS PARA ATLETA
// =====================================================================
function calcularFatorOdds(clubeId, posicaoId, oddsData) {
    if (!oddsData || !oddsData[clubeId]) return null;

    const odds = oddsData[clubeId];
    const probVitoria = odds.probVitoria || 0.33;

    // Quanto maior a probabilidade de vitoria, melhor para atacantes/meias
    // Para goleiros/zagueiros, empate/derrota pode significar mais defesas
    let fator = 1.0;

    if (posicaoId === 5) {
        // Atacante: forte correlacao com vitoria do time
        fator = 0.85 + (probVitoria * 0.45);
    } else if (posicaoId === 4) {
        // Meia: correlacao moderada com vitoria
        fator = 0.9 + (probVitoria * 0.3);
    } else if (posicaoId === 1 || posicaoId === 3) {
        // Goleiro/Zagueiro: inversamente correlacionado (mais defesas em jogos dificeis)
        // Mas SG (sem gol) favorece times favoritos
        fator = 0.95 + (probVitoria * 0.15);
    } else if (posicaoId === 2) {
        // Lateral: balanced
        fator = 0.92 + (probVitoria * 0.2);
    } else {
        // Tecnico: correlacao forte com vitoria
        fator = 0.85 + (probVitoria * 0.4);
    }

    return {
        fator: Number(fator.toFixed(3)),
        probVitoria: odds.probVitoria,
        probEmpate: odds.probEmpate,
        adversario: odds.adversario,
        fonte: 'odds',
    };
}

export default {
    buscarOdds,
    calcularFatorOdds,
};
