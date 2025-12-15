/**
 * CONFIG/DEFINITIONS - Camada de Definição de Produto (SaaS)
 *
 * Este módulo centraliza todas as definições de módulos configuráveis
 * para o Wizard de Criação de Liga no Admin.
 *
 * Cada arquivo JSON define:
 * - Parâmetros configuráveis pelo Admin
 * - Restrições e validações
 * - Valores default
 * - Metadados do módulo
 *
 * @version 1.0.0
 * @author Product Team
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Carrega um arquivo JSON de definição
 */
function loadDefinition(filename) {
    try {
        const filePath = join(__dirname, filename);
        const content = readFileSync(filePath, 'utf-8');
        return JSON.parse(content);
    } catch (error) {
        console.error(`[DEFINITIONS] Erro ao carregar ${filename}:`, error.message);
        return null;
    }
}

// =============================================================================
// MÓDULOS BASE (Obrigatórios)
// =============================================================================

/** Ranking Geral - Base do campeonato */
export const rankingGeral = loadDefinition('ranking_geral_def.json');

/** Ranking da Rodada - Sistema de zonas G/Z */
export const rankingRodada = loadDefinition('ranking_rodada_def.json');

// =============================================================================
// MÓDULOS DE CONFRONTO
// =============================================================================

/** Pontos Corridos - Todos contra todos */
export const pontosCorridos = loadDefinition('pontos_corridos_def.json');

/** Mata-Mata - Eliminatórias */
export const mataMata = loadDefinition('mata_mata_def.json');

// =============================================================================
// MÓDULOS ESTATÍSTICOS
// =============================================================================

/** Ligas Mensais / Melhor do Mês */
export const ligasMensais = loadDefinition('ligas_mensais_def.json');

/** Turno e Returno */
export const turnoReturno = loadDefinition('turno_returno_def.json');

/** Top 10 Mitos e Micos */
export const top10 = loadDefinition('top_10_def.json');

/** Capitão de Luxo */
export const capitaoLuxo = loadDefinition('capitao_luxo_def.json');

/** Luva de Ouro (Defesa) */
export const luvaOuro = loadDefinition('luva_ouro_def.json');

/** Artilheiro Campeão (Ataque) */
export const artilheiro = loadDefinition('artilheiro_def.json');

/** Liga Patrimônio (Cartoletas) */
export const ligaPatrimonio = loadDefinition('liga_patrimonio_def.json');

// =============================================================================
// MÓDULOS SURVIVAL
// =============================================================================

/** Tiro Certo - Palpites de resultados reais */
export const tiroCerto = loadDefinition('tiro_certo_def.json');

/** Resta Um - Eliminação progressiva */
export const restaUm = loadDefinition('resta_um_def.json');

// =============================================================================
// EXPORTAÇÕES AGRUPADAS
// =============================================================================

/**
 * Todas as definições disponíveis
 */
export const allDefinitions = {
    // Base
    rankingGeral,
    rankingRodada,

    // Confronto
    pontosCorridos,
    mataMata,

    // Estatísticos
    ligasMensais,
    turnoReturno,
    top10,
    capitaoLuxo,
    luvaOuro,
    artilheiro,
    ligaPatrimonio,

    // Survival
    tiroCerto,
    restaUm,
};

/**
 * Definições agrupadas por categoria
 */
export const definitionsByCategory = {
    base: [rankingGeral, rankingRodada],
    confronto: [pontosCorridos, mataMata],
    estatistico: [ligasMensais, turnoReturno, top10, capitaoLuxo, luvaOuro, artilheiro, ligaPatrimonio],
    survival: [tiroCerto, restaUm],
};

/**
 * Busca definição por ID
 * @param {string} moduleId - ID do módulo (ex: 'mata_mata', 'top_10')
 * @returns {Object|null} Definição do módulo ou null se não encontrada
 */
export function getDefinitionById(moduleId) {
    const mapping = {
        'ranking_geral': rankingGeral,
        'ranking_rodada': rankingRodada,
        'pontos_corridos': pontosCorridos,
        'mata_mata': mataMata,
        'ligas_mensais': ligasMensais,
        'turno_returno': turnoReturno,
        'top_10': top10,
        'capitao_luxo': capitaoLuxo,
        'luva_ouro': luvaOuro,
        'artilheiro': artilheiro,
        'liga_patrimonio': ligaPatrimonio,
        'tiro_certo': tiroCerto,
        'resta_um': restaUm,
    };

    return mapping[moduleId] || null;
}

/**
 * Lista módulos obrigatórios
 * @returns {Array} Lista de definições obrigatórias
 */
export function getRequiredModules() {
    return Object.values(allDefinitions).filter(def => def?.obrigatorio === true);
}

/**
 * Lista módulos opcionais
 * @returns {Array} Lista de definições opcionais
 */
export function getOptionalModules() {
    return Object.values(allDefinitions).filter(def => def?.obrigatorio === false);
}

/**
 * Lista módulos por status
 * @param {string} status - 'ativo', 'planejado', etc.
 * @returns {Array} Lista de definições com o status especificado
 */
export function getModulesByStatus(status) {
    return Object.values(allDefinitions).filter(def => def?.status === status);
}

/**
 * Valida configuração de liga contra as definições
 * @param {Object} ligaConfig - Configuração da liga
 * @param {string} moduleId - ID do módulo
 * @returns {Object} { valid: boolean, errors: string[], warnings: string[] }
 */
export function validateLigaConfig(ligaConfig, moduleId) {
    const def = getDefinitionById(moduleId);
    if (!def) {
        return { valid: false, errors: [`Módulo '${moduleId}' não encontrado`], warnings: [] };
    }

    const errors = [];
    const warnings = [];
    const participantes = ligaConfig.participantes?.length || 0;

    // Validar restrições
    if (def.restricoes) {
        const { min_participantes, max_participantes, ideal_participantes } = def.restricoes;

        if (min_participantes && participantes < min_participantes) {
            errors.push(`${def.nome} requer no mínimo ${min_participantes} participantes`);
        }

        if (max_participantes && participantes > max_participantes) {
            errors.push(`${def.nome} permite no máximo ${max_participantes} participantes`);
        }

        if (ideal_participantes && !ideal_participantes.includes(participantes)) {
            warnings.push(`${def.nome} funciona melhor com ${ideal_participantes.join(', ')} participantes`);
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}

export default {
    allDefinitions,
    definitionsByCategory,
    getDefinitionById,
    getRequiredModules,
    getOptionalModules,
    getModulesByStatus,
    validateLigaConfig,

    // Exports individuais
    rankingGeral,
    rankingRodada,
    pontosCorridos,
    mataMata,
    ligasMensais,
    turnoReturno,
    top10,
    capitaoLuxo,
    luvaOuro,
    artilheiro,
    ligaPatrimonio,
    tiroCerto,
    restaUm,
};

console.log('[DEFINITIONS] ✅ Camada de Definição carregada - 13 módulos disponíveis');
