// routes/noticias-time-routes.js
// v1.2 - Notícias personalizadas do time do coração
// Busca notícias via Google News RSS por clube (sem API key)
// Cache inteligente: 30min por clube
// v1.2: Adiciona extração de thumbnails (<media:thumbnail> e <enclosure>)
import express from 'express';
import fetch from 'node-fetch';
import { CLUBES as CLUBES_NOTICIAS } from '../public/js/shared/clubes-data.js';

const router = express.Router();

// Cache em memória: { [clubeId]: { noticias, timestamp } }
const cacheNoticias = {};
const CACHE_TTL = 30 * 60 * 1000; // 30 minutos

/**
 * Extrai texto limpo de um possível CDATA ou HTML
 */
function limparTexto(texto) {
    if (!texto) return '';
    return texto
        .replace(/<!\[CDATA\[/g, '')
        .replace(/\]\]>/g, '')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .trim();
}

/**
 * Parse simples de XML RSS (sem dependência externa)
 * Extrai items do feed RSS do Google News
 */
function parseRSSItems(xml) {
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
        const itemXml = match[1];

        const titulo = limparTexto(extrairTag(itemXml, 'title'));
        const link = limparTexto(extrairTag(itemXml, 'link'));
        const pubDate = limparTexto(extrairTag(itemXml, 'pubDate'));
        const fonte = limparTexto(extrairTag(itemXml, 'source'));
        const descricao = limparTexto(extrairTag(itemXml, 'description'));

        // NOTA: Google News RSS não fornece <media:thumbnail> ou <enclosure> nos items
        // Apenas o canal tem <image>, mas não os items individuais
        // Alternativas futuras:
        // 1. Scraping das URLs (complexo, lento, frágil)
        // 2. API paga (NewsAPI, Globo Esporte API)
        // 3. Usar escudo do clube como fallback visual (atual)
        const imagem = null;

        if (titulo && link) {
            items.push({
                titulo,
                link,
                fonte,
                descricao: descricao.substring(0, 200),
                publicadoEm: pubDate ? new Date(pubDate).toISOString() : null,
                tempoRelativo: pubDate ? calcularTempoRelativo(new Date(pubDate)) : null,
                imagem
            });
        }
    }

    return items;
}

/**
 * Extrai conteúdo de uma tag XML
 */
function extrairTag(xml, tagName) {
    // Tenta com CDATA primeiro
    const cdataRegex = new RegExp(`<${tagName}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tagName}>`, 'i');
    const cdataMatch = xml.match(cdataRegex);
    if (cdataMatch) return cdataMatch[1];

    // Tenta sem CDATA
    const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1] : '';
}

/**
 * Calcula tempo relativo (ex: "há 2h", "há 30min")
 */
function calcularTempoRelativo(data) {
    const agora = new Date();
    const diff = agora - data;
    const minutos = Math.floor(diff / 60000);
    const horas = Math.floor(diff / 3600000);
    const dias = Math.floor(diff / 86400000);

    if (minutos < 1) return 'agora';
    if (minutos < 60) return `há ${minutos}min`;
    if (horas < 24) return `há ${horas}h`;
    if (dias === 1) return 'ontem';
    if (dias < 7) return `há ${dias} dias`;
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

/**
 * Busca notícias do Google News RSS para um clube
 */
async function buscarNoticiasClube(clubeId) {
    const clube = CLUBES_NOTICIAS[Number(clubeId)];
    if (!clube) {
        return { noticias: [], clube: null, erro: 'Clube não encontrado' };
    }

    // Verificar cache
    const cached = cacheNoticias[clubeId];
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        return { noticias: cached.noticias, clube: clube.nome, cache: true };
    }

    try {
        const query = encodeURIComponent(clube.busca);
        const url = `https://news.google.com/rss/search?q=${query}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;

        console.log(`[NOTICIAS] Buscando notícias para ${clube.nome} (ID: ${clubeId})...`);

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; SuperCartolaManager/1.0)',
                'Accept': 'application/rss+xml, application/xml, text/xml'
            },
            timeout: 10000
        });

        if (!response.ok) {
            console.error(`[NOTICIAS] Erro HTTP ${response.status} ao buscar notícias de ${clube.nome}`);
            // Retornar cache stale se disponível
            if (cached) {
                return { noticias: cached.noticias, clube: clube.nome, cache: true, stale: true };
            }
            return { noticias: [], clube: clube.nome, erro: 'Falha ao buscar notícias' };
        }

        const xml = await response.text();
        const noticias = parseRSSItems(xml).slice(0, 10); // Máximo 10 notícias

        console.log(`[NOTICIAS] ${noticias.length} notícias encontradas para ${clube.nome}`);

        // Atualizar cache
        cacheNoticias[clubeId] = {
            noticias,
            timestamp: Date.now()
        };

        return { noticias, clube: clube.nome, cache: false };
    } catch (error) {
        console.error(`[NOTICIAS] Erro ao buscar notícias de ${clube.nome}:`, error.message);

        // Retornar cache stale se disponível
        if (cached) {
            return { noticias: cached.noticias, clube: clube.nome, cache: true, stale: true };
        }
        return { noticias: [], clube: clube.nome, erro: error.message };
    }
}

// ┌──────────────────────────────────────────────────────────────────────┐
// │ ROTAS                                                                │
// └──────────────────────────────────────────────────────────────────────┘

/**
 * GET /api/noticias/time/:clubeId
 * Retorna notícias personalizadas para um clube específico
 */
router.get('/time/:clubeId', async (req, res) => {
    try {
        const { clubeId } = req.params;

        if (!clubeId || isNaN(clubeId)) {
            return res.status(400).json({ success: false, erro: 'clubeId inválido' });
        }

        const resultado = await buscarNoticiasClube(clubeId);

        res.json({
            success: true,
            clubeId: Number(clubeId),
            clube: resultado.clube,
            noticias: resultado.noticias,
            total: resultado.noticias.length,
            cache: resultado.cache || false,
            stale: resultado.stale || false,
            atualizadoEm: new Date().toISOString()
        });
    } catch (error) {
        console.error('[NOTICIAS] Erro na rota:', error);
        res.status(500).json({ success: false, erro: 'Erro ao buscar notícias' });
    }
});

/**
 * GET /api/noticias/clubes
 * Lista todos os clubes disponíveis para notícias
 */
router.get('/clubes', (req, res) => {
    const clubes = Object.entries(CLUBES_NOTICIAS).map(([id, info]) => ({
        id: Number(id),
        nome: info.nome,
        slug: info.slug
    }));

    res.json({ success: true, clubes, total: clubes.length });
});

/**
 * GET /api/noticias/cache/status
 * Status do cache de notícias
 */
router.get('/cache/status', (req, res) => {
    const status = Object.entries(cacheNoticias).map(([clubeId, cache]) => ({
        clubeId: Number(clubeId),
        clube: CLUBES_NOTICIAS[Number(clubeId)]?.nome || 'Desconhecido',
        noticias: cache.noticias.length,
        idadeMinutos: Math.round((Date.now() - cache.timestamp) / 60000),
        valido: (Date.now() - cache.timestamp) < CACHE_TTL
    }));

    res.json({
        success: true,
        caches: status,
        ttlMinutos: CACHE_TTL / 60000
    });
});

export default router;
