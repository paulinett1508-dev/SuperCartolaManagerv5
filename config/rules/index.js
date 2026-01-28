/**
 * CONFIG/RULES - Sistema de Regras de Negócio (Strategy Pattern)
 *
 * Este módulo centraliza todas as regras de negócio do Super Cartola.
 * Cada arquivo JSON define as regras de uma disputa específica.
 *
 * @version 1.0.0
 * @author Sistema Super Cartola
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Carrega um arquivo JSON de regras
 */
function loadRule(filename) {
    try {
        const filePath = join(__dirname, filename);
        const content = readFileSync(filePath, 'utf-8');
        return JSON.parse(content);
    } catch (error) {
        console.error(`[RULES] Erro ao carregar ${filename}:`, error.message);
        return null;
    }
}

// =============================================================================
// REGRAS BÁSICAS
// =============================================================================

/** Extrato Financeiro - Controle de saldo e transações */
export const extrato = loadRule('extrato.json');

/** Ranking Geral - Acumulado total */
export const rankingGeral = loadRule('ranking_geral.json');

/** Ranking da Rodada (BANCO) - Bônus/ônus por posição */
export const rankingRodada = loadRule('ranking_rodada.json');

// =============================================================================
// REGRAS DE CONFRONTO
// =============================================================================

/** Pontos Corridos - Confrontos 1x1 */
export const pontosCorridos = loadRule('pontos_corridos.json');

/** Mata-Mata - Eliminatórias */
export const mataMata = loadRule('mata_mata.json');

// =============================================================================
// REGRAS ESTATÍSTICAS
// =============================================================================

/** Top 10 Mitos/Micos - Ranking histórico extremos */
export const top10 = loadRule('top_10.json');

/** Melhor do Mês - Ranking por período */
export const melhorMes = loadRule('melhor_mes.json');

/** Turno e Returno - Ranking por turno */
export const turnoReturno = loadRule('turno_returno.json');

// =============================================================================
// REGRAS ESPECIAIS
// =============================================================================

/** Luva de Ouro - Ranking de goleiros */
export const luvaOuro = loadRule('luva_ouro.json');

/** Artilheiro Campeão - Ranking de gols */
export const artilheiro = loadRule('artilheiro.json');

/** Capitão de Luxo - Ranking de capitães */
export const capitaoLuxo = loadRule('capitao_luxo.json');

// =============================================================================
// REGRAS NOVAS (PLANEJADAS)
// =============================================================================

/** Tiro Certo - Acertar faixas de pontuação */
export const tiroCerto = loadRule('tiro_certo.json');

/** Resta Um - Eliminação progressiva */
export const restaUm = loadRule('resta_um.json');

// =============================================================================
// EXPORTAÇÕES AGRUPADAS
// =============================================================================

/**
 * Todas as regras disponíveis
 */
export const allRules = {
    // Básicas
    extrato,
    rankingGeral,
    rankingRodada,

    // Confronto
    pontosCorridos,
    mataMata,

    // Estatísticas
    top10,
    melhorMes,
    turnoReturno,

    // Especiais
    luvaOuro,
    artilheiro,
    capitaoLuxo,

    // Planejadas
    tiroCerto,
    restaUm,
};

/**
 * Busca regra por ID
 * @param {string} ruleId - ID da regra (ex: 'mata_mata', 'top_10')
 * @returns {Object|null} Configuração da regra ou null se não encontrada
 */
export function getRuleById(ruleId) {
    const mapping = {
        'extrato': extrato,
        'ranking_geral': rankingGeral,
        'ranking_rodada': rankingRodada,
        'pontos_corridos': pontosCorridos,
        'mata_mata': mataMata,
        'top_10': top10,
        'melhor_mes': melhorMes,
        'turno_returno': turnoReturno,
        'luva_ouro': luvaOuro,
        'artilheiro': artilheiro,
        'capitao_luxo': capitaoLuxo,
        'tiro_certo': tiroCerto,
        'resta_um': restaUm,
    };

    return mapping[ruleId] || null;
}

/**
 * Lista todas as regras ativas
 * @returns {Array} Lista de regras com status 'ativo'
 */
export function getActiveRules() {
    return Object.values(allRules).filter(rule => rule?.status === 'ativo');
}

/**
 * Lista regras habilitadas para uma liga específica
 * @param {string} ligaId - ID da liga
 * @returns {Array} Lista de regras habilitadas para a liga
 */
export function getRulesForLiga(ligaId) {
    return Object.values(allRules).filter(rule =>
        rule?.configuracao?.ligas_habilitadas?.includes(ligaId)
    );
}

/**
 * Busca tabela financeira de uma regra
 * @param {string} ruleId - ID da regra
 * @param {string} ligaId - ID da liga
 * @returns {Object|null} Tabela financeira da regra para a liga
 */
export function getFinanceiroForRule(ruleId, ligaId) {
    const rule = getRuleById(ruleId);
    if (!rule?.financeiro) return null;

    // Algumas regras têm financeiro por liga
    if (rule.financeiro[ligaId]) {
        return rule.financeiro[ligaId];
    }

    // Outras têm financeiro geral
    return rule.financeiro;
}

export default {
    allRules,
    getRuleById,
    getActiveRules,
    getRulesForLiga,
    getFinanceiroForRule,

    // Exports individuais para conveniência
    extrato,
    rankingGeral,
    rankingRodada,
    pontosCorridos,
    mataMata,
    top10,
    melhorMes,
    turnoReturno,
    luvaOuro,
    artilheiro,
    capitaoLuxo,
    tiroCerto,
    restaUm,
};

console.log('[RULES] ✅ Sistema de Regras carregado - 13 módulos disponíveis');
