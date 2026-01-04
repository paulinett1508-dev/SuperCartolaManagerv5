/**
 * SALDO CALCULATOR - Cálculo Centralizado de Saldos Financeiros
 *
 * Este módulo centraliza a lógica de cálculo de saldo para garantir
 * consistência entre todos os módulos do sistema.
 *
 * PROBLEMA RESOLVIDO:
 * - tesouraria-routes.js usava calcularSaldoCompleto() com recálculo
 * - acertos-financeiros-routes.js usava saldo_consolidado direto (desatualizado)
 *
 * Agora ambos usam esta função unificada.
 *
 * @version 1.0.0
 */

import ExtratoFinanceiroCache from "../models/ExtratoFinanceiroCache.js";
import FluxoFinanceiroCampos from "../models/FluxoFinanceiroCampos.js";
import AcertoFinanceiro from "../models/AcertoFinanceiro.js";
import { CURRENT_SEASON } from "../config/seasons.js";
import {
    calcularResumoDeRodadas,
    transformarTransacoesEmRodadas,
} from "../controllers/extratoFinanceiroCacheController.js";

/**
 * Calcula o saldo completo de um participante
 *
 * @param {string} ligaId - ID da liga
 * @param {string|number} timeId - ID do time
 * @param {number} temporada - Temporada (default: CURRENT_SEASON)
 * @param {object} options - Opções de cálculo
 * @param {boolean} options.recalcular - Se true, recalcula a partir das transações (mais preciso)
 * @param {boolean} options.incluirBreakdown - Se true, inclui breakdown por módulo
 * @returns {Promise<object>} Objeto com todos os saldos calculados
 */
export async function calcularSaldoParticipante(ligaId, timeId, temporada = CURRENT_SEASON, options = {}) {
    const { recalcular = true, incluirBreakdown = false } = options;

    // 1. Buscar cache do extrato
    const cache = await ExtratoFinanceiroCache.findOne({
        liga_id: String(ligaId),
        time_id: Number(timeId),
        temporada: Number(temporada),
    }).lean();

    let saldoConsolidado = 0;
    let breakdown = null;

    if (recalcular && cache?.historico_transacoes) {
        // ✅ RECALCULAR usando as transações (mais preciso)
        const rodadasProcessadas = transformarTransacoesEmRodadas(
            cache.historico_transacoes,
            ligaId
        );

        // Buscar campos manuais
        const camposDoc = await FluxoFinanceiroCampos.findOne({
            ligaId: String(ligaId),
            timeId: String(timeId),
        }).lean();
        const camposAtivos = camposDoc?.campos?.filter(c => c.valor !== 0) || [];

        // Calcular resumo completo
        const resumoCalculado = calcularResumoDeRodadas(rodadasProcessadas, camposAtivos);
        saldoConsolidado = resumoCalculado.saldo;

        if (incluirBreakdown) {
            breakdown = {
                banco: (resumoCalculado.bonus || 0) + (resumoCalculado.onus || 0),
                pontosCorridos: resumoCalculado.pontosCorridos || 0,
                mataMata: resumoCalculado.mataMata || 0,
                top10: resumoCalculado.top10 || 0,
                melhorMes: 0,
                artilheiro: 0,
                luvaOuro: 0,
                campos: resumoCalculado.camposManuais || 0,
            };

            // Calcular campos especiais do histórico legado
            (cache.historico_transacoes || []).forEach(t => {
                if (t.tipo === 'MELHOR_MES') breakdown.melhorMes += t.valor || 0;
                else if (t.tipo === 'ARTILHEIRO') breakdown.artilheiro += t.valor || 0;
                else if (t.tipo === 'LUVA_OURO') breakdown.luvaOuro += t.valor || 0;
            });
        }
    } else {
        // Usar saldo consolidado do cache (fallback)
        saldoConsolidado = cache?.saldo_consolidado || 0;

        // Adicionar campos manuais separadamente (para manter compatibilidade)
        const camposDoc = await FluxoFinanceiroCampos.findOne({
            ligaId: String(ligaId),
            timeId: String(timeId),
        }).lean();

        if (camposDoc?.campos) {
            const saldoCampos = camposDoc.campos.reduce((acc, c) => acc + (c.valor || 0), 0);
            saldoConsolidado += saldoCampos;
        }
    }

    // 2. Calcular saldo de acertos
    const acertosInfo = await AcertoFinanceiro.calcularSaldoAcertos(
        String(ligaId),
        String(timeId),
        Number(temporada)
    );

    // 3. Saldo final
    const saldoFinal = saldoConsolidado + acertosInfo.saldoAcertos;

    const resultado = {
        saldoTemporada: parseFloat(saldoConsolidado.toFixed(2)),
        saldoAcertos: acertosInfo.saldoAcertos,
        totalPago: acertosInfo.totalPago,
        totalRecebido: acertosInfo.totalRecebido,
        saldoFinal: parseFloat(saldoFinal.toFixed(2)),
        quantidadeAcertos: acertosInfo.quantidadeAcertos,
    };

    if (breakdown) {
        resultado.breakdown = {
            banco: parseFloat(breakdown.banco.toFixed(2)),
            pontosCorridos: parseFloat(breakdown.pontosCorridos.toFixed(2)),
            mataMata: parseFloat(breakdown.mataMata.toFixed(2)),
            top10: parseFloat(breakdown.top10.toFixed(2)),
            melhorMes: parseFloat(breakdown.melhorMes.toFixed(2)),
            artilheiro: parseFloat(breakdown.artilheiro.toFixed(2)),
            luvaOuro: parseFloat(breakdown.luvaOuro.toFixed(2)),
            campos: parseFloat(breakdown.campos.toFixed(2)),
        };
    }

    return resultado;
}

/**
 * Alias para compatibilidade com código existente
 * @deprecated Use calcularSaldoParticipante() diretamente
 */
export const calcularSaldoCompleto = calcularSaldoParticipante;
export const calcularSaldoTotalParticipante = calcularSaldoParticipante;

/**
 * Calcula saldo rápido (sem recálculo, usa cache direto)
 * Útil para listagens onde performance é crítica
 *
 * @param {string} ligaId
 * @param {string|number} timeId
 * @param {number} temporada
 * @returns {Promise<object>}
 */
export async function calcularSaldoRapido(ligaId, timeId, temporada = CURRENT_SEASON) {
    return calcularSaldoParticipante(ligaId, timeId, temporada, { recalcular: false });
}

/**
 * Classifica a situação financeira baseado no saldo
 *
 * @param {number} saldoFinal
 * @returns {string} 'devedor' | 'credor' | 'quitado'
 */
export function classificarSituacao(saldoFinal) {
    if (saldoFinal < -0.01) return 'devedor';
    if (saldoFinal > 0.01) return 'credor';
    return 'quitado';
}

export default {
    calcularSaldoParticipante,
    calcularSaldoCompleto,
    calcularSaldoTotalParticipante,
    calcularSaldoRapido,
    classificarSituacao,
};
