/**
 * SALDO CALCULATOR - Cálculo Centralizado de Saldos Financeiros
 *
 * Este módulo centraliza a lógica de cálculo de saldo para garantir
 * consistência entre todos os módulos do sistema.
 *
 * FONTE ÚNICA DE VERDADE para cálculo de saldo.
 * Tesouraria, extrato-cache, acertos-financeiros e inscrições
 * TODOS devem usar estas funções.
 *
 * @version 2.0.0
 */

import mongoose from "mongoose";
import ExtratoFinanceiroCache from "../models/ExtratoFinanceiroCache.js";
import FluxoFinanceiroCampos from "../models/FluxoFinanceiroCampos.js";
import AcertoFinanceiro from "../models/AcertoFinanceiro.js";
import AjusteFinanceiro from "../models/AjusteFinanceiro.js";
import InscricaoTemporada from "../models/InscricaoTemporada.js";
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

        // ✅ v2.0.0 FIX: Buscar campos manuais COM filtro de temporada
        const camposDoc = await FluxoFinanceiroCampos.findOne({
            ligaId: String(ligaId),
            timeId: String(timeId),
            temporada: Number(temporada),
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
                ajustes: 0, // ✅ v2.0.0: Novo campo para ajustes dinâmicos
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

        // ✅ v2.0.0 FIX: Adicionar campos manuais COM filtro de temporada
        const camposDoc = await FluxoFinanceiroCampos.findOne({
            ligaId: String(ligaId),
            timeId: String(timeId),
            temporada: Number(temporada),
        }).lean();

        if (camposDoc?.campos) {
            const saldoCampos = camposDoc.campos.reduce((acc, c) => acc + (c.valor || 0), 0);
            saldoConsolidado += saldoCampos;
        }
    }

    // =========================================================================
    // ✅ v2.0.0: INTEGRAR AjusteFinanceiro (sistema dinâmico 2026+)
    // AjusteFinanceiro substituiu os 4 campos fixos de FluxoFinanceiroCampos
    // mas precisa ser contabilizado no saldo final.
    // =========================================================================
    const ajustesInfo = await AjusteFinanceiro.calcularTotal(
        String(ligaId),
        Number(timeId),
        Number(temporada)
    );
    const saldoAjustes = ajustesInfo.total || 0;
    saldoConsolidado += saldoAjustes;

    if (breakdown) {
        breakdown.ajustes = saldoAjustes;
    }

    // =========================================================================
    // ✅ v2.0.0: INTEGRAR InscricaoTemporada (inscrição não paga + saldo anterior)
    // Para temporada >= 2026, se a inscrição não foi paga E não está já no
    // historico_transacoes, deduzir a taxa e somar saldo transferido.
    // =========================================================================
    let taxaInscricaoValor = 0;
    let pagouInscricao = true;
    let saldoAnteriorTransferido = 0;
    let dividaAnterior = 0;

    const tempNum = Number(temporada);
    if (tempNum >= 2026) {
        const inscricaoJaNoCache = cache?.historico_transacoes?.some(
            t => t.tipo === 'INSCRICAO_TEMPORADA'
        );

        if (!inscricaoJaNoCache) {
            // Buscar inscrição — InscricaoTemporada usa ObjectId para liga_id
            let inscricao = null;
            try {
                inscricao = await InscricaoTemporada.findOne({
                    liga_id: new mongoose.Types.ObjectId(ligaId),
                    time_id: Number(timeId),
                    temporada: tempNum
                }).lean();
            } catch {
                // Fallback: busca com String (caso liga_id seja String no DB)
                inscricao = await InscricaoTemporada.findOne({
                    liga_id: String(ligaId),
                    time_id: Number(timeId),
                    temporada: tempNum
                }).lean();
            }

            if (inscricao) {
                pagouInscricao = inscricao.pagou_inscricao !== false;
                taxaInscricaoValor = inscricao.taxa_inscricao || 0;
                saldoAnteriorTransferido = inscricao.saldo_transferido || 0;
                dividaAnterior = inscricao.divida_anterior || 0;

                if (!pagouInscricao) {
                    // Saldo inicial = saldo anterior - taxa - dívida anterior
                    saldoConsolidado -= taxaInscricaoValor;
                }

                // Saldo transferido (pode ser positivo=crédito ou negativo=dívida)
                if (saldoAnteriorTransferido !== 0) {
                    saldoConsolidado += saldoAnteriorTransferido;
                }

                // Dívida anterior (sempre positivo no schema, mas é débito)
                if (dividaAnterior > 0) {
                    saldoConsolidado -= dividaAnterior;
                }
            }
        } else {
            // ✅ v2.1.0 FIX: Inscrição no cache — aplicar valores ao saldo E extrair metadata
            // Antes: só extraía metadata sem aplicar ao saldo (bug)
            const tInscricao = cache.historico_transacoes.find(t => t.tipo === 'INSCRICAO_TEMPORADA');
            const tSaldo = cache.historico_transacoes.find(t => t.tipo === 'SALDO_TEMPORADA_ANTERIOR');

            if (tInscricao) {
                taxaInscricaoValor = Math.abs(tInscricao.valor || 0);
                pagouInscricao = false; // Se está no cache, é porque não pagou
                saldoConsolidado += tInscricao.valor; // Aplicar débito (-180)
            }
            if (tSaldo) {
                saldoAnteriorTransferido = tSaldo.valor || 0;
                saldoConsolidado += tSaldo.valor; // Aplicar saldo transferido
            }

            // divida_anterior não fica no cache — buscar do inscricoestemporada
            try {
                const inscricaoDoc = await InscricaoTemporada.findOne({
                    liga_id: new mongoose.Types.ObjectId(ligaId),
                    time_id: Number(timeId),
                    temporada: tempNum
                }).lean();
                if (inscricaoDoc && inscricaoDoc.divida_anterior > 0) {
                    dividaAnterior = inscricaoDoc.divida_anterior;
                    saldoConsolidado -= dividaAnterior;
                }
            } catch {
                // Fallback silencioso — divida_anterior = 0
            }
        }
    }

    if (breakdown) {
        breakdown.taxaInscricao = taxaInscricaoValor;
        breakdown.saldoAnteriorTransferido = saldoAnteriorTransferido;
        breakdown.dividaAnterior = dividaAnterior;
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
        saldoAjustes: parseFloat(saldoAjustes.toFixed(2)),
        totalPago: acertosInfo.totalPago,
        totalRecebido: acertosInfo.totalRecebido,
        saldoFinal: parseFloat(saldoFinal.toFixed(2)),
        quantidadeAcertos: acertosInfo.quantidadeAcertos,
        quantidadeAjustes: ajustesInfo.quantidade,
        // ✅ v2.0.0: Dados de inscrição para transparência
        taxaInscricao: parseFloat(taxaInscricaoValor.toFixed(2)),
        pagouInscricao,
        saldoAnteriorTransferido: parseFloat(saldoAnteriorTransferido.toFixed(2)),
        dividaAnterior: parseFloat(dividaAnterior.toFixed(2)),
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
            ajustes: parseFloat(breakdown.ajustes.toFixed(2)),
            taxaInscricao: parseFloat(breakdown.taxaInscricao.toFixed(2)),
            saldoAnteriorTransferido: parseFloat(breakdown.saldoAnteriorTransferido.toFixed(2)),
            dividaAnterior: parseFloat(breakdown.dividaAnterior.toFixed(2)),
        };
    }

    return resultado;
}

/**
 * Aplica ajuste de inscrição em dados pré-carregados (para paths bulk sem N+1)
 *
 * @param {number} saldoConsolidado - Saldo já calculado
 * @param {object|null} inscricaoData - Documento InscricaoTemporada (ou null)
 * @param {Array} historicoTransacoes - Array de transações do cache
 * @returns {object} { saldoAjustado, taxaInscricao, pagouInscricao, saldoAnteriorTransferido, dividaAnterior }
 */
export function aplicarAjusteInscricaoBulk(saldoConsolidado, inscricaoData, historicoTransacoes = []) {
    let saldo = saldoConsolidado;
    let taxaInscricao = 0;
    let pagouInscricao = true;
    let saldoAnteriorTransferido = 0;
    let dividaAnterior = 0;

    if (!inscricaoData) {
        return { saldoAjustado: saldo, taxaInscricao, pagouInscricao, saldoAnteriorTransferido, dividaAnterior };
    }

    const inscricaoJaNoCache = historicoTransacoes.some(
        t => t.tipo === 'INSCRICAO_TEMPORADA'
    );

    if (!inscricaoJaNoCache) {
        pagouInscricao = inscricaoData.pagou_inscricao !== false;
        taxaInscricao = inscricaoData.taxa_inscricao || 0;
        saldoAnteriorTransferido = inscricaoData.saldo_transferido || 0;
        dividaAnterior = inscricaoData.divida_anterior || 0;

        if (!pagouInscricao) {
            saldo -= taxaInscricao;
        }
        if (saldoAnteriorTransferido !== 0) {
            saldo += saldoAnteriorTransferido;
        }
        if (dividaAnterior > 0) {
            saldo -= dividaAnterior;
        }
    } else {
        // ✅ v2.1.0 FIX: Inscrição no cache — aplicar valores ao saldo E extrair metadata
        const tInscricao = historicoTransacoes.find(t => t.tipo === 'INSCRICAO_TEMPORADA');
        const tSaldo = historicoTransacoes.find(t => t.tipo === 'SALDO_TEMPORADA_ANTERIOR');

        if (tInscricao) {
            taxaInscricao = Math.abs(tInscricao.valor || 0);
            pagouInscricao = false;
            saldo += tInscricao.valor; // Aplicar débito (-180)
        }
        if (tSaldo) {
            saldoAnteriorTransferido = tSaldo.valor || 0;
            saldo += tSaldo.valor;
        }
        // divida_anterior do inscricaoData (já carregado no path bulk)
        if (inscricaoData.divida_anterior > 0) {
            dividaAnterior = inscricaoData.divida_anterior;
            saldo -= dividaAnterior;
        }
    }

    return {
        saldoAjustado: parseFloat(saldo.toFixed(2)),
        taxaInscricao,
        pagouInscricao,
        saldoAnteriorTransferido,
        dividaAnterior,
    };
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
    aplicarAjusteInscricaoBulk,
    classificarSituacao,
};
