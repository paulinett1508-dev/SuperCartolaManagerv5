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
