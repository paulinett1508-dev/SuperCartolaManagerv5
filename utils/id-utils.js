/**
 * ID UTILS - Utilitários para Cast Correto de IDs
 *
 * PROBLEMA: O sistema tem tipos inconsistentes para IDs:
 * - ExtratoFinanceiroCache.time_id = Number
 * - FluxoFinanceiroCampos.timeId = String
 * - AcertoFinanceiro.timeId = String
 *
 * Este módulo centraliza o cast correto para cada collection.
 *
 * @version 1.0.0
 */

/**
 * Configuração de tipos por collection
 * Mantém sincronizado com os schemas do MongoDB
 */
const COLLECTION_ID_TYPES = {
    // Collection: { campo: tipo }
    ExtratoFinanceiroCache: {
        liga_id: 'ObjectId',   // Referência para Liga
        time_id: 'Number',     // ID numérico do time no Cartola
        temporada: 'Number',
    },
    FluxoFinanceiroCampos: {
        ligaId: 'String',
        timeId: 'String',
    },
    AcertoFinanceiro: {
        ligaId: 'String',
        timeId: 'String',
        temporada: 'Number',
    },
    RodadaCache: {
        liga_id: 'ObjectId',
        time_id: 'Number',
        rodada: 'Number',
        temporada: 'Number',
    },
};

/**
 * Converte ID para o tipo correto da collection
 * @param {string|number} id - ID a ser convertido
 * @param {string} collection - Nome da collection
 * @param {string} campo - Nome do campo (ex: 'time_id', 'timeId')
 * @returns {string|number} ID no tipo correto
 */
export function castId(id, collection, campo) {
    const config = COLLECTION_ID_TYPES[collection];
    if (!config || !config[campo]) {
        console.warn(`[ID-UTILS] Collection/campo não configurado: ${collection}.${campo}`);
        return id;
    }

    const tipo = config[campo];

    switch (tipo) {
        case 'Number':
            return Number(id);
        case 'String':
            return String(id);
        case 'ObjectId':
            // ObjectId é tratado separadamente pelo Mongoose
            return id;
        default:
            return id;
    }
}

/**
 * Cast específico para time_id no ExtratoFinanceiroCache (Number)
 * @param {string|number} timeId
 * @returns {number}
 */
export function toExtratoTimeId(timeId) {
    return Number(timeId);
}

/**
 * Cast específico para timeId em FluxoFinanceiroCampos (String)
 * @param {string|number} timeId
 * @returns {string}
 */
export function toCamposTimeId(timeId) {
    return String(timeId);
}

/**
 * Cast específico para timeId em AcertoFinanceiro (String)
 * @param {string|number} timeId
 * @returns {string}
 */
export function toAcertoTimeId(timeId) {
    return String(timeId);
}

/**
 * Cast para ligaId (sempre String nas collections que não usam ObjectId)
 * @param {string} ligaId
 * @returns {string}
 */
export function toLigaIdString(ligaId) {
    return String(ligaId);
}

/**
 * Cast para temporada (sempre Number)
 * @param {string|number} temporada
 * @returns {number}
 */
export function toTemporada(temporada) {
    return Number(temporada);
}

/**
 * Prepara query para ExtratoFinanceiroCache com tipos corretos
 * @param {string} ligaId
 * @param {string|number} timeId
 * @param {number} temporada
 * @returns {object} Query com tipos corretos
 */
export function buildExtratoQuery(ligaId, timeId, temporada) {
    return {
        liga_id: String(ligaId),  // Será convertido para ObjectId pelo Mongoose se necessário
        time_id: Number(timeId),
        temporada: Number(temporada),
    };
}

/**
 * Prepara query para FluxoFinanceiroCampos com tipos corretos
 * @param {string} ligaId
 * @param {string|number} timeId
 * @returns {object} Query com tipos corretos
 */
export function buildCamposQuery(ligaId, timeId) {
    return {
        ligaId: String(ligaId),
        timeId: String(timeId),
    };
}

/**
 * Prepara query para AcertoFinanceiro com tipos corretos
 * @param {string} ligaId
 * @param {string|number} timeId
 * @param {number} temporada
 * @returns {object} Query com tipos corretos
 */
export function buildAcertoQuery(ligaId, timeId, temporada) {
    return {
        ligaId: String(ligaId),
        timeId: String(timeId),
        temporada: Number(temporada),
    };
}

export default {
    castId,
    toExtratoTimeId,
    toCamposTimeId,
    toAcertoTimeId,
    toLigaIdString,
    toTemporada,
    buildExtratoQuery,
    buildCamposQuery,
    buildAcertoQuery,
    COLLECTION_ID_TYPES,
};
