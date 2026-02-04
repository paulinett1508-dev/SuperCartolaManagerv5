/**
 * TYPE HELPERS - Conversão padronizada de tipos para queries MongoDB
 *
 * Resolve inconsistência de tipos entre models:
 * - ExtratoFinanceiroCache: liga_id=Mixed, time_id=Number
 * - AcertoFinanceiro: ligaId=String, timeId=String
 * - AjusteFinanceiro: liga_id=ObjectId, time_id=Number
 * - FluxoFinanceiroCampos: ligaId=String, timeId=String
 * - InscricaoTemporada: liga_id=ObjectId, time_id=Number
 *
 * @version 1.0.0
 */

import mongoose from "mongoose";

/**
 * Converte liga_id para String (formato universal)
 * @param {string|ObjectId} id
 * @returns {string}
 */
export const toLigaId = (id) => String(id);

/**
 * Converte time_id para Number
 * @param {string|number} id
 * @returns {number}
 */
export const toTimeId = (id) => Number(id);

/**
 * Converte temporada para Number
 * @param {string|number} t
 * @returns {number}
 */
export const toTemporada = (t) => Number(t);

/**
 * Tenta converter liga_id para ObjectId, com fallback para String
 * Útil para models que usam ObjectId (AjusteFinanceiro, InscricaoTemporada)
 *
 * @param {string|ObjectId} id
 * @returns {ObjectId|string}
 */
export function toLigaObjectId(id) {
    try {
        return new mongoose.Types.ObjectId(id);
    } catch {
        return String(id);
    }
}

/**
 * Cria query $or para liga_id que funciona com String E ObjectId
 * Resolve o problema de dados mistos no MongoDB
 *
 * @param {string} ligaId
 * @returns {object} Query MongoDB para liga_id
 */
export function ligaIdQuery(ligaId) {
    try {
        const oid = new mongoose.Types.ObjectId(ligaId);
        return { $or: [{ liga_id: oid }, { liga_id: String(ligaId) }] };
    } catch {
        return { liga_id: String(ligaId) };
    }
}

export default {
    toLigaId,
    toTimeId,
    toTemporada,
    toLigaObjectId,
    ligaIdQuery,
};
