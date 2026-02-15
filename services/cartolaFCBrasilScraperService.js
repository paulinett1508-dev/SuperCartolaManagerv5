/**
 * CARTOLA FC BRASIL SCRAPER SERVICE v1.0
 * Scraping do site cartolafcbrasil.com.br (SSR ASP.NET)
 *
 * Extrai tabelas de scouts por posicao e rodada.
 * Usado como cross-reference para validar recomendacoes do assistente.
 *
 * IMPORTANTE: Este servico e OPCIONAL e FRAGIL.
 * Se Cloudflare bloquear, o assistente continua funcionando.
 * Todas as chamadas sao feitas com Promise.allSettled.
 */

import axios from "axios";
import * as cheerio from "cheerio";
import NodeCache from "node-cache";

const cache = new NodeCache({ stdTTL: 1800 }); // 30 min

const BASE_URL = 'https://www.cartolafcbrasil.com.br';

// User agents para rotacao (reduz chance de bloqueio CF)
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

function getRandomUA() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// =====================================================================
// BUSCAR SCOUTS DA TEMPORADA
// =====================================================================
async function buscarScouts(temporada = 2026) {
    const cacheKey = `fcbrasil_scouts_${temporada}`;
    const cached = cache.get(cacheKey);
    if (cached) {
        console.log('[FCBrasil] Scouts obtidos do cache');
        return cached;
    }

    try {
        const url = `${BASE_URL}/scouts/cartola-fc-${temporada}`;
        console.log(`[FCBrasil] Buscando scouts em ${url}...`);

        const resp = await axios.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': getRandomUA(),
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
                'Referer': BASE_URL,
            },
        });

        if (resp.status !== 200) {
            console.warn(`[FCBrasil] Status ${resp.status}`);
            return null;
        }

        const $ = cheerio.load(resp.data);
        const scouts = [];

        // Tentar extrair dados de tabelas de scouts
        $('table').each((i, table) => {
            const headers = [];
            $(table).find('thead th, tr:first-child th').each((j, th) => {
                headers.push($(th).text().trim());
            });

            if (headers.length < 3) return; // Tabela irrelevante

            $(table).find('tbody tr').each((j, tr) => {
                const cells = [];
                $(tr).find('td').each((k, td) => {
                    cells.push($(td).text().trim());
                });

                if (cells.length >= 3) {
                    const scout = {};
                    headers.forEach((h, idx) => {
                        if (idx < cells.length) {
                            scout[h] = cells[idx];
                        }
                    });
                    scouts.push(scout);
                }
            });
        });

        // Tentar extrair links de rodadas
        const rodadaLinks = [];
        $('a[href*="rodada"]').each((i, a) => {
            const href = $(a).attr('href');
            const text = $(a).text().trim();
            if (href && text) {
                rodadaLinks.push({ href, text });
            }
        });

        const resultado = {
            temporada,
            scouts,
            rodadaLinks,
            scrapedAt: new Date().toISOString(),
            fonte: 'cartolafcbrasil.com.br',
        };

        if (scouts.length > 0) {
            cache.set(cacheKey, resultado);
            console.log(`[FCBrasil] ${scouts.length} scouts extraidos`);
        } else {
            console.log('[FCBrasil] Nenhum scout extraido (possivel Cloudflare ou layout mudou)');
        }

        return resultado;

    } catch (error) {
        if (error.response?.status === 403) {
            console.warn('[FCBrasil] Bloqueado pelo Cloudflare (403)');
        } else {
            console.error('[FCBrasil] Erro ao buscar scouts:', error.message);
        }
        return null;
    }
}

// =====================================================================
// BUSCAR DICAS DA RODADA
// =====================================================================
async function buscarDicasRodada(temporada = 2026, rodada) {
    const cacheKey = `fcbrasil_dicas_${temporada}_${rodada}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
        const url = `${BASE_URL}/scouts/cartola-fc-${temporada}/rodada-${rodada}`;
        console.log(`[FCBrasil] Buscando dicas rodada ${rodada}...`);

        const resp = await axios.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': getRandomUA(),
                'Accept': 'text/html,application/xhtml+xml',
                'Referer': `${BASE_URL}/scouts/cartola-fc-${temporada}`,
            },
        });

        const $ = cheerio.load(resp.data);
        const dicas = [];

        // Extrair cards de dicas (se existirem)
        $('[class*="jogador"], [class*="dica"], [class*="scout"]').each((i, el) => {
            const nome = $(el).find('[class*="nome"]').text().trim();
            const posicao = $(el).find('[class*="posicao"]').text().trim();
            const clube = $(el).find('[class*="clube"]').text().trim();

            if (nome) {
                dicas.push({ nome, posicao, clube });
            }
        });

        // Fallback: extrair de tabelas
        if (dicas.length === 0) {
            $('table tbody tr').each((i, tr) => {
                const cells = [];
                $(tr).find('td').each((j, td) => {
                    cells.push($(td).text().trim());
                });
                if (cells.length >= 2) {
                    dicas.push({ dados: cells });
                }
            });
        }

        const resultado = {
            temporada,
            rodada,
            dicas,
            scrapedAt: new Date().toISOString(),
            fonte: 'cartolafcbrasil.com.br',
        };

        if (dicas.length > 0) {
            cache.set(cacheKey, resultado, 3600); // 1h
        }

        return resultado;

    } catch (error) {
        if (error.response?.status === 403) {
            console.warn('[FCBrasil] Bloqueado pelo Cloudflare');
        }
        return null;
    }
}

// =====================================================================
// STATUS DO SCRAPER
// =====================================================================
async function verificarDisponibilidade() {
    try {
        const resp = await axios.head(BASE_URL, {
            timeout: 5000,
            headers: { 'User-Agent': getRandomUA() },
        });
        return { disponivel: true, status: resp.status };
    } catch (error) {
        return {
            disponivel: false,
            status: error.response?.status || 'ERRO',
            erro: error.message,
        };
    }
}

export default {
    buscarScouts,
    buscarDicasRodada,
    verificarDisponibilidade,
};
