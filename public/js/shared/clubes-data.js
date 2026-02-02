// =====================================================================
// clubes-data.js - Fonte única de verdade para IDs de clubes
// =====================================================================
// IDs oficiais da API Cartola FC (https://api.cartola.globo.com/clubes)
// Usado por: backend (routes, services) e frontend (módulos ES)
//
// IMPORTANTE: Este arquivo é a ÚNICA fonte de mapeamento clube_id → nome.
// Nunca duplique este mapeamento em outros arquivos.
// =====================================================================

export const CLUBES = {
    // ─── Série A 2025/2026 ───
    262:  { nome: 'Flamengo',      slug: 'flamengo',      busca: 'Flamengo futebol' },
    263:  { nome: 'Botafogo',      slug: 'botafogo',      busca: 'Botafogo futebol' },
    264:  { nome: 'Corinthians',   slug: 'corinthians',   busca: 'Corinthians futebol' },
    265:  { nome: 'Bahia',         slug: 'bahia',         busca: 'Bahia futebol' },
    266:  { nome: 'Fluminense',    slug: 'fluminense',    busca: 'Fluminense futebol' },
    267:  { nome: 'Vasco',         slug: 'vasco',         busca: 'Vasco da Gama futebol' },
    275:  { nome: 'Palmeiras',     slug: 'palmeiras',     busca: 'Palmeiras futebol' },
    276:  { nome: 'São Paulo',     slug: 'sao-paulo',     busca: 'São Paulo FC futebol' },
    277:  { nome: 'Santos',        slug: 'santos',        busca: 'Santos FC futebol' },
    280:  { nome: 'Bragantino',    slug: 'bragantino',    busca: 'Red Bull Bragantino futebol' },
    282:  { nome: 'Atlético-MG',   slug: 'atletico-mg',   busca: 'Atlético Mineiro futebol' },
    283:  { nome: 'Cruzeiro',      slug: 'cruzeiro',      busca: 'Cruzeiro futebol' },
    284:  { nome: 'Grêmio',        slug: 'gremio',        busca: 'Grêmio futebol' },
    285:  { nome: 'Internacional',  slug: 'internacional', busca: 'Internacional futebol' },
    286:  { nome: 'Juventude',     slug: 'juventude',     busca: 'Juventude RS futebol' },
    287:  { nome: 'Vitória',       slug: 'vitoria',       busca: 'Vitória BA futebol' },
    290:  { nome: 'Goiás',         slug: 'goias',         busca: 'Goiás futebol' },
    292:  { nome: 'Sport',         slug: 'sport',         busca: 'Sport Recife futebol' },
    293:  { nome: 'Athletico-PR',  slug: 'athletico-pr',  busca: 'Athletico Paranaense futebol' },
    354:  { nome: 'Ceará',         slug: 'ceara',         busca: 'Ceará Sporting futebol' },
    356:  { nome: 'Fortaleza',     slug: 'fortaleza',     busca: 'Fortaleza EC futebol' },
    1371: { nome: 'Cuiabá',        slug: 'cuiaba',        busca: 'Cuiabá MT futebol' },
    2305: { nome: 'Mirassol',      slug: 'mirassol',      busca: 'Mirassol futebol' },
    // ─── Outros times populares ───
    270:  { nome: 'Coritiba',      slug: 'coritiba',      busca: 'Coritiba futebol' },
    273:  { nome: 'América-MG',    slug: 'america-mg',    busca: 'América Mineiro futebol' },
    274:  { nome: 'Chapecoense',   slug: 'chapecoense',   busca: 'Chapecoense futebol' },
    288:  { nome: 'Ponte Preta',   slug: 'ponte-preta',   busca: 'Ponte Preta futebol' },
    315:  { nome: 'Novorizontino', slug: 'novorizontino', busca: 'Novorizontino futebol' },
    344:  { nome: 'Santa Cruz',    slug: 'santa-cruz',    busca: 'Santa Cruz PE futebol' },
    373:  { nome: 'CRB',           slug: 'crb',           busca: 'CRB Alagoas futebol' },
};

/**
 * Cores dos clubes para personalização da UI (scrollbar, destaques)
 * cor1 = cor primária do escudo, cor2 = cor secundária
 * Nota: preto puro (#000) é substituído por #2a2a2a para visibilidade no dark mode
 */
export const CLUBES_CORES = {
    // ─── Série A 2025/2026 ───
    262:  { cor1: '#c4161c', cor2: '#1a1a1a' },   // Flamengo (Vermelho + Preto)
    263:  { cor1: '#2a2a2a', cor2: '#ffffff' },     // Botafogo (Preto + Branco)
    264:  { cor1: '#2a2a2a', cor2: '#ffffff' },     // Corinthians (Preto + Branco)
    265:  { cor1: '#0056a8', cor2: '#e42527' },     // Bahia (Azul + Vermelho)
    266:  { cor1: '#8b0042', cor2: '#006633' },     // Fluminense (Grená + Verde)
    267:  { cor1: '#2a2a2a', cor2: '#ffffff' },     // Vasco (Preto + Branco)
    275:  { cor1: '#006437', cor2: '#ffffff' },     // Palmeiras (Verde + Branco)
    276:  { cor1: '#e42527', cor2: '#2a2a2a' },     // São Paulo (Vermelho + Preto)
    277:  { cor1: '#2a2a2a', cor2: '#ffffff' },     // Santos (Preto + Branco)
    280:  { cor1: '#e42527', cor2: '#ffffff' },     // Bragantino (Vermelho + Branco)
    282:  { cor1: '#2a2a2a', cor2: '#ffffff' },     // Atlético-MG (Preto + Branco)
    283:  { cor1: '#003399', cor2: '#ffffff' },     // Cruzeiro (Azul Royal + Branco)
    284:  { cor1: '#0c2340', cor2: '#75c4e2' },     // Grêmio (Azul Escuro + Celeste)
    285:  { cor1: '#e42527', cor2: '#ffffff' },     // Internacional (Vermelho + Branco)
    286:  { cor1: '#006633', cor2: '#ffffff' },     // Juventude (Verde + Branco)
    287:  { cor1: '#e42527', cor2: '#2a2a2a' },     // Vitória (Vermelho + Preto)
    290:  { cor1: '#006633', cor2: '#ffffff' },     // Goiás (Verde + Branco)
    292:  { cor1: '#e42527', cor2: '#2a2a2a' },     // Sport (Vermelho + Preto)
    293:  { cor1: '#c4161c', cor2: '#2a2a2a' },     // Athletico-PR (Vermelho + Preto)
    354:  { cor1: '#2a2a2a', cor2: '#ffffff' },     // Ceará (Preto + Branco)
    356:  { cor1: '#003399', cor2: '#e42527' },     // Fortaleza (Azul + Vermelho)
    1371: { cor1: '#006633', cor2: '#ffd700' },     // Cuiabá (Verde + Dourado)
    2305: { cor1: '#ffd700', cor2: '#006633' },     // Mirassol (Amarelo + Verde)
    // ─── Outros times populares ───
    270:  { cor1: '#006633', cor2: '#ffffff' },     // Coritiba (Verde + Branco)
    273:  { cor1: '#006633', cor2: '#ffffff' },     // América-MG (Verde + Branco)
    274:  { cor1: '#006633', cor2: '#ffffff' },     // Chapecoense (Verde + Branco)
    288:  { cor1: '#2a2a2a', cor2: '#ffffff' },     // Ponte Preta (Preto + Branco)
    315:  { cor1: '#ffd700', cor2: '#2a2a2a' },     // Novorizontino (Amarelo + Preto)
    344:  { cor1: '#e42527', cor2: '#2a2a2a' },     // Santa Cruz (Vermelho + Preto)
    373:  { cor1: '#e42527', cor2: '#ffffff' },     // CRB (Vermelho + Branco)
};

/**
 * Retorna as cores do clube pelo ID
 * @param {number|string} clubeId
 * @returns {{ cor1: string, cor2: string } | null}
 */
export function getCoresClubeById(clubeId) {
    return CLUBES_CORES[Number(clubeId)] || null;
}

/**
 * Retorna o nome do clube pelo ID
 * @param {number|string} clubeId
 * @returns {string}
 */
export function getNomeClube(clubeId) {
    return CLUBES[Number(clubeId)]?.nome || null;
}

/**
 * Retorna o mapeamento simples { id: nome } para uso rápido
 * @returns {Object<number, string>}
 */
export function getClubesNomeMap() {
    const map = {};
    for (const [id, info] of Object.entries(CLUBES)) {
        map[Number(id)] = info.nome;
    }
    return map;
}
