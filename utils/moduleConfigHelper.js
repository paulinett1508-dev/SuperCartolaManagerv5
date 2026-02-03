/**
 * Module Config Helper
 *
 * Utilitário para buscar configurações dinâmicas de módulos.
 * Mescla defaults dos arquivos JSON em config/rules/ com overrides do ModuleConfig (MongoDB).
 *
 * @version 1.0.0
 * @since 2026-02-03
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import ModuleConfig from '../models/ModuleConfig.js';
import { CURRENT_SEASON } from '../config/seasons.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Cache em memória para arquivos JSON (evita leitura repetida)
 */
const jsonCache = new Map();

/**
 * Carrega arquivo JSON de rules de um módulo
 * @param {string} moduloId - ID do módulo (ex: 'pontos_corridos')
 * @returns {Promise<Object|null>} Objeto com as rules ou null
 */
async function carregarRulesJSON(moduloId) {
    // Verifica cache
    if (jsonCache.has(moduloId)) {
        return jsonCache.get(moduloId);
    }

    try {
        const jsonPath = path.join(__dirname, '..', 'config', 'rules', `${moduloId}.json`);
        const content = await fs.readFile(jsonPath, 'utf-8');
        const rules = JSON.parse(content);

        // Armazena no cache
        jsonCache.set(moduloId, rules);

        return rules;
    } catch (error) {
        console.error(`[MODULE-CONFIG] ❌ Erro ao carregar ${moduloId}.json:`, error.message);
        return null;
    }
}

/**
 * Mescla configurações: defaults JSON + overrides ModuleConfig
 * @param {Object} rulesJSON - Rules do arquivo JSON
 * @param {Object|null} moduleConfig - Config do MongoDB (pode ser null)
 * @returns {Object} Configuração mesclada
 */
function mesclarConfiguracoes(rulesJSON, moduleConfig) {
    if (!rulesJSON) {
        throw new Error('rulesJSON não pode ser null');
    }

    // Se não tem override, retorna JSON puro
    if (!moduleConfig) {
        return {
            ...rulesJSON,
            source: 'defaults',
            ativo: rulesJSON.configuracao?.modulo_ativo ?? true
        };
    }

    // Criar cópia profunda do JSON
    const config = JSON.parse(JSON.stringify(rulesJSON));

    // Aplicar overrides de regras customizadas
    if (moduleConfig.regras_override) {
        const override = moduleConfig.regras_override;

        // Rodada inicial
        if (override.rodada_inicial !== undefined) {
            if (!config.configuracao) config.configuracao = {};
            if (!config.configuracao.defaults) config.configuracao.defaults = {};
            config.configuracao.defaults.rodada_inicial = override.rodada_inicial;
        }

        // Turnos
        if (override.turnos !== undefined) {
            if (!config.configuracao) config.configuracao = {};
            if (!config.configuracao.defaults) config.configuracao.defaults = {};
            config.configuracao.defaults.turnos = override.turnos;
        }

        // Tolerância de empate
        if (override.tolerancia_empate !== undefined) {
            if (!config.regras) config.regras = {};
            if (!config.regras.resultado) config.regras.resultado = {};
            config.regras.resultado.tolerancia_empate = override.tolerancia_empate;
        }

        // Limite de goleada
        if (override.limite_goleada !== undefined) {
            if (!config.regras) config.regras = {};
            if (!config.regras.resultado) config.regras.resultado = {};
            config.regras.resultado.limite_goleada = override.limite_goleada;
        }

        // Bônus de goleada (financeiro)
        if (override.bonus_goleada !== undefined) {
            if (!config.regras) config.regras = {};
            if (!config.regras.pontuacao_tabela) config.regras.pontuacao_tabela = {};
            if (!config.regras.pontuacao_tabela.goleada) config.regras.pontuacao_tabela.goleada = {};
            config.regras.pontuacao_tabela.goleada.bonus_financeiro = override.bonus_goleada;
        }

        // Bônus de goleada (pontos)
        if (override.bonus_pontos_goleada !== undefined) {
            if (!config.regras) config.regras = {};
            if (!config.regras.pontuacao_tabela) config.regras.pontuacao_tabela = {};
            if (!config.regras.pontuacao_tabela.goleada) config.regras.pontuacao_tabela.goleada = {};
            config.regras.pontuacao_tabela.goleada.bonus_pontos = override.bonus_pontos_goleada;
        }

        // Outros overrides genéricos
        Object.keys(override).forEach(key => {
            if (!['rodada_inicial', 'turnos', 'tolerancia_empate', 'limite_goleada',
                  'bonus_goleada', 'bonus_pontos_goleada'].includes(key)) {
                if (!config.regras_override_custom) config.regras_override_custom = {};
                config.regras_override_custom[key] = override[key];
            }
        });
    }

    // Aplicar overrides financeiros
    if (moduleConfig.financeiro_override?.valores_simples) {
        const vs = moduleConfig.financeiro_override.valores_simples;

        if (!config.regras) config.regras = {};
        if (!config.regras.pontuacao_tabela) config.regras.pontuacao_tabela = {};

        if (vs.vitoria !== null && vs.vitoria !== undefined) {
            if (!config.regras.pontuacao_tabela.vitoria) config.regras.pontuacao_tabela.vitoria = {};
            config.regras.pontuacao_tabela.vitoria.financeiro = vs.vitoria;
        }

        if (vs.empate !== null && vs.empate !== undefined) {
            if (!config.regras.pontuacao_tabela.empate) config.regras.pontuacao_tabela.empate = {};
            config.regras.pontuacao_tabela.empate.financeiro = vs.empate;
        }

        if (vs.derrota !== null && vs.derrota !== undefined) {
            if (!config.regras.pontuacao_tabela.derrota) config.regras.pontuacao_tabela.derrota = {};
            config.regras.pontuacao_tabela.derrota.financeiro = vs.derrota;
        }
    }

    // Marcar como configurado com overrides
    config.source = 'overrides';
    config.ativo = moduleConfig.ativo ?? true;
    config.configurado_em = moduleConfig.atualizado_em || moduleConfig.criado_em;

    return config;
}

/**
 * Busca configuração efetiva de um módulo para uma liga
 * @param {string} ligaId - ID da liga
 * @param {string} moduloId - ID do módulo (ex: 'pontos_corridos')
 * @param {number} temporada - Temporada (opcional, usa CURRENT_SEASON)
 * @returns {Promise<Object>} Configuração mesclada
 */
export async function buscarConfigModulo(ligaId, moduloId, temporada = CURRENT_SEASON) {
    try {
        console.log(`[MODULE-CONFIG] 🔍 Buscando config: ${moduloId} | Liga: ${ligaId} | Temporada: ${temporada}`);

        // 1. Carregar rules padrão do JSON
        const rulesJSON = await carregarRulesJSON(moduloId);
        if (!rulesJSON) {
            throw new Error(`Arquivo config/rules/${moduloId}.json não encontrado`);
        }

        // 2. Buscar overrides do ModuleConfig (MongoDB)
        let moduleConfig = null;
        try {
            moduleConfig = await ModuleConfig.buscarConfig(ligaId, moduloId, temporada);
        } catch (error) {
            console.warn(`[MODULE-CONFIG] ⚠️ Erro ao buscar ModuleConfig:`, error.message);
        }

        // 3. Mesclar configurações
        const configFinal = mesclarConfiguracoes(rulesJSON, moduleConfig);

        console.log(`[MODULE-CONFIG] ✅ Config carregada: ${moduloId} (source: ${configFinal.source})`);
        return configFinal;

    } catch (error) {
        console.error(`[MODULE-CONFIG] ❌ Erro ao buscar config:`, error);
        throw error;
    }
}

/**
 * Busca configuração simplificada para frontend
 * Retorna apenas os campos necessários para operação
 * @param {string} ligaId - ID da liga
 * @param {string} moduloId - ID do módulo
 * @param {number} temporada - Temporada (opcional)
 * @returns {Promise<Object>} Config simplificada
 */
export async function buscarConfigSimplificada(ligaId, moduloId, temporada = CURRENT_SEASON) {
    const config = await buscarConfigModulo(ligaId, moduloId, temporada);

    // Extrair apenas campos essenciais
    const rodadaInicial = config.configuracao?.defaults?.rodada_inicial ||
                          config.configuracao?.rodada_inicial || 7;
    const turnos = config.configuracao?.defaults?.turnos || 1;
    const toleranciaEmpate = config.regras?.resultado?.tolerancia_empate || 0.3;
    const limiteGoleada = config.regras?.resultado?.limite_goleada || 50.0;

    const pontuacao = config.regras?.pontuacao_tabela || {};

    return {
        modulo: moduloId,
        ativo: config.ativo,
        source: config.source,
        rodadaInicial,
        turnos,
        criterios: {
            empateTolerancia: toleranciaEmpate,
            goleadaMinima: limiteGoleada
        },
        financeiro: {
            vitoria: pontuacao.vitoria?.financeiro || 5.0,
            empate: pontuacao.empate?.financeiro || 3.0,
            derrota: pontuacao.derrota?.financeiro || -5.0,
            goleada: pontuacao.vitoria?.financeiro + (pontuacao.goleada?.bonus_financeiro || 2.0)
        },
        pontuacao_tabela: {
            vitoria: pontuacao.vitoria?.pontos || 3,
            empate: pontuacao.empate?.pontos || 1,
            derrota: pontuacao.derrota?.pontos || 0,
            bonus_goleada: pontuacao.goleada?.bonus_pontos || 1
        },
        temporada: temporada
    };
}

/**
 * Invalida cache de um módulo específico
 * @param {string} moduloId - ID do módulo
 */
export function invalidarCacheModulo(moduloId) {
    if (moduloId) {
        jsonCache.delete(moduloId);
        console.log(`[MODULE-CONFIG] 🗑️ Cache invalidado: ${moduloId}`);
    } else {
        jsonCache.clear();
        console.log('[MODULE-CONFIG] 🗑️ Todo cache invalidado');
    }
}

/**
 * Valida se uma configuração é válida
 * @param {Object} config - Configuração a validar
 * @param {string} moduloId - ID do módulo
 * @returns {Object} { valido: boolean, erros: string[] }
 */
export function validarConfig(config, moduloId) {
    const erros = [];

    if (!config) {
        erros.push('Configuração não pode ser null');
        return { valido: false, erros };
    }

    // Validações específicas do Pontos Corridos
    if (moduloId === 'pontos_corridos') {
        const rodadaInicial = config.configuracao?.defaults?.rodada_inicial;
        if (!rodadaInicial || rodadaInicial < 1 || rodadaInicial > 38) {
            erros.push('rodada_inicial deve estar entre 1 e 38');
        }

        const tolerancia = config.regras?.resultado?.tolerancia_empate;
        if (tolerancia !== undefined && (tolerancia < 0 || tolerancia > 10)) {
            erros.push('tolerancia_empate deve estar entre 0 e 10');
        }

        const limiteGoleada = config.regras?.resultado?.limite_goleada;
        if (limiteGoleada !== undefined && (limiteGoleada < 10 || limiteGoleada > 200)) {
            erros.push('limite_goleada deve estar entre 10 e 200');
        }
    }

    return {
        valido: erros.length === 0,
        erros
    };
}

console.log('[MODULE-CONFIG-HELPER] ✅ Helper carregado');
